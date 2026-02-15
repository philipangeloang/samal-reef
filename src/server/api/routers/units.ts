import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import {
  units,
  ownerships,
  users,
  bookingRevenueCache,
  bookingRevenueCacheMeta,
  quarterlyUnitSettlements,
  quarterlyOwnerPayouts,
} from "@/server/db/schema";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import { siteConfig } from "@/site.config";

export const unitsRouter = createTRPCRouter({
  /**
   * Get units by collection
   * Admin endpoint - for selecting units in forms
   */
  getByCollection: adminProcedure
    .input(z.object({ collectionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const collectionUnits = await ctx.db.query.units.findMany({
        where: eq(units.collectionId, input.collectionId),
        orderBy: (units, { asc }) => [asc(units.name)],
      });

      return collectionUnits;
    }),

  /**
   * Get all units with availability calculation
   * Public endpoint - anyone can browse units
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    const allUnits = await ctx.db.query.units.findMany({
      orderBy: (units, { desc }) => [desc(units.createdAt)],
    });

    // Calculate availability for each unit
    const unitsWithAvailability = await Promise.all(
      allUnits.map(async (unit) => {
        // Sum all ownerships for this unit
        const result = await ctx.db
          .select({
            totalOwned: sql<number>`COALESCE(SUM(${ownerships.percentageOwned}), 0)`,
          })
          .from(ownerships)
          .where(eq(ownerships.unitId, unit.id));

        const totalOwned = Number(result[0]?.totalOwned ?? 0);
        const availablePercentage = 10000 - totalOwned; // 10000 = 100% in basis points

        return {
          ...unit,
          totalOwned,
          availablePercentage,
          isSoldOut: availablePercentage <= 0,
        };
      }),
    );

    return unitsWithAvailability;
  }),

  /**
   * Get a single unit by ID with detailed ownership information
   * Admin only
   */
  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      // Get unit with collection
      const unit = await ctx.db.query.units.findFirst({
        where: (units, { eq }) => eq(units.id, input.id),
        with: {
          collection: true,
        },
      });

      if (!unit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit not found",
        });
      }

      // Get all ownerships with user information
      const unitOwnerships = await ctx.db.query.ownerships.findMany({
        where: (ownerships, { eq }) => eq(ownerships.unitId, input.id),
        with: {
          user: true,
        },
        orderBy: (ownerships, { desc }) => [desc(ownerships.percentageOwned)],
      });

      // Calculate total owned
      const result = await ctx.db
        .select({
          totalOwned: sql<number>`COALESCE(SUM(${ownerships.percentageOwned}), 0)`,
        })
        .from(ownerships)
        .where(eq(ownerships.unitId, input.id));

      const totalOwned = Number(result[0]?.totalOwned ?? 0);
      const availablePercentage = 10000 - totalOwned; // 10000 = 100% in basis points

      return {
        ...unit,
        ownerships: unitOwnerships,
        totalOwned,
        availablePercentage,
        isSoldOut: availablePercentage <= 0,
      };
    }),

  /**
   * Create a new unit
   * Admin only
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        collectionId: z.number().int().positive(),
        description: z.string().optional(),
        imageUrl: z.string().url().max(500).optional(),
        status: z
          .enum(["AVAILABLE", "SOLD_OUT", "DRAFT"])
          .optional()
          .default("DRAFT"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [newUnit] = await ctx.db
        .insert(units)
        .values({
          name: input.name,
          collectionId: input.collectionId,
          description: input.description,
          imageUrl: input.imageUrl,
          status: input.status,
        })
        .returning();

      return newUnit;
    }),

  /**
   * Update an existing unit
   * Admin only
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        collectionId: z.number().int().positive().optional(),
        description: z.string().optional(),
        imageUrl: z.string().url().max(500).optional(),
        status: z.enum(["AVAILABLE", "SOLD_OUT", "DRAFT"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [updatedUnit] = await ctx.db
        .update(units)
        .set(updates)
        .where(eq(units.id, id))
        .returning();

      if (!updatedUnit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit not found",
        });
      }

      return updatedUnit;
    }),

  /**
   * Delete a unit
   * Admin only - should only be used for drafts, not units with ownerships
   */
  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Check if unit has any ownerships
      const existingOwnerships = await ctx.db.query.ownerships.findMany({
        where: (ownerships, { eq }) => eq(ownerships.unitId, input.id),
      });

      if (existingOwnerships.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete unit with existing ownerships",
        });
      }

      await ctx.db.delete(units).where(eq(units.id, input.id));

      return { success: true };
    }),

  /**
   * Get quarterly earnings breakdown for a specific unit
   * Admin only — shows deduction formula, each owner's share, and settlement/payout status
   */
  getUnitQuarterlyEarnings: adminProcedure
    .input(
      z.object({
        unitId: z.number().int().positive(),
        year: z.number().int().min(2020).max(2100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { fixedExpensePerUnitPerQuarter, managementFeePercent } =
        siteConfig.earnings;

      // 1. Fetch all ownerships for this unit (excluding rejected/pending)
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

      // 2. Aggregate percentage per user
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

      // 3. Fetch revenue cache for this unit and year
      const revenueRows = await ctx.db
        .select()
        .from(bookingRevenueCache)
        .where(
          and(
            eq(bookingRevenueCache.year, input.year),
            eq(bookingRevenueCache.unitId, input.unitId),
          ),
        );

      // 4. Fetch cache meta for lastRefreshedAt
      const meta = await ctx.db.query.bookingRevenueCacheMeta.findFirst({
        where: (m, { eq }) => eq(m.year, input.year),
      });

      // 5. Fetch settlements for this unit/year
      const settlements = await ctx.db
        .select()
        .from(quarterlyUnitSettlements)
        .where(
          and(
            eq(quarterlyUnitSettlements.unitId, input.unitId),
            eq(quarterlyUnitSettlements.year, input.year),
          ),
        );

      const settlementMap = new Map(
        settlements.map((s) => [s.quarter, s]),
      );

      // 6. Fetch all payouts for these settlements
      const settlementIds = settlements.map((s) => s.id);
      let payoutsBySettlement = new Map<
        number,
        Array<{
          id: number;
          userId: string;
          percentageOwned: number;
          amount: string;
          isPaid: boolean;
          paidAt: Date | null;
          paidBy: string | null;
          notes: string | null;
          userName: string | null;
          userEmail: string | null;
        }>
      >();

      if (settlementIds.length > 0) {
        const payoutRows = await ctx.db
          .select({
            id: quarterlyOwnerPayouts.id,
            settlementId: quarterlyOwnerPayouts.settlementId,
            userId: quarterlyOwnerPayouts.userId,
            percentageOwned: quarterlyOwnerPayouts.percentageOwned,
            amount: quarterlyOwnerPayouts.amount,
            isPaid: quarterlyOwnerPayouts.isPaid,
            paidAt: quarterlyOwnerPayouts.paidAt,
            paidBy: quarterlyOwnerPayouts.paidBy,
            notes: quarterlyOwnerPayouts.notes,
            userName: users.name,
            userEmail: users.email,
          })
          .from(quarterlyOwnerPayouts)
          .leftJoin(users, eq(quarterlyOwnerPayouts.userId, users.id))
          .where(
            sql`${quarterlyOwnerPayouts.settlementId} IN (${sql.join(
              settlementIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          );

        for (const row of payoutRows) {
          const existing = payoutsBySettlement.get(row.settlementId) ?? [];
          existing.push({
            id: row.id,
            userId: row.userId,
            percentageOwned: row.percentageOwned,
            amount: row.amount,
            isPaid: row.isPaid,
            paidAt: row.paidAt,
            paidBy: row.paidBy,
            notes: row.notes,
            userName: row.userName,
            userEmail: row.userEmail,
          });
          payoutsBySettlement.set(row.settlementId, existing);
        }
      }

      // 7. Build monthly revenue map
      const monthRevenue = new Map<number, number>();
      for (const row of revenueRows) {
        monthRevenue.set(row.month, Number(row.revenue));
      }

      // 8. Calculate quarterly deductions (with settlement overlay)
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

      let yearTotalNetPool = 0;

      const quarters = quarterMonths.map((months, qi) => {
        const quarterNum = qi + 1;
        const settlement = settlementMap.get(quarterNum);

        // Calculate from revenue cache (used for unsettled quarters and as reference)
        const grossRevenue = months.reduce(
          (sum, m) => sum + (monthRevenue.get(m) ?? 0),
          0,
        );

        if (settlement) {
          // Use locked-in settlement values
          const payouts = payoutsBySettlement.get(settlement.id) ?? [];
          yearTotalNetPool += Number(settlement.netPool);

          return {
            quarter: quarterNum,
            label: quarterLabels[qi]!,
            grossRevenue: Number(settlement.grossRevenue),
            fixedExpense: Number(settlement.fixedExpense),
            additionalExpense: Number(settlement.additionalExpense),
            managementFee: Number(settlement.managementFee),
            netPool: Number(settlement.netPool),
            isSettled: true as const,
            settlement: {
              id: settlement.id,
              notes: settlement.notes,
              createdAt: settlement.createdAt,
              payouts: payouts.map((p) => ({
                id: p.id,
                userId: p.userId,
                name: p.userName ?? "Unknown",
                email: p.userEmail ?? "",
                percentageOwned: p.percentageOwned,
                percentageDisplay: `${(p.percentageOwned / 100).toFixed(2)}%`,
                amount: Number(p.amount),
                isPaid: p.isPaid,
                paidAt: p.paidAt,
                notes: p.notes,
              })),
            },
          };
        }

        // Unsettled: calculate from revenue
        const afterExpense = Math.max(
          0,
          grossRevenue - fixedExpensePerUnitPerQuarter,
        );
        const mgmtFee =
          Math.round(afterExpense * managementFeePercent * 100) / 100;
        const netPool = Math.round((afterExpense - mgmtFee) * 100) / 100;
        yearTotalNetPool += netPool;

        return {
          quarter: quarterNum,
          label: quarterLabels[qi]!,
          grossRevenue: Math.round(grossRevenue * 100) / 100,
          fixedExpense: fixedExpensePerUnitPerQuarter,
          additionalExpense: 0,
          managementFee: mgmtFee,
          netPool,
          isSettled: false as const,
          settlement: null,
        };
      });

      // 9. Calculate each owner's share per quarter
      const owners = Array.from(ownerMap.entries()).map(([userId, data]) => {
        const quarterShares = quarters.map((q) => {
          if (q.isSettled && q.settlement) {
            // Use payout amount from settlement
            const payout = q.settlement.payouts.find(
              (p) => p.userId === userId,
            );
            return payout?.amount ?? 0;
          }
          // Calculate estimated share
          return (
            Math.round(q.netPool * (data.percentageOwned / 10000) * 100) / 100
          );
        });
        const yearTotal =
          Math.round(quarterShares.reduce((a, b) => a + b, 0) * 100) / 100;

        return {
          name: data.name ?? "Unknown",
          email: data.email ?? "",
          percentageOwned: data.percentageOwned,
          percentageDisplay: `${(data.percentageOwned / 100).toFixed(2)}%`,
          quarterShares,
          yearTotal,
        };
      });

      return {
        year: input.year,
        lastRefreshedAt: meta?.lastRefreshedAt ?? null,
        quarters,
        yearTotalNetPool: Math.round(yearTotalNetPool * 100) / 100,
        owners,
        config: {
          fixedExpensePerQuarter: fixedExpensePerUnitPerQuarter,
          managementFeePercent,
        },
      };
    }),

  /**
   * Settle a quarter for a unit — locks in financials and creates payout records
   * Admin only
   */
  createSettlement: adminProcedure
    .input(
      z.object({
        unitId: z.number().int().positive(),
        year: z.number().int().min(2020).max(2100),
        quarter: z.number().int().min(1).max(4),
        additionalExpense: z.number().nonnegative(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { fixedExpensePerUnitPerQuarter, managementFeePercent } =
        siteConfig.earnings;

      // Check for existing settlement
      const existing =
        await ctx.db.query.quarterlyUnitSettlements.findFirst({
          where: and(
            eq(quarterlyUnitSettlements.unitId, input.unitId),
            eq(quarterlyUnitSettlements.year, input.year),
            eq(quarterlyUnitSettlements.quarter, input.quarter),
          ),
        });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Q${input.quarter} ${input.year} has already been settled`,
        });
      }

      // Fetch gross revenue from cache
      const quarterMonths = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10, 11, 12],
      ];
      const months = quarterMonths[input.quarter - 1]!;

      const revenueRows = await ctx.db
        .select()
        .from(bookingRevenueCache)
        .where(
          and(
            eq(bookingRevenueCache.year, input.year),
            eq(bookingRevenueCache.unitId, input.unitId),
          ),
        );

      const grossRevenue = months.reduce((sum, m) => {
        const row = revenueRows.find((r) => r.month === m);
        return sum + (row ? Number(row.revenue) : 0);
      }, 0);

      // Apply deduction formula
      const afterExpense = Math.max(
        0,
        grossRevenue - fixedExpensePerUnitPerQuarter - input.additionalExpense,
      );
      const mgmtFee =
        Math.round(afterExpense * managementFeePercent * 100) / 100;
      const netPool = Math.round((afterExpense - mgmtFee) * 100) / 100;

      // Fetch current owners
      const unitOwnerships = await ctx.db
        .select({
          userId: ownerships.userId,
          percentageOwned: ownerships.percentageOwned,
        })
        .from(ownerships)
        .where(
          and(
            eq(ownerships.unitId, input.unitId),
            or(
              isNull(ownerships.approvalStatus),
              eq(ownerships.approvalStatus, "APPROVED"),
            ),
          ),
        );

      // Aggregate per user
      const ownerMap = new Map<string, number>();
      for (const row of unitOwnerships) {
        if (!row.userId) continue;
        ownerMap.set(
          row.userId,
          (ownerMap.get(row.userId) ?? 0) + row.percentageOwned,
        );
      }

      // Create settlement
      const [settlement] = await ctx.db
        .insert(quarterlyUnitSettlements)
        .values({
          unitId: input.unitId,
          year: input.year,
          quarter: input.quarter,
          grossRevenue: String(Math.round(grossRevenue * 100) / 100),
          fixedExpense: String(fixedExpensePerUnitPerQuarter),
          additionalExpense: String(input.additionalExpense),
          managementFee: String(mgmtFee),
          netPool: String(netPool),
          notes: input.notes,
          createdByUserId: ctx.session.user.id,
        })
        .returning();

      if (!settlement) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create settlement",
        });
      }

      // Create payout records
      const payoutValues = Array.from(ownerMap.entries()).map(
        ([userId, percentageOwned]) => ({
          settlementId: settlement.id,
          userId,
          percentageOwned,
          amount: String(
            Math.round(netPool * (percentageOwned / 10000) * 100) / 100,
          ),
        }),
      );

      if (payoutValues.length > 0) {
        await ctx.db.insert(quarterlyOwnerPayouts).values(payoutValues);
      }

      return { success: true, settlementId: settlement.id };
    }),

  /**
   * Mark a single owner payout as paid
   * Admin only
   */
  markPayoutPaid: adminProcedure
    .input(
      z.object({
        payoutId: z.number().int().positive(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payout =
        await ctx.db.query.quarterlyOwnerPayouts.findFirst({
          where: eq(quarterlyOwnerPayouts.id, input.payoutId),
        });

      if (!payout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payout not found",
        });
      }

      if (payout.isPaid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payout already marked as paid",
        });
      }

      await ctx.db
        .update(quarterlyOwnerPayouts)
        .set({
          isPaid: true,
          paidAt: new Date(),
          paidBy: ctx.session.user.id,
          notes: input.notes ?? payout.notes,
        })
        .where(eq(quarterlyOwnerPayouts.id, input.payoutId));

      return { success: true };
    }),

  /**
   * Mark all unpaid payouts for a settlement as paid
   * Admin only
   */
  markAllPayoutsPaid: adminProcedure
    .input(
      z.object({
        settlementId: z.number().int().positive(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settlement =
        await ctx.db.query.quarterlyUnitSettlements.findFirst({
          where: eq(quarterlyUnitSettlements.id, input.settlementId),
        });

      if (!settlement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Settlement not found",
        });
      }

      await ctx.db
        .update(quarterlyOwnerPayouts)
        .set({
          isPaid: true,
          paidAt: new Date(),
          paidBy: ctx.session.user.id,
          ...(input.notes ? { notes: input.notes } : {}),
        })
        .where(
          and(
            eq(quarterlyOwnerPayouts.settlementId, input.settlementId),
            eq(quarterlyOwnerPayouts.isPaid, false),
          ),
        );

      return { success: true };
    }),

  /**
   * Delete a settlement (only if no payouts are marked as paid)
   * Admin only
   */
  deleteSettlement: adminProcedure
    .input(z.object({ settlementId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Check for paid payouts
      const paidPayout =
        await ctx.db.query.quarterlyOwnerPayouts.findFirst({
          where: and(
            eq(quarterlyOwnerPayouts.settlementId, input.settlementId),
            eq(quarterlyOwnerPayouts.isPaid, true),
          ),
        });

      if (paidPayout) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot delete settlement with paid payouts. Unpay all owners first.",
        });
      }

      await ctx.db
        .delete(quarterlyUnitSettlements)
        .where(eq(quarterlyUnitSettlements.id, input.settlementId));

      return { success: true };
    }),
});
