import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { propertyCollections, units, pricingTiers, collectionDiscounts } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const collectionRouter = createTRPCRouter({
  /**
   * Get collection by ID
   * Public endpoint - used for booking pages
   */
  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const collection = await ctx.db.query.propertyCollections.findFirst({
        where: eq(propertyCollections.id, input.id),
      });

      return collection ?? null;
    }),

  /**
   * Get collection with its pricing tiers and unit stats
   * Public endpoint - used on landing page for carousel
   */
  getBySlugWithDetails: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch collection with related data in ONE query using Drizzle relations
      const collection = await ctx.db.query.propertyCollections.findFirst({
        where: (collections, { eq, and }) =>
          and(
            eq(collections.slug, input.slug),
            eq(collections.isActive, true)
          ),
        with: {
          pricingTiers: {
            where: (tiers, { eq }) => eq(tiers.isActive, true),
            orderBy: (tiers, { asc }) => [asc(tiers.percentage)],
          },
          units: true,
        },
      });

      if (!collection) {
        return null;
      }

      return {
        ...collection,
        totalUnits: collection.units.length,
      };
    }),

  /**
   * Get all active collections for public booking page
   * Public endpoint - no authentication required
   */
  getActiveForBooking: publicProcedure.query(async ({ ctx }) => {
    const collections = await ctx.db.query.propertyCollections.findMany({
      where: (collections, { eq }) => eq(collections.isActive, true),
      with: {
        units: true,
      },
      orderBy: (collections, { asc }) => [asc(collections.displayOrder)],
    });

    return collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      location: collection.location,
      imageUrl: collection.imageUrl,
      isActive: collection.isActive,
      unitCount: collection.units.length,
    }));
  }),

  /**
   * Get all collections for admin management
   * Protected endpoint - requires authentication
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const collections = await ctx.db.query.propertyCollections.findMany({
      with: {
        units: true,
        pricingTiers: true,
      },
      orderBy: (collections, { asc }) => [asc(collections.displayOrder)],
    });

    return collections.map((collection) => ({
      ...collection,
      unitCount: collection.units.length,
      pricingTierCount: collection.pricingTiers.length,
    }));
  }),

  /**
   * Create a new property collection
   * Admin only endpoint
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(255),
        slug: z
          .string()
          .min(1, "Slug is required")
          .max(255)
          .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
        description: z.string().optional(),
        imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
        location: z.string().optional(),
        isActive: z.boolean().default(true),
        displayOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create collections",
        });
      }

      // Check if slug already exists
      const existing = await ctx.db.query.propertyCollections.findFirst({
        where: eq(propertyCollections.slug, input.slug),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A collection with this slug already exists",
        });
      }

      const [newCollection] = await ctx.db
        .insert(propertyCollections)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          imageUrl: input.imageUrl || null,
          location: input.location ?? null,
          isActive: input.isActive,
          displayOrder: input.displayOrder,
        })
        .returning();

      return newCollection;
    }),

  /**
   * Update an existing collection
   * Admin only endpoint
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        slug: z
          .string()
          .min(1)
          .max(255)
          .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only")
          .optional(),
        description: z.string().optional(),
        imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
        location: z.string().optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().int().optional(),
        // Booking pricing fields
        bookingPricePerNight: z.string().optional().nullable(),
        bookingCleaningFee: z.string().optional().nullable(),
        bookingServiceFeePercent: z.string().optional().nullable(),
        bookingMinNights: z.number().int().min(1).optional().nullable(),
        bookingMaxGuests: z.number().int().min(1).optional().nullable(),
        // Discount fields removed — now managed via collectionDiscounts table
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update collections",
        });
      }

      // Check if collection exists
      const existing = await ctx.db.query.propertyCollections.findFirst({
        where: eq(propertyCollections.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // If slug is being changed, check it's not taken
      if (input.slug && input.slug !== existing.slug) {
        const slugTaken = await ctx.db.query.propertyCollections.findFirst({
          where: eq(propertyCollections.slug, input.slug),
        });

        if (slugTaken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A collection with this slug already exists",
          });
        }
      }

      const [updated] = await ctx.db
        .update(propertyCollections)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.slug !== undefined && { slug: input.slug }),
          ...(input.description !== undefined && { description: input.description || null }),
          ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl || null }),
          ...(input.location !== undefined && { location: input.location || null }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
          // Booking pricing
          ...(input.bookingPricePerNight !== undefined && { bookingPricePerNight: input.bookingPricePerNight }),
          ...(input.bookingCleaningFee !== undefined && { bookingCleaningFee: input.bookingCleaningFee }),
          ...(input.bookingServiceFeePercent !== undefined && { bookingServiceFeePercent: input.bookingServiceFeePercent }),
          ...(input.bookingMinNights !== undefined && { bookingMinNights: input.bookingMinNights }),
          ...(input.bookingMaxGuests !== undefined && { bookingMaxGuests: input.bookingMaxGuests }),
          updatedAt: new Date(),
        })
        .where(eq(propertyCollections.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete a collection
   * Admin only endpoint - prevents deletion if collection has units or pricing tiers
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete collections",
        });
      }

      // Check if collection exists
      const collection = await ctx.db.query.propertyCollections.findFirst({
        where: eq(propertyCollections.id, input.id),
        with: {
          units: true,
          pricingTiers: true,
        },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Prevent deletion if collection has units or pricing tiers
      if (collection.units.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete collection with ${collection.units.length} existing unit(s). Delete or reassign units first.`,
        });
      }

      if (collection.pricingTiers.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete collection with ${collection.pricingTiers.length} existing pricing tier(s). Delete tiers first.`,
        });
      }

      await ctx.db.delete(propertyCollections).where(eq(propertyCollections.id, input.id));

      return { success: true };
    }),

  /**
   * Toggle collection active status
   * Admin only endpoint
   */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can toggle collection status",
        });
      }

      const collection = await ctx.db.query.propertyCollections.findFirst({
        where: eq(propertyCollections.id, input.id),
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const [updated] = await ctx.db
        .update(propertyCollections)
        .set({
          isActive: !collection.isActive,
          updatedAt: new Date(),
        })
        .where(eq(propertyCollections.id, input.id))
        .returning();

      return updated;
    }),

  // ===== COLLECTION DISCOUNT CRUD =====

  getDiscounts: publicProcedure
    .input(z.object({ collectionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.collectionDiscounts.findMany({
        where: eq(collectionDiscounts.collectionId, input.collectionId),
        orderBy: (d, { asc }) => [asc(d.createdAt)],
      });
    }),

  addDiscount: protectedProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        label: z.string().min(1).max(100),
        percent: z.string().regex(/^\d+\.?\d*$/),
        conditionType: z.enum(["ALWAYS", "MIN_NIGHTS", "DATE_RANGE", "WEEKEND", "WEEKDAY"]),
        conditionValue: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can manage discounts" });
      }

      const [discount] = await ctx.db
        .insert(collectionDiscounts)
        .values({
          collectionId: input.collectionId,
          label: input.label,
          percent: input.percent,
          conditionType: input.conditionType,
          conditionValue: input.conditionValue ?? null,
        })
        .returning();

      return discount;
    }),

  updateDiscount: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        label: z.string().min(1).max(100).optional(),
        percent: z.string().regex(/^\d+\.?\d*$/).optional(),
        conditionType: z.enum(["ALWAYS", "MIN_NIGHTS", "DATE_RANGE", "WEEKEND", "WEEKDAY"]).optional(),
        conditionValue: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can manage discounts" });
      }

      const { id, ...updates } = input;
      const [updated] = await ctx.db
        .update(collectionDiscounts)
        .set(updates)
        .where(eq(collectionDiscounts.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Discount not found" });
      }

      return updated;
    }),

  deleteDiscount: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can manage discounts" });
      }

      await ctx.db.delete(collectionDiscounts).where(eq(collectionDiscounts.id, input.id));
      return { success: true };
    }),
});
