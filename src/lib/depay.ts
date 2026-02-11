/**
 * DePay Integration
 *
 * This module handles DePay crypto payment configuration, request verification,
 * and response signing for the managed integration approach.
 */

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { verify } from "@depay/js-verify-signature";
import { env } from "@/env";

/**
 * Create Depay widget configuration
 * Collection-based: User selects collection + tier, unit assigned after payment
 * Supports both authenticated users (with userId) and guest users (email only)
 */
export function createDepayConfig(params: {
  collectionId: number;
  pricingTierId: number;
  cryptoPrice: string;
  displayLabel: string;
  email: string;
  userId?: string;
  affiliateCode?: string;
}) {
  const { collectionId, pricingTierId, cryptoPrice, email, userId, affiliateCode } =
    params;

  const amount = parseFloat(cryptoPrice);

  return {
    // Accepted tokens (you can customize this list)
    accept: [
      {
        blockchain: "ethereum",
        amount,
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
        receiver: env.DEPAY_WALLET_ADDRESS,
      },
      {
        blockchain: "ethereum",
        amount,
        token: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT on Ethereum
        receiver: env.DEPAY_WALLET_ADDRESS,
      },
      {
        blockchain: "polygon",
        amount,
        token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC on Polygon
        receiver: env.DEPAY_WALLET_ADDRESS,
      },
      {
        blockchain: "bsc",
        amount,
        token: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC on BSC
        receiver: env.DEPAY_WALLET_ADDRESS,
      },
    ],

    // Callback configuration
    callback: {
      // Metadata to send with callback
      // Note: collectionId stored here, unitId will be assigned in webhook/callback
      // Email is always required - for guest users, account will be created in callback
      data: {
        collectionId: collectionId.toString(),
        pricingTierId: pricingTierId.toString(),
        email: email,
        userId: userId ?? "",
        affiliateCode: affiliateCode ?? "",
        paymentMethod: "CRYPTO",
      },
    },
  };
}

/**
 * Verify incoming requests from DePay
 * Uses DePay's public key to verify request signatures
 */
export async function verifyDepayRequest(
  signature: string | null,
  bodyAsString: string,
): Promise<boolean> {
  if (!signature) {
    console.error("Missing x-signature header from DePay");
    return false;
  }

  try {
    const isValid = await verify({
      signature,
      data: bodyAsString,
      publicKey: env.DEPAY_PUBLIC_KEY,
    });

    return Boolean(isValid);
  } catch (error) {
    console.error("DePay request verification failed:", error);
    return false;
  }
}

/**
 * Sign outgoing responses to DePay
 * Uses your private key to sign response data
 */
export function signDepayResponse(responseDataAsString: string): string {
  // Parse private key from env (supports multi-line format in Vercel)
  const privateKey = crypto.createPrivateKey(env.DEPAY_PRIVATE_KEY);

  // Sign the response data with RSA-PSS SHA256
  const signature = crypto.sign("sha256", Buffer.from(responseDataAsString), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 64,
  });

  // Convert to URL-safe base64
  const urlSafeBase64Signature = signature
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return urlSafeBase64Signature;
}

/**
 * Process Depay payment callback
 * This is called from the client-side after successful payment
 */
export interface DepayCallbackData {
  transaction: string; // Transaction hash
  blockchain: string;
  token: string;
  sender: string;
  receiver: string;
  amount: string;
  data?: {
    collectionId: string;
    pricingTierId: string;
    email: string;
    userId: string;
    affiliateCode?: string;
  };
}
