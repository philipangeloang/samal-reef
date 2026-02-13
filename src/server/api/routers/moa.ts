/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { createTRPCRouter, investorProcedure } from "@/server/api/trpc";
import { ownerships } from "@/server/db/schema";
import {
  generateUnsignedMoaPdf,
  generateSignedMoaPdf,
  pdfBufferToBase64,
  type MoaData,
} from "@/server/services/moa-generator";
import {
  generateCertificatePdf,
  type CertificateData,
} from "@/server/services/certificate-generator";
import { UTApi } from "uploadthing/server";
import { emailService } from "@/server/email";
import { formatCurrency, formatCurrencyPdf } from "@/lib/currency";

// Initialize UploadThing API for server-side uploads
const utapi = new UTApi();

export const moaRouter = createTRPCRouter({
  /**
   * Generate unsigned MOA template for preview
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

      // Prepare MOA data with dynamic fields
      const moaData: MoaData = {
        ownershipPercentage: ownership.percentageOwned,
        purchasePrice: formatCurrencyPdf(ownership.purchasePrice),
        unitName: ownership.unit.name,
        purchaseDate: ownership.createdAt,
        location: ownership.unit.collection.location ?? "Property Location",
        // Dynamic fields from collection (nullable)
        address: ownership.unit.collection.address ?? undefined,
        city: ownership.unit.collection.city ?? undefined,
        country: ownership.unit.collection.country ?? undefined,
        construction: ownership.unit.collection.construction ?? undefined,
        manager: ownership.unit.collection.manager ?? undefined,
        managerPosition: ownership.unit.collection.managerPosition ?? undefined,
        monthlyFee: ownership.unit.collection.monthlyFee ?? undefined,
      };

      // Generate unsigned PDF
      const pdfBuffer = await generateUnsignedMoaPdf(moaData);
      const base64Pdf = pdfBufferToBase64(pdfBuffer);

      return {
        pdfBase64: base64Pdf,
        ownershipDetails: {
          unitName: ownership.unit.name,
          percentage: (ownership.percentageOwned / 100).toFixed(2),
          purchasePrice: moaData.purchasePrice,
          purchaseDate: ownership.createdAt.toISOString(),
        },
      };
    }),

  /**
   * Submit signed MOA with signature
   * Generates signed PDF, uploads to UploadThing, and updates database
   */
  submitSignedMoa: investorProcedure
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
      if (ownership.isSigned) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MOA is already signed for this ownership",
        });
      }

      // Prepare MOA data with signature and dynamic fields
      const moaData: MoaData &
        Required<
          Pick<MoaData, "investorName" | "signatureDataUrl" | "signDate">
        > = {
        ownershipPercentage: ownership.percentageOwned,
        purchasePrice: formatCurrencyPdf(ownership.purchasePrice),
        unitName: ownership.unit.name,
        purchaseDate: ownership.createdAt,
        location: ownership.unit.collection.location ?? "Property Location",
        // Dynamic fields from collection (nullable)
        address: ownership.unit.collection.address ?? undefined,
        city: ownership.unit.collection.city ?? undefined,
        country: ownership.unit.collection.country ?? undefined,
        construction: ownership.unit.collection.construction ?? undefined,
        manager: ownership.unit.collection.manager ?? undefined,
        managerPosition: ownership.unit.collection.managerPosition ?? undefined,
        monthlyFee: ownership.unit.collection.monthlyFee ?? undefined,
        // Signature data
        investorName: input.signerName,
        signatureDataUrl: input.signatureDataUrl,
        signDate: new Date(),
      };

      // Generate signed PDF
      const signedPdfBuffer = await generateSignedMoaPdf(moaData);

      // Upload to UploadThing
      const fileName = `moa_${ownership.id}_${ownership.unit.name}_${Date.now()}.pdf`;

      // Create File object for Node.js environment
      const fileBlob = new Blob([signedPdfBuffer], { type: "application/pdf" });
      const file = new File([fileBlob], fileName, { type: "application/pdf" });

      const uploadedFile = await utapi.uploadFiles(file);

      console.log(
        "UploadThing response:",
        JSON.stringify(uploadedFile, null, 2),
      );

      if (!uploadedFile.data) {
        console.error("Upload failed - full response:", uploadedFile);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload MOA document: ${uploadedFile.error?.message ?? "Unknown error"}`,
        });
      }

      // Update ownership record
      await ctx.db
        .update(ownerships)
        .set({
          moaUrl: uploadedFile.data.url,
          isSigned: true,
          moaSignedAt: new Date(),
          signerName: input.signerName,
        })
        .where(eq(ownerships.id, input.ownershipId));

      // Generate and upload Certificate of Ownership
      let certificateUrl: string | null = null;
      try {
        const certificateData: CertificateData = {
          clientName: input.signerName,
          collectionName: ownership.unit.collection.name,
          unitName: ownership.unit.name,
          percentageOwned: ownership.percentageOwned,
          purchaseDate: ownership.createdAt,
          location: ownership.unit.collection.location ?? "Property Location",
          // Dynamic fields from collection (nullable)
          address: ownership.unit.collection.address ?? undefined,
          city: ownership.unit.collection.city ?? undefined,
          country: ownership.unit.collection.country ?? undefined,
          manager: ownership.unit.collection.manager ?? undefined,
          managerPosition:
            ownership.unit.collection.managerPosition ?? undefined,
        };

        // Generate certificate PDF
        const certificatePdfBuffer =
          await generateCertificatePdf(certificateData);

        // Upload certificate to UploadThing
        const certificateFileName = `certificate_${ownership.id}_${ownership.unit.name}_${Date.now()}.pdf`;

        // Create File object for Node.js environment
        const certificateBlob = new Blob([certificatePdfBuffer], {
          type: "application/pdf",
        });
        const certificateFile = new File(
          [certificateBlob],
          certificateFileName,
          { type: "application/pdf" },
        );

        const uploadedCertificate = await utapi.uploadFiles(certificateFile);

        if (uploadedCertificate.data) {
          certificateUrl = uploadedCertificate.data.url;

          // Update ownership with certificate info
          await ctx.db
            .update(ownerships)
            .set({
              certificateUrl: certificateUrl,
              certificateGeneratedAt: new Date(),
            })
            .where(eq(ownerships.id, input.ownershipId));
        }
      } catch (certificateError) {
        // Log error but don't fail the MOA signing process
        console.error("Failed to generate certificate:", certificateError);
      }

      // Send email notifications
      try {
        // Send confirmation email to investor
        await emailService.sendMoaSignedConfirmation({
          to: ownership.user.email!,
          userName: ownership.user.name ?? "Investor",
          unitName: ownership.unit.name,
          moaUrl: uploadedFile.data.url,
        });

        // Send notification email to admin
        await emailService.sendAdminMoaSignedNotification({
          investorName: ownership.user.name ?? "Unknown",
          investorEmail: ownership.user.email!,
          unitName: ownership.unit.name,
          percentage: `${(ownership.percentageOwned / 100).toFixed(2)}%`,
          moaUrl: uploadedFile.data.url,
          ownershipId: ownership.id,
        });
      } catch (emailError) {
        // Log error but don't fail the request
        console.error("Failed to send MOA signed emails:", emailError);
      }

      return {
        success: true,
        moaUrl: uploadedFile.data.url,
        certificateUrl,
        message: "MOA signed and uploaded successfully",
      };
    }),

  /**
   * Get MOA status for user's ownerships
   * Returns list of all ownerships with their MOA signing status
   */
  getMyMoaStatuses: investorProcedure.query(async ({ ctx }) => {
    const userOwnerships = await ctx.db.query.ownerships.findMany({
      where: eq(ownerships.userId, ctx.session.user.id),
      with: {
        unit: true,
      },
      orderBy: [desc(ownerships.createdAt)],
    });

    return userOwnerships.map((ownership) => ({
      ownershipId: ownership.id,
      unitName: ownership.unit.name,
      percentageOwned: (ownership.percentageOwned / 100).toFixed(2),
      purchasePrice: formatCurrency(ownership.purchasePrice),
      purchaseDate: ownership.createdAt.toISOString(),
      isSigned: ownership.isSigned,
      moaUrl: ownership.moaUrl,
      moaSignedAt: ownership.moaSignedAt?.toISOString(),
      signerName: ownership.signerName,
    }));
  }),

  /**
   * Get specific MOA details
   * For viewing/downloading a specific MOA
   */
  getMoaByOwnership: investorProcedure
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
          message: "You don't have access to this MOA",
        });
      }

      return {
        ownershipId: ownership.id,
        unitName: ownership.unit.name,
        isSigned: ownership.isSigned,
        moaUrl: ownership.moaUrl,
        moaSignedAt: ownership.moaSignedAt?.toISOString(),
        signerName: ownership.signerName,
      };
    }),
});
