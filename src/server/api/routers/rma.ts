/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { createTRPCRouter, investorProcedure } from "@/server/api/trpc";
import { ownerships } from "@/server/db/schema";
import {
  generateUnsignedRmaPdf,
  generateSignedRmaPdf,
  rmaPdfBufferToBase64,
  type RmaData,
} from "@/server/services/rma-generator";
import { UTApi } from "uploadthing/server";
import { emailService } from "@/server/email";
import { formatCurrency } from "@/lib/currency";

// Initialize UploadThing API for server-side uploads
const utapi = new UTApi();

export const rmaRouter = createTRPCRouter({
  /**
   * Generate unsigned RMA template for preview
   * Returns base64 PDF that can be displayed to user
   */
  generateUnsignedPreview: investorProcedure
    .input(
      z.object({
        ownershipId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify ownership belongs to user
      const ownership = await ctx.db.query.ownerships.findFirst({
        where: eq(ownerships.id, input.ownershipId),
        with: {
          unit: {
            with: {
              collection: true,
            },
          },
          pricingTier: true,
        },
      });

      if (!ownership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ownership not found",
        });
      }

      if (ownership.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't own this ownership",
        });
      }

      // Prepare RMA data with dynamic fields
      const rmaData: RmaData = {
        purchaseDate: ownership.createdAt,
      };

      // Generate unsigned PDF
      const pdfBuffer = await generateUnsignedRmaPdf(rmaData);
      const base64Pdf = rmaPdfBufferToBase64(pdfBuffer);

      return {
        pdfBase64: base64Pdf,
        ownershipDetails: {
          unitName: ownership.unit!.name,
          percentage: (ownership.percentageOwned / 100).toFixed(2),
          purchasePrice: formatCurrency(ownership.purchasePrice),
          purchaseDate: ownership.createdAt.toISOString(),
        },
      };
    }),

  /**
   * Submit signed RMA with signature
   * Generates signed PDF, uploads to UploadThing, and updates database
   */
  submitSignedRma: investorProcedure
    .input(
      z.object({
        ownershipId: z.number().int().positive(),
        signatureDataUrl: z.string().startsWith("data:image/"),
        signerName: z.string().min(2).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership belongs to user
      const ownership = await ctx.db.query.ownerships.findFirst({
        where: eq(ownerships.id, input.ownershipId),
        with: {
          unit: {
            with: {
              collection: true,
            },
          },
          pricingTier: true,
          user: true,
        },
      });

      if (!ownership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ownership not found",
        });
      }

      if (ownership.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't own this ownership",
        });
      }

      // Ensure ownership has user and unit (not pending approval)
      if (!ownership.user || !ownership.unit) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ownership is pending approval",
        });
      }

      // Check if already signed
      if (ownership.isRmaSigned) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "RMA is already signed for this ownership",
        });
      }

      // Prepare RMA data with signature and dynamic fields
      const rmaData: RmaData &
        Required<
          Pick<RmaData, "ownerName" | "signatureDataUrl" | "signDate">
        > = {
        purchaseDate: ownership.createdAt,
        ownerName: input.signerName,
        signatureDataUrl: input.signatureDataUrl,
        signDate: new Date(),
      };

      // Generate signed PDF
      const signedPdfBuffer = await generateSignedRmaPdf(rmaData);

      // Upload to UploadThing
      const fileName = `rma_${ownership.id}_${ownership.unit!.name}_${Date.now()}.pdf`;

      const fileBlob = new Blob([signedPdfBuffer as BlobPart], { type: "application/pdf" });
      const file = new File([fileBlob], fileName, { type: "application/pdf" });

      const uploadedFile = await utapi.uploadFiles(file);

      console.log(
        "UploadThing RMA response:",
        JSON.stringify(uploadedFile, null, 2),
      );

      if (!uploadedFile.data) {
        console.error("RMA upload failed - full response:", uploadedFile);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload RMA document: ${uploadedFile.error?.message ?? "Unknown error"}`,
        });
      }

      // Update ownership record with RMA fields
      await ctx.db
        .update(ownerships)
        .set({
          rmaUrl: uploadedFile.data.url,
          isRmaSigned: true,
          rmaSignedAt: new Date(),
          rmaSignerName: input.signerName,
        })
        .where(eq(ownerships.id, input.ownershipId));

      // Send email notifications
      try {
        // Send confirmation email to owner
        await emailService.sendRmaSignedConfirmation({
          to: ownership.user.email!,
          userName: ownership.user.name ?? "Owner",
          unitName: ownership.unit!.name,
          rmaUrl: uploadedFile.data.url,
        });

        // Send notification email to admin
        await emailService.sendAdminRmaSignedNotification({
          ownerName: ownership.user.name ?? "Unknown",
          ownerEmail: ownership.user.email!,
          unitName: ownership.unit!.name,
          percentage: `${(ownership.percentageOwned / 100).toFixed(2)}%`,
          rmaUrl: uploadedFile.data.url,
          ownershipId: ownership.id,
        });
      } catch (emailError) {
        // Log error but don't fail the request
        console.error("Failed to send RMA signed emails:", emailError);
      }

      return {
        success: true,
        rmaUrl: uploadedFile.data.url,
        message: "RMA signed and uploaded successfully",
      };
    }),

  /**
   * Get RMA status for user's ownerships
   * Returns list of all ownerships with their RMA signing status
   */
  getMyRmaStatuses: investorProcedure.query(async ({ ctx }) => {
    const userOwnerships = await ctx.db.query.ownerships.findMany({
      where: eq(ownerships.userId, ctx.session.user.id),
      with: {
        unit: true,
      },
      orderBy: [desc(ownerships.createdAt)],
    });

    return userOwnerships.map((ownership) => ({
      ownershipId: ownership.id,
      unitName: ownership.unit!.name,
      percentageOwned: (ownership.percentageOwned / 100).toFixed(2),
      purchasePrice: formatCurrency(ownership.purchasePrice),
      purchaseDate: ownership.createdAt.toISOString(),
      isRmaSigned: ownership.isRmaSigned,
      rmaUrl: ownership.rmaUrl,
      rmaSignedAt: ownership.rmaSignedAt?.toISOString(),
      rmaSignerName: ownership.rmaSignerName,
    }));
  }),

  /**
   * Get specific RMA details
   * For viewing/downloading a specific RMA
   */
  getRmaByOwnership: investorProcedure
    .input(
      z.object({
        ownershipId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const ownership = await ctx.db.query.ownerships.findFirst({
        where: eq(ownerships.id, input.ownershipId),
        with: {
          unit: true,
        },
      });

      if (!ownership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ownership not found",
        });
      }

      if (ownership.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this RMA",
        });
      }

      return {
        ownershipId: ownership.id,
        unitName: ownership.unit!.name,
        isRmaSigned: ownership.isRmaSigned,
        rmaUrl: ownership.rmaUrl,
        rmaSignedAt: ownership.rmaSignedAt?.toISOString(),
        rmaSignerName: ownership.rmaSignerName,
      };
    }),
});
