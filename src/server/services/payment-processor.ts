/**
 * Shared Payment Processing Service
 *
 * This module contains the common logic that runs after any payment is confirmed.
 * Used by:
 * - Stripe webhook (after payment confirmed)
 * - DePay callback (after blockchain confirmation)
 * - Admin approval (after manual payment is approved)
 *
 * The flow is the same regardless of payment method:
 * 1. Find available unit (sequential allocation)
 * 2. Create ownership record
 * 3. Handle affiliate commission
 * 4. Update user profile (role, investor profile)
 * 5. Send confirmation emails
 */

import "server-only";
import { db } from "@/server/db";
import {
  ownerships,
  affiliateTransactions,
  affiliateProfiles,
  affiliateLinks,
  users,
  investorProfiles,
} from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { emailService } from "@/server/email";
import { findAvailableUnit } from "@/lib/allocation";

// Helper to delay execution (for rate limiting email sends)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ProcessPaymentInput {
  paymentId: number;
  userId: string;
  collectionId: number;
  pricingTierId: number;
  percentageToBuy: number;
  amountPaid: string;
  currency: string;
  paymentMethod: "FIAT" | "CRYPTO" | "MANUAL";
  affiliateLinkId: number | null;
  isNewUser?: boolean;
}

export interface ProcessPaymentResult {
  success: boolean;
  ownershipId?: number;
  unitId?: number;
  unitName?: string;
  error?: string;
}

/**
 * Process a successful payment - creates ownership and handles all post-payment logic
 *
 * This function is idempotent - if an ownership already exists for this payment,
 * it will return the existing ownership without creating a duplicate.
 */
export async function processSuccessfulPayment(
  input: ProcessPaymentInput,
): Promise<ProcessPaymentResult> {
  try {
    // 0. Check if ownership already exists for this payment (idempotency)
    const existingOwnership = await db.query.ownerships.findFirst({
      where: (ownerships, { eq }) => eq(ownerships.paymentId, input.paymentId),
      with: { unit: true },
    });

    if (existingOwnership) {
      console.log(`Ownership already exists for payment ${input.paymentId}`);
      return {
        success: true,
        ownershipId: existingOwnership.id,
        unitId: existingOwnership.unitId,
        unitName: existingOwnership.unit.name,
      };
    }

    // 1. Get pricing tier info
    const pricingTier = await db.query.pricingTiers.findFirst({
      where: (tiers, { eq }) => eq(tiers.id, input.pricingTierId),
    });

    if (!pricingTier) {
      return { success: false, error: "Pricing tier not found" };
    }

    // 2. Find available unit (sequential allocation)
    const unitId = await findAvailableUnit(
      input.collectionId,
      pricingTier.percentage,
    );

    if (!unitId) {
      return {
        success: false,
        error: `No available units in collection for ${pricingTier.percentage} basis points`,
      };
    }

    // 3. Get unit with collection details for emails
    const unit = await db.query.units.findFirst({
      where: (units, { eq }) => eq(units.id, unitId),
      with: { collection: true },
    });

    if (!unit) {
      return { success: false, error: "Unit not found" };
    }

    // 4. Create ownership record
    const [ownership] = await db
      .insert(ownerships)
      .values({
        unitId,
        userId: input.userId,
        pricingTierId: input.pricingTierId,
        percentageOwned: pricingTier.percentage,
        purchasePrice: input.amountPaid,
        paymentMethod: input.paymentMethod,
        currency: input.currency,
        affiliateLinkId: input.affiliateLinkId,
        paymentId: input.paymentId,
      })
      .returning();

    if (!ownership) {
      return { success: false, error: "Failed to create ownership record" };
    }

    // 5. Handle affiliate commission if applicable
    if (input.affiliateLinkId) {
      await handleAffiliateCommission(
        input.affiliateLinkId,
        ownership.id,
        pricingTier.fiatPrice, // Commission always based on fiat price
        unit.collection.name,
        pricingTier.percentage,
      );
    }

    // 6. Handle user profile updates
    await handleUserProfileUpdate(
      input.userId,
      input.amountPaid,
      input.isNewUser ?? false,
    );

    // 7. Send emails
    await sendPurchaseEmails(
      input.userId,
      unit,
      pricingTier,
      input.amountPaid,
      input.paymentMethod,
      ownership.id,
      input.isNewUser ?? false,
    );

    console.log(
      `✅ Payment processed: Unit ${unit.name} assigned to user ${input.userId}`,
    );

    return {
      success: true,
      ownershipId: ownership.id,
      unitId: unit.id,
      unitName: unit.name,
    };
  } catch (error) {
    console.error("Payment processing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle affiliate commission creation and profile updates
 */
async function handleAffiliateCommission(
  affiliateLinkId: number,
  ownershipId: number,
  fiatPrice: string,
  collectionName: string,
  percentage: number,
): Promise<void> {
  const affiliateLink = await db.query.affiliateLinks.findFirst({
    where: (links, { eq }) => eq(links.id, affiliateLinkId),
  });

  if (!affiliateLink) return;

  // Commission is ALWAYS calculated from fiatPrice
  const commissionAmount =
    (parseFloat(fiatPrice) * parseFloat(affiliateLink.commissionRate)) / 100;

  await db.insert(affiliateTransactions).values({
    affiliateLinkId,
    ownershipId,
    commissionAmount: commissionAmount.toFixed(2),
    commissionRate: affiliateLink.commissionRate,
    isPaid: false,
  });

  // Update affiliate total earned
  await db
    .update(affiliateProfiles)
    .set({
      totalEarned: sql`${affiliateProfiles.totalEarned} + ${commissionAmount}`,
    })
    .where(eq(affiliateProfiles.userId, affiliateLink.affiliateUserId));

  // Update affiliate link conversion count
  await db
    .update(affiliateLinks)
    .set({
      conversionCount: sql`${affiliateLinks.conversionCount} + 1`,
    })
    .where(eq(affiliateLinks.id, affiliateLinkId));

  // Send commission earned email to affiliate
  const affiliateUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, affiliateLink.affiliateUserId),
  });

  if (affiliateUser?.email) {
    try {
      await emailService.sendCommissionEarned({
        to: affiliateUser.email,
        userName:
          affiliateUser.name ??
          affiliateUser.email.split("@")[0] ??
          "Affiliate",
        commissionAmount: commissionAmount.toFixed(2),
        unitName: collectionName,
        percentage: `${(percentage / 100).toFixed(2)}%`,
      });
      await delay(600); // Rate limiting
    } catch (emailError) {
      console.error("Failed to send commission earned email:", emailError);
    }
  }
}

/**
 * Handle user profile creation/updates after purchase
 */
async function handleUserProfileUpdate(
  userId: string,
  amountPaid: string,
  isNewUser: boolean,
): Promise<void> {
  // Check if this is user's first purchase
  const userOwnerships = await db.query.ownerships.findMany({
    where: (ownerships, { eq }) => eq(ownerships.userId, userId),
  });

  const isFirstPurchase = userOwnerships.length === 1; // Just created one

  if (isFirstPurchase) {
    // For existing users (not new guest users), update role if VISITOR
    if (!isNewUser) {
      const currentUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId),
      });

      if (currentUser?.role === "VISITOR") {
        await db
          .update(users)
          .set({ role: "INVESTOR" })
          .where(eq(users.id, userId));
      }
    }

    // Create investor profile
    await db.insert(investorProfiles).values({
      userId,
      totalInvested: amountPaid,
      totalUnitsOwned: 1,
    });
  } else {
    // Update existing investor profile
    const amountNum = parseFloat(amountPaid);
    await db
      .update(investorProfiles)
      .set({
        totalInvested: sql`${investorProfiles.totalInvested} + ${amountNum}`,
        totalUnitsOwned: sql`${investorProfiles.totalUnitsOwned} + 1`,
      })
      .where(eq(investorProfiles.userId, userId));
  }
}

/**
 * Send purchase confirmation and related emails
 */
async function sendPurchaseEmails(
  userId: string,
  unit: { name: string; collection: { name: string } },
  pricingTier: { displayLabel: string; percentage: number },
  amountPaid: string,
  paymentMethod: "FIAT" | "CRYPTO" | "MANUAL",
  ownershipId: number,
  isNewUser: boolean,
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId),
  });

  if (!user?.email) return;

  // Determine payment method display name
  const paymentMethodDisplay =
    paymentMethod === "FIAT"
      ? "Credit/Debit Card"
      : paymentMethod === "CRYPTO"
        ? "Cryptocurrency"
        : "Manual Payment";

  // Send purchase confirmation email
  try {
    await emailService.sendPurchaseConfirmation({
      to: user.email,
      userName: user.name ?? "Investor",
      unitName: unit.name,
      percentage: pricingTier.displayLabel,
      amount: amountPaid,
      paymentMethod: paymentMethodDisplay,
    });
    await delay(600);
  } catch (emailError) {
    console.error("Failed to send purchase confirmation email:", emailError);
  }

  // Send MOA ready email
  try {
    await emailService.sendMoaReadyEmail({
      to: user.email,
      userName: user.name ?? "Investor",
      unitName: unit.name,
      percentage: pricingTier.displayLabel,
      ownershipId,
    });
    await delay(600);
  } catch (emailError) {
    console.error("Failed to send MOA ready email:", emailError);
  }

  // Check if this is user's first purchase
  const userOwnerships = await db.query.ownerships.findMany({
    where: (ownerships, { eq }) => eq(ownerships.userId, userId),
  });

  const isFirstPurchase = userOwnerships.length === 1;

  if (isFirstPurchase) {
    try {
      if (isNewUser) {
        await emailService.sendGuestPurchaseWelcome({
          to: user.email,
          unitName: unit.name,
          percentage: pricingTier.displayLabel,
          amount: amountPaid,
        });
      } else {
        await emailService.sendInvestorWelcome({
          to: user.email,
          userName: user.name ?? "Investor",
        });
      }
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }
  }
}

/**
 * Get or create user for guest checkout
 * Returns userId and whether it's a new user
 */
export async function getOrCreateUser(
  email: string,
): Promise<{ userId: string; isNewUser: boolean }> {
  // Check if user with this email already exists
  const existingUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (existingUser) {
    return { userId: existingUser.id, isNewUser: false };
  }

  // Create new user account
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      emailVerified: new Date(), // Auto-verify since they completed payment
      role: "INVESTOR", // Start as INVESTOR (skip VISITOR)
    })
    .returning();

  if (!newUser) {
    throw new Error("Failed to create user account");
  }

  return { userId: newUser.id, isNewUser: true };
}

/**
 * Get affiliate link ID from code
 */
export async function getAffiliateLinkId(
  affiliateCode: string | undefined,
): Promise<number | null> {
  if (!affiliateCode) return null;

  const affiliateLink = await db.query.affiliateLinks.findFirst({
    where: (links, { eq }) => eq(links.code, affiliateCode),
  });

  return affiliateLink?.id ?? null;
}
