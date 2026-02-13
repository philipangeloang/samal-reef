import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { galleryImages, propertyCollections } from "@/server/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export const galleryRouter = createTRPCRouter({
  /**
   * Get gallery images for a collection (public)
   * Returns images ordered by displayOrder
   */
  getByCollection: publicProcedure
    .input(z.object({ collectionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.galleryImages.findMany({
        where: eq(galleryImages.collectionId, input.collectionId),
        orderBy: [asc(galleryImages.displayOrder), asc(galleryImages.createdAt)],
      });
    }),

  /**
   * Add gallery images after UploadThing upload completes
   * Admin only — accepts batch of uploaded file results
   */
  addImages: adminProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        images: z
          .array(
            z.object({
              url: z.string().url(),
              fileKey: z.string().min(1),
            }),
          )
          .min(1)
          .max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify collection exists
      const collection = await ctx.db.query.propertyCollections.findFirst({
        where: eq(propertyCollections.id, input.collectionId),
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Get current max displayOrder for this collection
      const existingImages = await ctx.db.query.galleryImages.findMany({
        where: eq(galleryImages.collectionId, input.collectionId),
        orderBy: [asc(galleryImages.displayOrder)],
      });
      const maxOrder =
        existingImages.length > 0
          ? Math.max(...existingImages.map((img) => img.displayOrder))
          : -1;

      // Insert all images with sequential displayOrder
      const values = input.images.map((img, index) => ({
        collectionId: input.collectionId,
        url: img.url,
        fileKey: img.fileKey,
        displayOrder: maxOrder + 1 + index,
      }));

      const inserted = await ctx.db
        .insert(galleryImages)
        .values(values)
        .returning();
      return inserted;
    }),

  /**
   * Delete a gallery image
   * Admin only — also deletes from UploadThing storage
   */
  deleteImage: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const image = await ctx.db.query.galleryImages.findFirst({
        where: eq(galleryImages.id, input.id),
      });

      if (!image) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Image not found",
        });
      }

      // Delete from UploadThing storage
      try {
        await utapi.deleteFiles(image.fileKey);
      } catch (error) {
        console.error("Failed to delete from UploadThing:", error);
      }

      // Delete from database
      await ctx.db
        .delete(galleryImages)
        .where(eq(galleryImages.id, input.id));
      return { success: true };
    }),

  /**
   * Reorder gallery images within a collection
   * Admin only — accepts array of { id, displayOrder }
   */
  reorder: adminProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        imageOrders: z.array(
          z.object({
            id: z.number().int().positive(),
            displayOrder: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (const item of input.imageOrders) {
          await tx
            .update(galleryImages)
            .set({ displayOrder: item.displayOrder })
            .where(
              and(
                eq(galleryImages.id, item.id),
                eq(galleryImages.collectionId, input.collectionId),
              ),
            );
        }
      });
      return { success: true };
    }),
});
