import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  investorProcedure,
} from "@/server/api/trpc";
import { createCheckoutSession } from "@/lib/stripe";
import { createDepayConfig } from "@/lib/depay";
import { findAvailableUnit } from "@/lib/allocation";
import { eq, and, isNull, or, inArray } from "drizzle-orm";
import {
  ownerships,
  bookingRevenueCache,
  bookingRevenueCacheMeta,
  users,
  quarterlyUnitSettlements,
  quarterlyOwnerPayouts,
} from "@/server/db/schema";
import { siteConfig } from "@/site.config";

export const purchaseRouter = createTRPCRouter({
  /**
   * Initiate purchase - Collection-based purchasing
   * Supports both authenticated and guest purchases
   * Guest users: provide email, account created after payment
   * Authenticated users: use session email automatically
   *
   * Flow:
   * 1. User picks collection (e.g., "Glamphouse")
   * 2. User picks tier (e.g., "25%")
   * 3. System validates collection has availability for that tier
   * 4. System creates payment session (Stripe/Depay) with email in metadata
   * 5. After payment succeeds (webhook), system creates user (if guest) and assigns unit
   */
  initiate: publicProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        pricingTierId: z.number().int().positive(),
        paymentMethod: z.enum(["CRYPTO", "FIAT"]),
        email: z.string().email().optional(),
        affiliateCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Determine email to use: session email or provided guest email
      const email = ctx.session?.user?.email ?? input.email;

      if (!email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email is required to complete purchase",
        });
      }
      // 1. Validate collection exists
      const collection = await ctx.db.query.propertyCollections.findFirst({
        where: (collections, { eq }) => eq(collections.id, input.collectionId),
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property collection not found",
        });
      }

      if (!collection.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This collection is not currently available",
        });
      }

      // 2. Validate pricing tier exists and belongs to this collection
      const pricingTier = await ctx.db.query.pricingTiers.findFirst({
        where: (tiers, { eq, and }) =>
          and(
            eq(tiers.id, input.pricingTierId),
            eq(tiers.collectionId, input.collectionId),
          ),
      });

      if (!pricingTier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing tier not found for this collection",
        });
      }

      if (!pricingTier.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This pricing tier is no longer active",
        });
      }

      // 3. Check if ANY unit in the collection can accommodate this purchase
      const availableUnitId = await findAvailableUnit(
        input.collectionId,
        pricingTier.percentage,
      );

      if (!availableUnitId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This tier (${pricingTier.displayLabel}) is sold out for ${collection.name}. Please select a smaller percentage.`,
        });
      }

      // 4. Validate affiliate code if provided
      if (input.affiliateCode) {
        const code = input.affiliateCode;
        const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
          where: (links, { eq, and }) =>
            and(eq(links.code, code), eq(links.status, "ACTIVE")),
        });

        if (!affiliateLink) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid affiliate code",
          });
        }
      }

      // 5. Create payment session based on method
      // Note: We store collectionId (not unitId) - unit assignment happens in webhook after payment
      if (input.paymentMethod === "FIAT") {
        // Create Stripe checkout session
        const session = await createCheckoutSession({
          collectionId: input.collectionId,
          collectionName: collection.name,
          pricingTierId: input.pricingTierId,
          fiatPrice: pricingTier.fiatPrice,
          displayLabel: pricingTier.displayLabel,
          email,
          userId: ctx.session?.user?.id,
          affiliateCode: input.affiliateCode,
        });

        return {
          checkoutUrl: session.url,
          depayConfig: null,
        };
      } else {
        // Create Depay config for crypto payment
        const depayConfig = createDepayConfig({
          collectionId: input.collectionId,
          pricingTierId: input.pricingTierId,
          cryptoPrice: pricingTier.cryptoPrice,
          displayLabel: pricingTier.displayLabel,
          email,
          userId: ctx.session?.user?.id,
          affiliateCode: input.affiliateCode,
        });

        return {
          checkoutUrl: null,
          depayConfig,
        };
      }
    }),

  /**
   * Get my ownerships
   * Returns all ownership records for the current user
   */
  getMyOwnerships: investorProcedure.query(async ({ ctx }) => {
    const myOwnerships = await ctx.db.query.ownerships.findMany({
      where: (ownerships, { eq }) => eq(ownerships.userId, ctx.session.user.id),
      with: {
        unit: true,
        pricingTier: true,
        affiliateLink: {
          columns: {
            id: true,
            code: true,
          },
          with: {
            affiliate: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: (ownerships, { desc }) => [desc(ownerships.createdAt)],
    });

    return myOwnerships;
  }),

  /**
   * Get ownership by transaction hash (DePay crypto payment)
   * Returns the specific ownership record for a given transaction hash
   * PUBLIC: Allows guests to view their purchase confirmation
   * Security: Transaction hash is unique and acts as a secure identifier
   */
  getOwnershipByTxHash: publicProcedure
    .input(z.object({ txHash: z.string() }))
    .query(async ({ ctx, input }) => {
      // Find payment by transaction hash
      const payment = await ctx.db.query.payments.findFirst({
        where: (payments, { eq }) => eq(payments.externalId, input.txHash),
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found for this transaction",
        });
      }

      // Find ownership associated with this payment
      const ownership = await ctx.db.query.ownerships.findFirst({
        where: (ownerships, { eq }) => eq(ownerships.paymentId, payment.id),
        with: {
          unit: true,
          pricingTier: true,
          affiliateLink: {
            columns: {
              id: true,
              code: true,
            },
            with: {
              affiliate: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!ownership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ownership not found for this transaction",
        });
      }

      return ownership;
    }),

  /**
   * Get ownership by Stripe session ID (Stripe fiat payment)
   * Returns the specific ownership record for a given Stripe checkout session
   * PUBLIC: Allows guests to view their purchase confirmation
   * Security: Stripe session ID is unique and acts as a secure identifier
   */
  getOwnershipByStripeSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Find payment by Stripe session ID
      const payment = await ctx.db.query.payments.findFirst({
        where: (payments, { eq }) => eq(payments.externalId, input.sessionId),
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found for this session",
        });
      }

      // Find ownership associated with this payment
      const ownership = await ctx.db.query.ownerships.findFirst({
        where: (ownerships, { eq }) => eq(ownerships.paymentId, payment.id),
        with: {
          unit: true,
          pricingTier: true,
          affiliateLink: {
            columns: {
              id: true,
              code: true,
            },
            with: {
              affiliate: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!ownership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ownership not found for this session",
        });
      }

      return ownership;
    }),

  /**
   * Get ownership summary for current user
   * Returns aggregated stats: total invested, units owned, etc.
   */
  getMySummary: investorProcedure.query(async ({ ctx }) => {
    const myOwnerships = await ctx.db.query.ownerships.findMany({
      where: (ownerships, { eq }) => eq(ownerships.userId, ctx.session.user.id),
    });

    // Calculate stats
    const totalInvested = myOwnerships.reduce(
      (sum, ownership) => sum + Number(ownership.purchasePrice),
      0,
    );

    const uniqueUnitIds = new Set(myOwnerships.map((o) => o.unitId));
    const totalUnitsOwned = uniqueUnitIds.size;

    const totalPercentageOwned = myOwnerships.reduce(
      (sum, ownership) => sum + ownership.percentageOwned,
      0,
    );

    return {
      totalInvested: totalInvested.toFixed(2),
      totalUnitsOwned,
      totalPercentageOwned: (totalPercentageOwned / 100).toFixed(2), // Convert to percentage
      purchaseCount: myOwnerships.length,
    };
  }),

  /**
   * Get co-owners of a specific unit
   * Returns all owners with name, email, and percentage for a given unit
   * Auth: requesting user must own the unit (ADMIN bypasses this check)
   */
  getUnitCoOwners: investorProcedure
    .input(z.object({ unitId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "ADMIN";

      // Verify the requesting user owns this unit (unless ADMIN)
      if (!isAdmin) {
        const myOwnership = await ctx.db.query.ownerships.findFirst({
          where: (o, { eq, and }) =>
            and(eq(o.unitId, input.unitId), eq(o.userId, userId)),
        });

        if (!myOwnership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not own this unit",
          });
        }
      }

      // Fetch all ownerships for this unit (excluding rejected/pending staff entries)
      const unitOwnerships = await ctx.db
        .select({
          userId: ownerships.userId,
          percentageOwned: ownerships.percentageOwned,
          userName: users.name,
          userEmail: users.email,
        })
        .from(ownerships)
        .leftJoin(users, eq(ownerships.userId, users.id))
        .where(
          and(
            eq(ownerships.unitId, input.unitId),
            or(
              isNull(ownerships.approvalStatus),
              eq(ownerships.approvalStatus, "APPROVED"),
            ),
          ),
        );

      // Aggregate percentage per user (user may have multiple purchases for same unit)
      const ownerMap = new Map<
        string,
        { name: string | null; email: string | null; percentageOwned: number }
      >();

      for (const row of unitOwnerships) {
        if (!row.userId) continue;
        const existing = ownerMap.get(row.userId);
        if (existing) {
          existing.percentageOwned += row.percentageOwned;
        } else {
          ownerMap.set(row.userId, {
            name: row.userName,
            email: row.userEmail,
            percentageOwned: row.percentageOwned,
          });
        }
      }

      // Get unit name
      const unit = await ctx.db.query.units.findFirst({
        where: (u, { eq }) => eq(u.id, input.unitId),
        columns: { id: true, name: true },
      });

      const coOwners = Array.from(ownerMap.entries()).map(
        ([ownerId, data]) => ({
          name: data.name ?? "Unknown",
          email: data.email ?? "",
          percentageOwned: data.percentageOwned,
          percentageDisplay: `${(data.percentageOwned / 100).toFixed(2)}%`,
          isCurrentUser: ownerId === userId,
        }),
      );

      const totalAllocated = coOwners.reduce(
        (sum, o) => sum + o.percentageOwned,
        0,
      );

      return {
        unitId: input.unitId,
        unitName: unit?.name ?? "Unknown",
        coOwners,
        totalAllocated,
        totalAllocatedDisplay: `${(totalAllocated / 100).toFixed(2)}%`,
      };
    }),

  /**
   * Get quarterly earnings breakdown for current user
   * Calculates per-unit earnings from booking revenue minus expenses
   * Formula per quarter per unit:
   *   afterExpense = max(0, grossRevenue - fixedExpense)
   *   managementFee = afterExpense × managementFeePercent
   *   netPool = afterExpense - managementFee
   *   ownerShare = netPool × (ownerPercentage / 10000)
   */
  getMyQuarterlyEarnings: investorProcedure
    .input(z.object({ year: z.number().int().min(2020).max(2100) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { fixedExpensePerUnitPerQuarter, managementFeePercent } =
        siteConfig.earnings;

      // 1. Fetch user's ownerships with unit info (excluding rejected)
      const myOwnerships = await ctx.db.query.ownerships.findMany({
        where: (o, { eq, and, or, isNull }) =>
          and(
            eq(o.userId, userId),
            or(isNull(o.approvalStatus), eq(o.approvalStatus, "APPROVED")),
          ),
        with: {
          unit: {
            with: {
              collection: { columns: { id: true, name: true } },
            },
          },
        },
      });

      // 2. Aggregate percentageOwned per unit
      const unitMap = new Map<
        number,
        {
          unitName: string;
          collectionName: string;
          totalPercentage: number;
        }
      >();

      for (const ownership of myOwnerships) {
        if (!ownership.unitId || !ownership.unit) continue;
        const existing = unitMap.get(ownership.unitId);
        if (existing) {
          existing.totalPercentage += ownership.percentageOwned;
        } else {
          unitMap.set(ownership.unitId, {
            unitName: ownership.unit.name,
            collectionName: ownership.unit.collection?.name ?? "Unknown",
            totalPercentage: ownership.percentageOwned,
          });
        }
      }

      const unitIds = Array.from(unitMap.keys());

      if (unitIds.length === 0) {
        return {
          year: input.year,
          lastRefreshedAt: null,
          units: [],
          grandTotal: 0,
          config: {
            fixedExpensePerQuarter: fixedExpensePerUnitPerQuarter,
            managementFeePercent,
          },
        };
      }

      // 3. Fetch revenue cache for these units and year
      const revenueRows = await ctx.db
        .select()
        .from(bookingRevenueCache)
        .where(
          and(
            eq(bookingRevenueCache.year, input.year),
            inArray(bookingRevenueCache.unitId, unitIds),
          ),
        );

      // 4. Fetch cache meta for lastRefreshedAt
      const meta = await ctx.db.query.bookingRevenueCacheMeta.findFirst({
        where: (m, { eq }) => eq(m.year, input.year),
      });

      // 5. Fetch settlements + payouts for this user's units
      const settlements = await ctx.db
        .select()
        .from(quarterlyUnitSettlements)
        .where(
          and(
            eq(quarterlyUnitSettlements.year, input.year),
            inArray(quarterlyUnitSettlements.unitId, unitIds),
          ),
        );

      // Build settlement lookup: unitId -> quarter -> settlement
      const settlementLookup = new Map<number, Map<number, typeof settlements[0]>>();
      const settlementIds = settlements.map((s) => s.id);

      for (const s of settlements) {
        let quarterMap = settlementLookup.get(s.unitId);
        if (!quarterMap) {
          quarterMap = new Map();
          settlementLookup.set(s.unitId, quarterMap);
        }
        quarterMap.set(s.quarter, s);
      }

      // Fetch this user's payouts from these settlements
      const payoutLookup = new Map<number, { amount: number; isPaid: boolean; paidAt: Date | null }>();
      if (settlementIds.length > 0) {
        const payoutRows = await ctx.db
          .select()
          .from(quarterlyOwnerPayouts)
          .where(
            and(
              eq(quarterlyOwnerPayouts.userId, userId),
              inArray(quarterlyOwnerPayouts.settlementId, settlementIds),
            ),
          );
        for (const p of payoutRows) {
          payoutLookup.set(p.settlementId, {
            amount: Number(p.amount),
            isPaid: p.isPaid,
            paidAt: p.paidAt,
          });
        }
      }

      // 6. Build revenue lookup: unitId -> month -> revenue
      const revenueLookup = new Map<number, Map<number, number>>();
      for (const row of revenueRows) {
        let monthMap = revenueLookup.get(row.unitId);
        if (!monthMap) {
          monthMap = new Map();
          revenueLookup.set(row.unitId, monthMap);
        }
        monthMap.set(row.month, Number(row.revenue));
      }

      // 7. Calculate quarterly earnings per unit
      const quarterLabels = [
        "Q1 (Jan–Mar)",
        "Q2 (Apr–Jun)",
        "Q3 (Jul–Sep)",
        "Q4 (Oct–Dec)",
      ];
      const quarterMonths = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10, 11, 12],
      ];

      let grandTotal = 0;

      const unitsResult = unitIds.map((unitId) => {
        const unitInfo = unitMap.get(unitId)!;
        const monthRevenue = revenueLookup.get(unitId) ?? new Map();
        const unitSettlements = settlementLookup.get(unitId);

        let yearTotal = 0;

        const quarters = quarterMonths.map((months, qi) => {
          const quarterNum = qi + 1;
          const settlement = unitSettlements?.get(quarterNum);

          // Check for payout record
          if (settlement) {
            const payout = payoutLookup.get(settlement.id);
            if (payout) {
              yearTotal += payout.amount;
              return {
                quarter: quarterNum,
                label: quarterLabels[qi]!,
                ownerShare: payout.amount,
                status: payout.isPaid ? ("PAID" as const) : ("PENDING" as const),
                paidAt: payout.paidAt,
              };
            }
          }

          // Calculate estimated share from revenue cache
          const grossRevenue = months.reduce(
            (sum, m) => sum + (monthRevenue.get(m) ?? 0),
            0,
          );
          const afterExpense = Math.max(
            0,
            grossRevenue - fixedExpensePerUnitPerQuarter,
          );
          const managementFee = Math.round(afterExpense * managementFeePercent * 100) / 100;
          const netPool = Math.round((afterExpense - managementFee) * 100) / 100;
          const ownerShare =
            Math.round(
              netPool * (unitInfo.totalPercentage / 10000) * 100,
            ) / 100;

          yearTotal += ownerShare;

          return {
            quarter: quarterNum,
            label: quarterLabels[qi]!,
            ownerShare,
            status: "ESTIMATE" as const,
            paidAt: null as Date | null,
          };
        });

        grandTotal += yearTotal;

        return {
          unitId,
          unitName: unitInfo.unitName,
          collectionName: unitInfo.collectionName,
          ownerPercentage: unitInfo.totalPercentage,
          ownerPercentageDisplay: `${(unitInfo.totalPercentage / 100).toFixed(2)}%`,
          quarters,
          yearTotal: Math.round(yearTotal * 100) / 100,
        };
      });

      return {
        year: input.year,
        lastRefreshedAt: meta?.lastRefreshedAt ?? null,
        units: unitsResult,
        grandTotal: Math.round(grandTotal * 100) / 100,
      };
    }),
});
