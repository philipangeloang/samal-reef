/**
 * Stripe Webhook Handler
 *
 * This endpoint receives webhook events from Stripe when payments are completed.
 * It processes the payment and creates ownership/booking records in the database.
 *
 * Webhook Events Handled:
 * - checkout.session.completed
 * - checkout.session.async_payment_succeeded
 *
 * Payment Types (determined by metadata.type):
 * - OWNERSHIP: Fractional ownership purchase (default)
 * - BOOKING: Resort stay booking
 *
 * Uses shared payment processor for consistency with DePay and Manual payments.
 */

import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyWebhookSignature } from "@/lib/stripe";
import { db } from "@/server/db";
import { payments, bookings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  processSuccessfulPayment,
  getOrCreateUser,
  getAffiliateLinkId,
} from "@/server/services/payment-processor";
import { processBookingPayment } from "@/server/services/booking-processor";
import { currencyCode } from "@/lib/currency";

export async function POST(req: NextRequest) {
  try {
    // Get the raw body as text
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("No Stripe signature found");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify the webhook signature
    let event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        const paymentType = session.metadata?.type ?? "OWNERSHIP";

        // Route based on payment type
        if (paymentType === "BOOKING") {
          return await handleBookingPayment(session);
        } else {
          return await handleOwnershipPayment(session);
        }
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

/**
 * Handle ownership payment (fractional ownership purchase)
 */
async function handleOwnershipPayment(session: {
  id: string;
  amount_total?: number | null;
  metadata?: Record<string, string> | null;
}) {
  // Extract metadata (collection-based purchasing)
  const collectionId = parseInt(session.metadata?.collectionId ?? "0");
  const pricingTierId = parseInt(session.metadata?.pricingTierId ?? "0");
  const email = session.metadata?.email ?? "";
  const userIdFromMetadata = session.metadata?.userId ?? "";
  const affiliateCode = session.metadata?.affiliateCode ?? "";
  const amountPaid = (session.amount_total ?? 0) / 100; // Convert cents to dollars

  if (!collectionId || !pricingTierId || !email) {
    console.error("Missing required metadata in webhook");
    return NextResponse.json(
      { error: "Missing metadata" },
      { status: 400 },
    );
  }

  // 1. Check if payment already processed (idempotency)
  const existingPayment = await db.query.payments.findFirst({
    where: (payments, { eq }) => eq(payments.externalId, session.id),
  });

  if (existingPayment) {
    console.log(`Payment ${session.id} already processed, returning success`);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // 2. Get or create user for guest checkout
  let userId = userIdFromMetadata;
  let isNewUser = false;

  if (!userId) {
    const userResult = await getOrCreateUser(email);
    userId = userResult.userId;
    isNewUser = userResult.isNewUser;
    console.log(
      isNewUser
        ? `Created new user account ${userId} for guest purchase`
        : `Guest email matches existing user ${userId}, merging ownership`,
    );
  }

  // 3. Get affiliate link ID
  const affiliateLinkId = await getAffiliateLinkId(affiliateCode);

  // 4. Get pricing tier to get percentage
  const pricingTier = await db.query.pricingTiers.findFirst({
    where: (tiers, { eq }) => eq(tiers.id, pricingTierId),
  });

  if (!pricingTier) {
    console.error("Pricing tier not found:", pricingTierId);
    return NextResponse.json(
      { error: "Pricing tier not found" },
      { status: 400 },
    );
  }

  // 5. Create payment record with SUCCESS status
  const [paymentRecord] = await db
    .insert(payments)
    .values({
      provider: "STRIPE",
      externalId: session.id,
      userId,
      amount: amountPaid.toFixed(2),
      currency: currencyCode,
      status: "SUCCESS",
      collectionId,
      pricingTierId,
      percentageToBuy: pricingTier.percentage,
      affiliateLinkId,
      metadata: session.metadata,
      webhookProcessedAt: new Date(),
    })
    .returning();

  if (!paymentRecord) {
    console.error("Failed to create payment record");
    return NextResponse.json(
      { error: "Failed to create payment record" },
      { status: 500 },
    );
  }

  // 6. Process the payment using shared processor
  const result = await processSuccessfulPayment({
    paymentId: paymentRecord.id,
    userId,
    collectionId,
    pricingTierId,
    percentageToBuy: pricingTier.percentage,
    amountPaid: amountPaid.toFixed(2),
    currency: currencyCode,
    paymentMethod: "FIAT",
    affiliateLinkId,
    isNewUser,
  });

  if (!result.success) {
    console.error("Payment processing failed:", result.error);
    return NextResponse.json(
      { error: result.error ?? "Payment processing failed" },
      { status: 500 },
    );
  }

  console.log(
    `✅ Stripe ownership payment processed: Unit ${result.unitName} assigned to user ${userId}`,
  );

  return NextResponse.json({ received: true });
}

/**
 * Handle booking payment (resort stay)
 */
async function handleBookingPayment(session: {
  id: string;
  amount_total?: number | null;
  metadata?: Record<string, string> | null;
}) {
  const bookingId = parseInt(session.metadata?.bookingId ?? "0");
  const email = session.metadata?.email ?? "";
  const amountPaid = (session.amount_total ?? 0) / 100;

  if (!bookingId) {
    console.error("Missing bookingId in booking payment metadata");
    return NextResponse.json(
      { error: "Missing bookingId" },
      { status: 400 },
    );
  }

  // 1. Check if payment already processed (idempotency)
  const existingPayment = await db.query.payments.findFirst({
    where: (payments, { eq }) => eq(payments.externalId, session.id),
  });

  if (existingPayment) {
    console.log(`Booking payment ${session.id} already processed`);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // 2. Create payment record
  const [paymentRecord] = await db
    .insert(payments)
    .values({
      provider: "STRIPE",
      externalId: session.id,
      userId: session.metadata?.userId ?? null,
      amount: amountPaid.toFixed(2),
      currency: currencyCode,
      status: "SUCCESS",
      metadata: { ...session.metadata, type: "BOOKING" },
      webhookProcessedAt: new Date(),
    })
    .returning();

  if (!paymentRecord) {
    console.error("Failed to create booking payment record");
    return NextResponse.json(
      { error: "Failed to create payment record" },
      { status: 500 },
    );
  }

  // 3. Update booking with payment ID
  await db
    .update(bookings)
    .set({ paymentId: paymentRecord.id })
    .where(eq(bookings.id, bookingId));

  // 4. Process the booking payment
  const result = await processBookingPayment({
    bookingId,
    paymentId: paymentRecord.id,
  });

  if (!result.success) {
    console.error("Booking payment processing failed:", result.error);
    return NextResponse.json(
      { error: result.error ?? "Booking processing failed" },
      { status: 500 },
    );
  }

  console.log(
    `✅ Stripe booking payment processed: Unit ${result.unitName} assigned to booking ${bookingId}`,
  );

  return NextResponse.json({ received: true });
}
