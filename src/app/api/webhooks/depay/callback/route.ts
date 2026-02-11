/**
 * DePay Payment Callback Handler
 *
 * This endpoint is called by DePay after a payment is confirmed on the blockchain.
 * It processes the payment and creates ownership/booking records.
 *
 * Flow:
 * 1. User completes crypto payment on blockchain
 * 2. DePay validates the transaction
 * 3. DePay calls this endpoint with payment details
 * 4. We process the payment (create ownership/booking, affiliate commission, etc.)
 * 5. We return success with signature
 *
 * Payment Types (determined by payload.type):
 * - OWNERSHIP: Fractional ownership purchase (default)
 * - BOOKING: Resort stay booking
 *
 * Uses shared payment processor for consistency with Stripe and Manual payments.
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyDepayRequest, signDepayResponse } from "@/lib/depay";
import { db } from "@/server/db";
import { payments, bookings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  processSuccessfulPayment,
  getOrCreateUser,
  getAffiliateLinkId,
} from "@/server/services/payment-processor";
import { processBookingPayment } from "@/server/services/booking-processor";

interface CallbackData {
  blockchain: string;
  transaction: string;
  sender: string;
  receiver: string;
  token: string;
  amount: string;
  payload: {
    type?: string; // "OWNERSHIP" | "BOOKING"
    collectionId?: string;
    pricingTierId?: string;
    bookingId?: string;
    email: string;
    userId?: string;
    affiliateCode?: string;
  };
  after_block?: string;
  commitment?: string;
  confirmations?: number;
  created_at?: string;
  confirmed_at?: string;
}

// Map token address to currency symbol
function getCurrencySymbol(blockchain: string, token: string): string {
  // Native ETH (0xEeee...EEeE) - Works for Ethereum and Arbitrum
  if (token === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    return "ETH";
  }

  // USDC tokens
  if (token === "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48") return "USDC"; // Ethereum
  if (token === "0xaf88d065e77c8cC2239327C5EDb3A432268e5831") return "USDC"; // Arbitrum
  if (token === "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d") return "USDC"; // BSC

  // USDT tokens
  if (token === "0xdAC17F958D2ee523a2206206994597C13D831ec7") return "USDT"; // Ethereum
  if (token === "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9") return "USDT"; // Arbitrum
  if (token === "0x55d398326f99059fF775485246999027B3197955") return "USDT"; // BSC

  // Fallback
  return blockchain.toUpperCase().substring(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify DePay's request signature
    const body = await req.text();
    const signature = req.headers.get("x-signature");

    if (!(await verifyDepayRequest(signature, body))) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2. Parse callback data
    const callbackData: CallbackData = JSON.parse(body) as CallbackData;
    const transactionHash = callbackData.transaction;
    const paymentType = callbackData.payload.type ?? "OWNERSHIP";

    // 3. Check if payment already processed (idempotency)
    const existingPayment = await db.query.payments.findFirst({
      where: (payments, { eq }) => eq(payments.externalId, transactionHash),
    });

    if (existingPayment) {
      // Return success - payment was already handled
      const responseData = { status: "already_processed" };
      const responseString = JSON.stringify(responseData);
      const responseSignature = signDepayResponse(responseString);

      return new NextResponse(responseString, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "x-signature": responseSignature,
        },
      });
    }

    // Route based on payment type
    if (paymentType === "BOOKING") {
      return await handleBookingPaymentCallback(callbackData);
    } else {
      return await handleOwnershipPaymentCallback(callbackData);
    }
  } catch (err) {
    console.error("DePay callback error:", err);
    return NextResponse.json(
      { error: "Callback handler failed" },
      { status: 500 },
    );
  }
}

/**
 * Handle ownership payment (fractional ownership purchase)
 */
async function handleOwnershipPaymentCallback(callbackData: CallbackData) {
  // Extract metadata from payload
  const collectionId = parseInt(callbackData.payload.collectionId ?? "0");
  const pricingTierId = parseInt(callbackData.payload.pricingTierId ?? "0");
  const email = callbackData.payload.email;
  const userIdFromPayload = callbackData.payload.userId ?? "";
  const affiliateCode = callbackData.payload.affiliateCode ?? "";
  const transactionHash = callbackData.transaction;

  if (!collectionId || !pricingTierId || !email || !transactionHash) {
    console.error("Missing required data in DePay callback");
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const currencySymbol = getCurrencySymbol(
    callbackData.blockchain,
    callbackData.token,
  );

  // Get or create user for guest checkout
  let userId = userIdFromPayload;
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

  // Get affiliate link ID
  const affiliateLinkId = await getAffiliateLinkId(affiliateCode);

  // Get pricing tier to get percentage
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

  // Create payment record with SUCCESS status
  const [paymentRecord] = await db
    .insert(payments)
    .values({
      provider: "DEPAY",
      externalId: transactionHash,
      userId,
      amount: pricingTier.cryptoPrice, // Use crypto price from tier
      currency: currencySymbol,
      status: "SUCCESS",
      collectionId,
      pricingTierId,
      percentageToBuy: pricingTier.percentage,
      affiliateLinkId,
      metadata: callbackData.payload,
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

  // Process the payment using shared processor
  const result = await processSuccessfulPayment({
    paymentId: paymentRecord.id,
    userId,
    collectionId,
    pricingTierId,
    percentageToBuy: pricingTier.percentage,
    amountPaid: pricingTier.cryptoPrice,
    currency: currencySymbol,
    paymentMethod: "CRYPTO",
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
    `✅ DePay ownership payment processed: Unit ${result.unitName} assigned to user ${userId}`,
  );

  // Sign the response
  const responseData = {};
  const responseString = JSON.stringify(responseData);
  const responseSignature = signDepayResponse(responseString);

  return new NextResponse(responseString, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "x-signature": responseSignature,
    },
  });
}

/**
 * Handle booking payment (resort stay)
 */
async function handleBookingPaymentCallback(callbackData: CallbackData) {
  const bookingId = parseInt(callbackData.payload.bookingId ?? "0");
  const transactionHash = callbackData.transaction;
  const amount = callbackData.amount;

  if (!bookingId) {
    console.error("Missing bookingId in booking payment payload");
    return NextResponse.json(
      { error: "Missing bookingId" },
      { status: 400 },
    );
  }

  const currencySymbol = getCurrencySymbol(
    callbackData.blockchain,
    callbackData.token,
  );

  // Create payment record
  const [paymentRecord] = await db
    .insert(payments)
    .values({
      provider: "DEPAY",
      externalId: transactionHash,
      userId: callbackData.payload.userId ?? null,
      amount,
      currency: currencySymbol,
      status: "SUCCESS",
      metadata: { ...callbackData.payload, type: "BOOKING" },
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

  // Update booking with payment ID
  await db
    .update(bookings)
    .set({ paymentId: paymentRecord.id })
    .where(eq(bookings.id, bookingId));

  // Process the booking payment
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
    `✅ DePay booking payment processed: Unit ${result.unitName} assigned to booking ${bookingId}`,
  );

  // Sign the response
  const responseData = {};
  const responseString = JSON.stringify(responseData);
  const responseSignature = signDepayResponse(responseString);

  return new NextResponse(responseString, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "x-signature": responseSignature,
    },
  });
}
