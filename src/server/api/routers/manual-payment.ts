/**
 * Manual Payment Router
 *
 * Handles manual payment methods (GCash, Maya, Bank Transfer, etc.)
 *
 * Flow:
 * 1. User selects manual payment method → generates reference code (client-side)
 * 2. User sees payment instructions
 * 3. User pays externally and uploads proof → creates payment record (IN_REVIEW)
 * 4. Admin reviews and approves/rejects
 * 5. On approval → triggers same flow as Stripe/DePay (unit assignment, etc.)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import {
  payments,
  manualPaymentMethods,
  affiliateLinks,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  processSuccessfulPayment,
  getAffiliateLinkId,
} from "@/server/services/payment-processor";
import { emailService } from "@/server/email";
import { currencyCode } from "@/lib/currency";

/**
 * Generate a unique reference code for manual payments
 * Format: PR-{YEAR}-{RANDOM6}
 * Example: PR-2024-A7K9X2
 */
function generateReferenceCode(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars (0, O, 1, I)
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PR-${year}-${random}`;
}

export const manualPaymentRouter = createTRPCRouter({
  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Get all active manual payment methods
   * Used to display payment options in the UI
   */
  getMethods: publicProcedure.query(async ({ ctx }) => {
    const methods = await ctx.db.query.manualPaymentMethods.findMany({
      where: (methods, { eq }) => eq(methods.isActive, true),
      orderBy: (methods, { asc }) => [asc(methods.sortOrder)],
    });

    return methods.map((method) => ({
      id: method.id,
      name: method.name,
      instructions: method.instructions,
      accountNumber: method.accountNumber,
      accountName: method.accountName,
      qrCodeUrl: method.qrCodeUrl,
    }));
  }),

  // ============================================
  // PROTECTED ENDPOINTS (LOGGED IN USERS)
  // ============================================

  /**
   * Initiate a manual payment
   * Creates the reference code and validates the purchase
   * Does NOT create a payment record yet - that happens on proof submission
   */
  initiate: protectedProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        pricingTierId: z.number().int().positive(),
        manualPaymentMethodId: z.string().min(1),
        affiliateCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Validate collection exists and is active
      const collection = await ctx.db.query.propertyCollections.findFirst({
        where: (collections, { eq }) => eq(collections.id, input.collectionId),
      });

      if (!collection || !collection.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property collection not found or not available",
        });
      }

      // 2. Validate pricing tier
      const pricingTier = await ctx.db.query.pricingTiers.findFirst({
        where: (tiers, { eq, and }) =>
          and(
            eq(tiers.id, input.pricingTierId),
            eq(tiers.collectionId, input.collectionId),
            eq(tiers.isActive, true),
          ),
      });

      if (!pricingTier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing tier not found or not active",
        });
      }

      // 3. Validate manual payment method exists
      const paymentMethod = await ctx.db.query.manualPaymentMethods.findFirst({
        where: (methods, { eq, and }) =>
          and(
            eq(methods.id, input.manualPaymentMethodId),
            eq(methods.isActive, true),
          ),
      });

      if (!paymentMethod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment method not found or not active",
        });
      }

      // 4. Validate affiliate code if provided
      let affiliateLinkId: number | null = null;
      if (input.affiliateCode) {
        affiliateLinkId = await getAffiliateLinkId(input.affiliateCode);
        if (!affiliateLinkId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid affiliate code",
          });
        }
      }

      // 5. Generate reference code
      const referenceCode = generateReferenceCode();

      // 6. Return payment details (no database record yet)
      return {
        referenceCode,
        collectionId: input.collectionId,
        collectionName: collection.name,
        pricingTierId: input.pricingTierId,
        percentage: pricingTier.displayLabel,
        percentageBasisPoints: pricingTier.percentage,
        // Use fiat price for manual payments
        amountDue: pricingTier.fiatPrice,
        currency: currencyCode,
        paymentMethod: {
          id: paymentMethod.id,
          name: paymentMethod.name,
          instructions: paymentMethod.instructions,
          accountNumber: paymentMethod.accountNumber,
          accountName: paymentMethod.accountName,
          qrCodeUrl: paymentMethod.qrCodeUrl,
        },
        affiliateLinkId,
      };
    }),

  /**
   * Submit proof of payment
   * This creates the actual payment record with IN_REVIEW status
   */
  submitProof: protectedProcedure
    .input(
      z.object({
        referenceCode: z.string().min(1),
        collectionId: z.number().int().positive(),
        pricingTierId: z.number().int().positive(),
        percentageToBuy: z.number().int().positive(),
        manualPaymentMethodId: z.string().min(1),
        proofImageUrl: z.string().url(),
        amountPaid: z.string(),
        currency: z.string().default(currencyCode),
        affiliateLinkId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // 1. Check if reference code already used
      const existingPayment = await ctx.db.query.payments.findFirst({
        where: (payments, { eq }) => eq(payments.externalId, input.referenceCode),
      });

      if (existingPayment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This reference code has already been used",
        });
      }

      // 2. Check user doesn't have too many pending submissions (anti-spam)
      const pendingCount = await ctx.db.query.payments.findMany({
        where: (payments, { eq, and }) =>
          and(
            eq(payments.userId, userId),
            eq(payments.provider, "MANUAL"),
            eq(payments.status, "IN_REVIEW"),
          ),
      });

      if (pendingCount.length >= 3) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "You have too many pending submissions. Please wait for admin review.",
        });
      }

      // 3. Create payment record with IN_REVIEW status
      const [payment] = await ctx.db
        .insert(payments)
        .values({
          provider: "MANUAL",
          externalId: input.referenceCode,
          userId,
          amount: input.amountPaid,
          currency: input.currency,
          status: "IN_REVIEW",
          collectionId: input.collectionId,
          pricingTierId: input.pricingTierId,
          percentageToBuy: input.percentageToBuy,
          affiliateLinkId: input.affiliateLinkId ?? null,
          manualPaymentMethodId: input.manualPaymentMethodId,
          proofImageUrl: input.proofImageUrl,
        })
        .returning();

      if (!payment) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payment record",
        });
      }

      // 4. Get additional info for email
      const [user, collection, pricingTier, paymentMethod] = await Promise.all([
        ctx.db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, userId),
        }),
        ctx.db.query.propertyCollections.findFirst({
          where: (collections, { eq }) => eq(collections.id, input.collectionId),
        }),
        ctx.db.query.pricingTiers.findFirst({
          where: (tiers, { eq }) => eq(tiers.id, input.pricingTierId),
        }),
        ctx.db.query.manualPaymentMethods.findFirst({
          where: (methods, { eq }) => eq(methods.id, input.manualPaymentMethodId),
        }),
      ]);

      // 5. Send "under review" email to user
      if (user?.email) {
        try {
          await emailService.sendManualPaymentUnderReview({
            to: user.email,
            userName: user.name ?? user.email.split("@")[0] ?? "Owner",
            referenceCode: input.referenceCode,
            collectionName: collection?.name ?? "Property",
            percentage: pricingTier?.displayLabel ?? `${input.percentageToBuy / 100}%`,
            amount: input.amountPaid,
            paymentMethod: paymentMethod?.name ?? "Manual Payment",
          });
          console.log(
            `📧 Manual payment under review email sent: ${input.referenceCode} to ${user.email}`,
          );
        } catch (error) {
          console.error("Failed to send proof submission email:", error);
          // Don't throw - email failure shouldn't block the submission
        }
      }

      return {
        paymentId: payment.id,
        referenceCode: input.referenceCode,
        status: "IN_REVIEW",
        message: "Your proof of payment has been submitted and is under review.",
      };
    }),

  /**
   * Get user's manual payment submissions
   */
  getMySubmissions: protectedProcedure.query(async ({ ctx }) => {
    const submissions = await ctx.db.query.payments.findMany({
      where: (payments, { eq, and }) =>
        and(
          eq(payments.userId, ctx.session.user.id),
          eq(payments.provider, "MANUAL"),
        ),
      with: {
        collection: {
          columns: { id: true, name: true },
        },
        pricingTier: {
          columns: { id: true, displayLabel: true, percentage: true },
        },
        manualPaymentMethod: {
          columns: { id: true, name: true },
        },
      },
      orderBy: [desc(payments.createdAt)],
    });

    return submissions.map((submission) => ({
      id: submission.id,
      referenceCode: submission.externalId,
      status: submission.status,
      amount: submission.amount,
      currency: submission.currency,
      proofImageUrl: submission.proofImageUrl,
      collection: submission.collection,
      pricingTier: submission.pricingTier,
      paymentMethod: submission.manualPaymentMethod,
      rejectionReason: submission.rejectionReason,
      createdAt: submission.createdAt,
      reviewedAt: submission.reviewedAt,
    }));
  }),

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get all pending manual payment submissions for review
   */
  getPendingReviews: adminProcedure.query(async ({ ctx }) => {
    const pendingPayments = await ctx.db.query.payments.findMany({
      where: (payments, { eq, and }) =>
        and(eq(payments.provider, "MANUAL"), eq(payments.status, "IN_REVIEW")),
      with: {
        user: {
          columns: { id: true, name: true, email: true },
        },
        collection: {
          columns: { id: true, name: true },
        },
        pricingTier: {
          columns: { id: true, displayLabel: true, percentage: true, fiatPrice: true },
        },
        manualPaymentMethod: {
          columns: { id: true, name: true },
        },
      },
      orderBy: [desc(payments.createdAt)],
    });

    return pendingPayments.map((payment) => ({
      id: payment.id,
      referenceCode: payment.externalId,
      user: payment.user,
      amount: payment.amount,
      currency: payment.currency,
      expectedAmount: payment.pricingTier?.fiatPrice,
      proofImageUrl: payment.proofImageUrl,
      collection: payment.collection,
      pricingTier: payment.pricingTier,
      paymentMethod: payment.manualPaymentMethod,
      createdAt: payment.createdAt,
    }));
  }),

  /**
   * Approve a manual payment
   * Triggers the same flow as Stripe/DePay webhooks
   */
  approve: adminProcedure
    .input(
      z.object({
        paymentId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Get payment record
      const payment = await ctx.db.query.payments.findFirst({
        where: (payments, { eq }) => eq(payments.id, input.paymentId),
        with: {
          pricingTier: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      if (payment.status !== "IN_REVIEW") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot approve payment with status: ${payment.status}`,
        });
      }

      if (!payment.userId || !payment.collectionId || !payment.pricingTierId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment is missing required fields",
        });
      }

      // 2. Update payment status to SUCCESS
      await ctx.db
        .update(payments)
        .set({
          status: "SUCCESS",
          reviewedAt: new Date(),
          reviewedBy: ctx.session.user.id,
        })
        .where(eq(payments.id, input.paymentId));

      // 3. Process the payment (same as Stripe/DePay)
      const result = await processSuccessfulPayment({
        paymentId: payment.id,
        userId: payment.userId,
        collectionId: payment.collectionId,
        pricingTierId: payment.pricingTierId,
        percentageToBuy: payment.percentageToBuy ?? payment.pricingTier?.percentage ?? 0,
        amountPaid: payment.amount,
        currency: payment.currency,
        paymentMethod: "MANUAL",
        affiliateLinkId: payment.affiliateLinkId,
        isNewUser: false, // Manual payments require login, so never new user
      });

      if (!result.success) {
        // Revert status if processing failed
        await ctx.db
          .update(payments)
          .set({
            status: "IN_REVIEW",
            reviewedAt: null,
            reviewedBy: null,
          })
          .where(eq(payments.id, input.paymentId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to process payment",
        });
      }

      return {
        success: true,
        ownershipId: result.ownershipId,
        unitName: result.unitName,
        message: `Payment approved. Unit ${result.unitName} assigned.`,
      };
    }),

  /**
   * Reject a manual payment
   */
  reject: adminProcedure
    .input(
      z.object({
        paymentId: z.number().int().positive(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Get payment record
      const payment = await ctx.db.query.payments.findFirst({
        where: (payments, { eq }) => eq(payments.id, input.paymentId),
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      if (payment.status !== "IN_REVIEW") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reject payment with status: ${payment.status}`,
        });
      }

      // 2. Update payment status to FAILED
      await ctx.db
        .update(payments)
        .set({
          status: "FAILED",
          reviewedAt: new Date(),
          reviewedBy: ctx.session.user.id,
          rejectionReason: input.reason,
        })
        .where(eq(payments.id, input.paymentId));

      // 3. Send rejection email to user (optional)
      if (payment.user?.email) {
        console.log(
          `📧 Manual payment rejected: ${payment.externalId} - Reason: ${input.reason}`,
        );
        // TODO: Send rejection email with reason
      }

      return {
        success: true,
        message: "Payment rejected",
      };
    }),

  /**
   * Delete a spam/troll payment permanently
   * Only for payments that are clearly fraudulent
   */
  deletePayment: adminProcedure
    .input(
      z.object({
        paymentId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.query.payments.findFirst({
        where: (payments, { eq }) => eq(payments.id, input.paymentId),
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      // Only allow deleting manual payments
      if (payment.provider !== "MANUAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only delete manual payments",
        });
      }

      // Don't allow deleting approved payments (they have associated ownerships)
      if (payment.status === "SUCCESS") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete approved payments",
        });
      }

      // Permanently delete the payment record
      await ctx.db.delete(payments).where(eq(payments.id, input.paymentId));

      console.log(
        `🗑️ Manual payment deleted by admin: ${payment.externalId} (ID: ${payment.id})`,
      );

      return {
        success: true,
        message: "Payment deleted permanently",
      };
    }),

  /**
   * Resubmit proof for a rejected payment
   * Allows users to upload a new proof and retry
   */
  resubmit: protectedProcedure
    .input(
      z.object({
        paymentId: z.number().int().positive(),
        proofImageUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // 1. Get the payment and verify ownership
      const payment = await ctx.db.query.payments.findFirst({
        where: (payments, { eq, and }) =>
          and(
            eq(payments.id, input.paymentId),
            eq(payments.userId, userId),
          ),
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      // 2. Only allow resubmission for FAILED (rejected) payments
      if (payment.status !== "FAILED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only resubmit rejected payments",
        });
      }

      // 3. Update the payment with new proof and reset to IN_REVIEW
      await ctx.db
        .update(payments)
        .set({
          proofImageUrl: input.proofImageUrl,
          status: "IN_REVIEW",
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
        })
        .where(eq(payments.id, input.paymentId));

      console.log(
        `🔄 Manual payment resubmitted: ${payment.externalId} by user ${userId}`,
      );

      return {
        success: true,
        message: "Payment resubmitted for review",
      };
    }),

  // ============================================
  // ADMIN: MANAGE PAYMENT METHODS
  // ============================================

  /**
   * Get all payment methods (including inactive) for admin management
   */
  getAllMethods: adminProcedure.query(async ({ ctx }) => {
    const methods = await ctx.db.query.manualPaymentMethods.findMany({
      orderBy: (methods, { asc }) => [asc(methods.sortOrder)],
    });

    return methods;
  }),

  /**
   * Create a new manual payment method
   */
  createMethod: adminProcedure
    .input(
      z.object({
        id: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-z0-9_-]+$/, "ID must be lowercase alphanumeric with dashes/underscores"),
        name: z.string().min(1).max(100),
        instructions: z.string().min(1),
        accountNumber: z.string().max(100).optional(),
        accountName: z.string().max(200).optional(),
        qrCodeUrl: z.string().url().optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if ID already exists
      const existing = await ctx.db.query.manualPaymentMethods.findFirst({
        where: (methods, { eq }) => eq(methods.id, input.id),
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A payment method with this ID already exists",
        });
      }

      const [method] = await ctx.db
        .insert(manualPaymentMethods)
        .values({
          id: input.id,
          name: input.name,
          instructions: input.instructions,
          accountNumber: input.accountNumber,
          accountName: input.accountName,
          qrCodeUrl: input.qrCodeUrl,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
        })
        .returning();

      return method;
    }),

  /**
   * Update a manual payment method
   */
  updateMethod: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(100).optional(),
        instructions: z.string().min(1).optional(),
        accountNumber: z.string().max(100).optional().nullable(),
        accountName: z.string().max(200).optional().nullable(),
        qrCodeUrl: z.string().url().optional().nullable(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Filter out undefined values
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined),
      );

      if (Object.keys(filteredUpdates).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No updates provided",
        });
      }

      const [method] = await ctx.db
        .update(manualPaymentMethods)
        .set(filteredUpdates)
        .where(eq(manualPaymentMethods.id, id))
        .returning();

      if (!method) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment method not found",
        });
      }

      return method;
    }),
});
