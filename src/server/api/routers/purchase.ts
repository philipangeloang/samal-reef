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
});
