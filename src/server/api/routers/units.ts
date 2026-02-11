import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { units, ownerships } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

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
});
