/**
 * DePay Dynamic Configuration Endpoint
 *
 * This endpoint is called by DePay when a payment is initiated.
 * It returns the payment configuration dynamically based on the payload.
 *
 * Flow:
 * 1. User clicks "Pay with Crypto" → DePay widget opens
 * 2. DePay calls this endpoint with the payload
 * 3. We return payment config (amount, tokens, receiver)
 * 4. DePay shows payment UI to user
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyDepayRequest, signDepayResponse } from "@/lib/depay";
import { db } from "@/server/db";
import { env } from "@/env";

interface ConfigurationPayload {
  collectionId: string;
  pricingTierId: string;
  userId: string;
  affiliateCode?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Get request body
    const body = await req.text();
    const signature = req.headers.get("x-signature");

    // Verify DePay's request signature
    if (!(await verifyDepayRequest(signature, body))) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2. Parse the request data
    const requestData = JSON.parse(body) as
      | ConfigurationPayload
      | { payload: ConfigurationPayload };

    // Extract payload (DePay might send it nested or at top level)
    const payload =
      "payload" in requestData ? requestData.payload : requestData;
    const { collectionId, pricingTierId } = payload;

    // 3. Get pricing tier with collection to validate and determine crypto price
    const pricingTier = await db.query.pricingTiers.findFirst({
      where: (tiers, { eq }) => eq(tiers.id, parseInt(pricingTierId)),
      with: {
        collection: true,
      },
    });

    if (!pricingTier) {
      return NextResponse.json(
        { error: "Pricing tier not found" },
        { status: 404 },
      );
    }

    // 4. Validate that pricing tier belongs to the specified collection (security)
    if (pricingTier.collectionId !== parseInt(collectionId)) {
      return NextResponse.json(
        { error: "Pricing tier does not belong to this collection" },
        { status: 400 },
      );
    }

    // 5. Build payment configuration
    // Use actual pricing from database
    const cryptoAmount = parseFloat(pricingTier.cryptoPrice);

    const configuration = {
      accept: [
        // ===== ARBITRUM (Cheapest gas for Ethereum ecosystem) =====
        // Native ETH on Arbitrum
        {
          blockchain: "arbitrum",
          token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          amount: cryptoAmount,
          receiver: env.DEPAY_WALLET_ADDRESS,
        },
        // USDC on Arbitrum
        {
          blockchain: "arbitrum",
          token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
          amount: cryptoAmount,
          receiver: env.DEPAY_WALLET_ADDRESS,
        },
        // USDT on Arbitrum
        {
          blockchain: "arbitrum",
          token: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
          amount: cryptoAmount,
          receiver: env.DEPAY_WALLET_ADDRESS,
        },

        // ===== ETHEREUM MAINNET =====
        // Native ETH on Ethereum
        {
          blockchain: "ethereum",
          token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          amount: cryptoAmount,
          receiver: env.DEPAY_WALLET_ADDRESS,
        },
        // USDC on Ethereum
        {
          blockchain: "ethereum",
          token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          amount: cryptoAmount,
          receiver: env.DEPAY_WALLET_ADDRESS,
        },
        // USDT on Ethereum
        {
          blockchain: "ethereum",
          token: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          amount: cryptoAmount,
          receiver: env.DEPAY_WALLET_ADDRESS,
        },

        // ===== BSC (Binance Smart Chain) =====
        // USDC on BSC
        {
          blockchain: "bsc",
          token: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
          amount: cryptoAmount,
          receiver: env.DEPAY_WALLET_ADDRESS,
        },
        // USDT on BSC
        {
          blockchain: "bsc",
          token: "0x55d398326f99059fF775485246999027B3197955",
          amount: cryptoAmount,
          receiver: env.DEPAY_WALLET_ADDRESS,
        },
      ],
    };

    // 6. Sign the response
    const configString = JSON.stringify(configuration);
    const responseSignature = signDepayResponse(configString);

    // 7. Return configuration with signature
    return new NextResponse(configString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "x-signature": responseSignature,
      },
    });
  } catch (error) {
    console.error("DePay configuration error:", error);
    return NextResponse.json(
      { error: "Configuration failed" },
      { status: 500 },
    );
  }
}
