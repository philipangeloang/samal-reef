/**
 * Stripe Integration
 *
 * This module handles all Stripe payment operations including:
 * - Creating checkout sessions
 * - Verifying webhook signatures
 * - Processing payments
 */

import Stripe from "stripe";
import { env } from "@/env";

// Initialize Stripe client with API key
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
  typescript: true,
});

/**
 * Create a Stripe Checkout Session for fractional ownership purchase
 * Collection-based: User selects collection + tier, unit assigned after payment
 * Supports both authenticated users (with userId) and guest users (email only)
 */
export async function createCheckoutSession(params: {
  collectionId: number;
  collectionName: string;
  pricingTierId: number;
  fiatPrice: string;
  displayLabel: string;
  email: string;
  userId?: string;
  affiliateCode?: string;
}) {
  const {
    collectionId,
    collectionName,
    pricingTierId,
    fiatPrice,
    displayLabel,
    email,
    userId,
    affiliateCode,
  } = params;

  // Convert price to cents (Stripe uses smallest currency unit)
  const amountInCents = Math.round(parseFloat(fiatPrice) * 100);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "php",
            product_data: {
              name: `${collectionName} - ${displayLabel} Ownership`,
              description: `Fractional ownership in ${collectionName}. Unit will be assigned after payment.`,
              // You can add collection images here if available
              // images: [collectionImageUrl],
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${env.NEXT_PUBLIC_APP_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/purchase/cancelled`,

      // Store metadata to process in webhook
      // Note: collectionId stored here, unitId will be assigned in webhook after payment succeeds
      // Email is always required - for guest users, account will be created in webhook
      metadata: {
        collectionId: collectionId.toString(),
        pricingTierId: pricingTierId.toString(),
        email: email,
        userId: userId ?? "",
        affiliateCode: affiliateCode ?? "",
        paymentMethod: "FIAT",
      },

      // Pre-fill customer email in Stripe checkout
      customer_email: email
    });

    return session;
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    throw new Error("Failed to create checkout session");
  }
}

/**
 * Verify Stripe webhook signature
 * Ensures the webhook event is actually from Stripe
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
    return event;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    throw new Error("Invalid signature");
  }
}

/**
 * Retrieve a checkout session by ID
 * Used in success page to display order details
 */
export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
    return session;
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    throw new Error("Failed to retrieve session");
  }
}
