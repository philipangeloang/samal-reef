import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { pricingTiers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getCollectionTierAvailability } from "@/lib/allocation";

export const pricingRouter = createTRPCRouter({
  /**
   * Get all active pricing tiers
   * Public endpoint - anyone can view pricing
   */
  getActiveTiers: publicProcedure.query(async ({ ctx }) => {
    const now = new Date();

    const tiers = await ctx.db.query.pricingTiers.findMany({
      where: (tiers, { eq, and, or, isNull, gte }) =>
        and(
          eq(tiers.isActive, true),
          or(isNull(tiers.effectiveUntil), gte(tiers.effectiveUntil, now)),
        ),
      orderBy: (tiers, { asc }) => [asc(tiers.percentage)],
    });

    return tiers;
  }),

  /**
   * Check tier availability for a specific collection
   * Returns which percentage tiers are still available (not sold out)
   * Public endpoint - used to disable sold-out options in UI
   */
  getCollectionAvailability: publicProcedure
    .input(z.object({ collectionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const availability = await getCollectionTierAvailability(input.collectionId);
      return availability;
    }),

  /**
   * Get all pricing tiers (including inactive and historical)
   * Admin only - for pricing management dashboard
   */
  getAllTiers: adminProcedure.query(async ({ ctx }) => {
    const tiers = await ctx.db.query.pricingTiers.findMany({
      orderBy: (tiers, { desc, asc }) => [
        desc(tiers.effectiveFrom),
        asc(tiers.percentage),
      ],
    });

    return tiers;
  }),

  /**
   * Create a new pricing tier
   * Admin only - when updating prices, create new tier and mark old one as inactive
   */
  createTier: adminProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        percentage: z.number().int().min(100).max(10000), // 1% to 100% in basis points
        cryptoPrice: z.string().regex(/^\d+\.\d{2}$/), // Format: "1234.56"
        fiatPrice: z.string().regex(/^\d+\.\d{2}$/),
        displayLabel: z.string().min(1).max(50),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [newTier] = await ctx.db
        .insert(pricingTiers)
        .values({
          collectionId: input.collectionId,
          percentage: input.percentage,
          cryptoPrice: input.cryptoPrice,
          fiatPrice: input.fiatPrice,
          displayLabel: input.displayLabel,
          isActive: input.isActive,
        })
        .returning();

      return newTier;
    }),

  /**
   * Update an existing pricing tier
   * Admin only - typically used to deactivate old tiers or extend effectiveUntil
   */
  updateTier: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        cryptoPrice: z.string().regex(/^\d+\.\d{2}$/).optional(),
        fiatPrice: z.string().regex(/^\d+\.\d{2}$/).optional(),
        displayLabel: z.string().min(1).max(50).optional(),
        isActive: z.boolean().optional(),
        effectiveUntil: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [updatedTier] = await ctx.db
        .update(pricingTiers)
        .set(updates)
        .where(eq(pricingTiers.id, id))
        .returning();

      return updatedTier;
    }),

  /**
   * Deactivate a pricing tier
   * Admin only - marks tier as inactive and sets effectiveUntil to now
   */
  deactivateTier: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [deactivatedTier] = await ctx.db
        .update(pricingTiers)
        .set({
          isActive: false,
          effectiveUntil: new Date(),
        })
        .where(eq(pricingTiers.id, input.id))
        .returning();

      return deactivatedTier;
    }),

  /**
   * Get a single pricing tier by ID
   * Public endpoint
   */
  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const tier = await ctx.db.query.pricingTiers.findFirst({
        where: (tiers, { eq }) => eq(tiers.id, input.id),
      });

      if (!tier) {
        throw new Error("Pricing tier not found");
      }

      return tier;
    }),
});
