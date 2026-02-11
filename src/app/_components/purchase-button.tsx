"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAffiliateCode } from "@/hooks/use-affiliate-tracking";
import { EmailCollectionDialog } from "./email-collection-dialog";

// DePay widget types
declare global {
  interface Window {
    DePayWidgets?: {
      Payment: (config: {
        integration: string;
        payload: {
          collectionId: string;
          pricingTierId: string;
          email: string;
          userId: string;
          affiliateCode: string;
        };
        succeeded?: (transaction: unknown) => void;
        failed?: (error: unknown) => void;
        closed?: () => void;
      }) => void;
    };
  }
}

interface PurchaseButtonProps {
  collectionId: number;
  tierId: number;
  tierLabel: string;
  isAvailable: boolean;
  paymentMethod: "FIAT" | "CRYPTO";
}

export function PurchaseButton({
  collectionId,
  tierId,
  tierLabel,
  isAvailable,
  paymentMethod,
}: PurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const { data: session } = useSession();

  const initiatePurchase = api.purchase.initiate.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  // Load DePay script from CDN
  const loadDePayScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.DePayWidgets) {
        resolve();
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector(
        'script[src*="integrate.depay.com"]',
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", reject);
        return;
      }

      // Load script from CDN
      const script = document.createElement("script");
      script.src = "https://integrate.depay.com/widgets/v13.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const handlePurchase = async (providedEmail?: string) => {
    // Determine email to use (session email, provided email, or stored guest email)
    const emailToUse = session?.user?.email ?? providedEmail ?? guestEmail;

    // If not signed in and no email provided, show dialog
    if (!session?.user && !providedEmail && !guestEmail) {
      setShowEmailDialog(true);
      return;
    }

    // If we still don't have an email (shouldn't happen), show error
    if (!emailToUse) {
      toast.error("Email is required to complete purchase");
      return;
    }

    setIsLoading(true);

    try {
      // Get affiliate code from localStorage
      const affiliateCode = getAffiliateCode() ?? undefined;

      if (paymentMethod === "FIAT") {
        // Stripe payment - use tRPC
        initiatePurchase.mutate({
          collectionId,
          pricingTierId: tierId,
          paymentMethod: "FIAT",
          email: emailToUse,
          affiliateCode,
        });
      } else {
        // Crypto payment - load DePay from CDN and open widget
        await loadDePayScript();

        if (!window.DePayWidgets) {
          throw new Error("Failed to load DePay widgets");
        }

        const integrationId = process.env.NEXT_PUBLIC_DEPAY_INTEGRATION_ID;
        if (!integrationId) {
          throw new Error("DePay integration ID not configured");
        }

        // Track payment success state across callbacks
        let paymentSucceeded = false;
        let successTxHash = "";

        window.DePayWidgets.Payment({
          integration: integrationId,
          payload: {
            collectionId: collectionId.toString(),
            pricingTierId: tierId.toString(),
            email: emailToUse,
            userId: session?.user?.id ?? "",
            affiliateCode: affiliateCode ?? "",
          },
          succeeded: (transaction: unknown) => {
            // Payment succeeded - extract transaction hash
            // Extract transaction hash from 'id' field
            if (transaction && typeof transaction === "object") {
              const txData = transaction as Record<string, unknown>;
              successTxHash = (txData.id as string) || "";
            }

            // Mark payment as succeeded
            paymentSucceeded = true;

            // Show success message - redirect will happen when widget closes
            toast.success("Payment successful! You can close this window.");
          },
          failed: (error: unknown) => {
            // Payment failed
            console.error("Payment failed:", error);
            toast.error("Payment failed. Please try again.");
            setIsLoading(false);
          },
          closed: () => {
            // Widget closed - redirect if payment succeeded
            if (paymentSucceeded) {
              // Redirect to success page with transaction hash
              window.location.href = `/purchase/success${successTxHash ? `?tx_hash=${successTxHash}` : ""}`;
            } else {
              // User closed widget without completing payment
              setIsLoading(false);
            }
          },
        });

        // Don't set loading to false here - let the callbacks handle it
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to initiate payment");
      setIsLoading(false);
    }
  };

  const handleEmailConfirmed = (email: string) => {
    setGuestEmail(email);
    // Immediately proceed with purchase using the confirmed email
    handlePurchase(email);
  };

  return (
    <>
      <EmailCollectionDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onEmailConfirmed={handleEmailConfirmed}
      />

      <Button
      className="w-full bg-gradient-to-r from-cyan-500/90 to-blue-500/90 text-white hover:from-cyan-500 hover:to-blue-500"
      size="sm"
      disabled={!isAvailable || isLoading}
      onClick={() => handlePurchase()}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          Processing...
        </>
      ) : !isAvailable ? (
        "Sold Out"
      ) : (
        `Purchase ${tierLabel}`
      )}
    </Button>
    </>
  );
}
