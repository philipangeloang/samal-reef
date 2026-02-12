"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Upload,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Clock,
  LogIn,
  MessageCircle,
} from "lucide-react";
import { UploadButton } from "@/utils/uploadthing";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { siteConfig } from "@/site.config";

function ManualPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Get params from URL
  const collectionId = parseInt(searchParams.get("collection") ?? "0");
  const pricingTierId = parseInt(searchParams.get("tier") ?? "0");
  const methodId = searchParams.get("method") ?? "";
  const affiliateCode = searchParams.get("ref") ?? undefined;

  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    collectionName: string;
    percentage: string;
    percentageBasisPoints: number;
    amountDue: string;
    currency: string;
    paymentMethod: {
      id: string;
      name: string;
      instructions: string;
      accountNumber: string | null;
      accountName: string | null;
      qrCodeUrl: string | null;
    };
    affiliateLinkId: number | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initiate manual payment
  const initiateMutation = api.manualPayment.initiate.useMutation({
    onSuccess: (data) => {
      setReferenceCode(data.referenceCode);
      setPaymentDetails({
        collectionName: data.collectionName,
        percentage: data.percentage,
        percentageBasisPoints: data.percentageBasisPoints,
        amountDue: data.amountDue,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        affiliateLinkId: data.affiliateLinkId,
      });
    },
    onError: (error) => {
      toast.error(error.message);
      router.push("/");
    },
  });

  // Submit proof mutation
  const submitProofMutation = api.manualPayment.submitProof.useMutation({
    onSuccess: () => {
      router.push("/purchase/manual/success");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });

  // Initialize on mount
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      setShowLoginPrompt(true);
      return;
    }

    if (collectionId && pricingTierId && methodId && !referenceCode) {
      initiateMutation.mutate({
        collectionId,
        pricingTierId,
        manualPaymentMethodId: methodId,
        affiliateCode,
      });
    }
  }, [status, collectionId, pricingTierId, methodId, referenceCode]);

  const handleCopyReference = () => {
    if (referenceCode) {
      navigator.clipboard.writeText(referenceCode);
      setCopied(true);
      toast.success("Reference code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitProof = () => {
    if (!proofUrl || !referenceCode || !paymentDetails) {
      toast.error("Please upload proof of payment first");
      return;
    }

    setIsSubmitting(true);
    submitProofMutation.mutate({
      referenceCode,
      collectionId,
      pricingTierId,
      percentageToBuy: paymentDetails.percentageBasisPoints,
      manualPaymentMethodId: methodId,
      proofImageUrl: proofUrl,
      amountPaid: paymentDetails.amountDue,
      currency: paymentDetails.currency,
      affiliateLinkId: paymentDetails.affiliateLinkId ?? undefined,
    });
  };

  // Loading state
  if (status === "loading" || initiateMutation.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />
          <p className="mt-4 text-gray-400">Preparing your payment...</p>
        </div>
      </div>
    );
  }

  // Login required state
  if (showLoginPrompt) {
    const callbackUrl = `/purchase/manual?collection=${collectionId}&tier=${pricingTierId}&method=${methodId}${affiliateCode ? `&ref=${affiliateCode}` : ""}`;
    const loginUrl = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black px-4">
        <Card className="max-w-md border-cyan-500/30 bg-gray-900/50">
          <CardContent className="pt-6 text-center">
            <LogIn className="mx-auto h-12 w-12 text-cyan-400" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              Login Required
            </h2>
            <p className="mt-2 text-gray-400">
              You need to be logged in to use manual payment methods.
              No sign up required — just sign in directly with your email.
            </p>
            <Link href={loginUrl}>
              <Button className="mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                <LogIn className="mr-2 h-4 w-4" />
                Log In to Continue
              </Button>
            </Link>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-white"
              >
                ← Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (!paymentDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md border-red-500/30 bg-gray-900/50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              Invalid Payment Link
            </h2>
            <p className="mt-2 text-gray-400">
              This payment link is invalid or has expired.
            </p>
            <Button
              className="mt-6"
              variant="outline"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Pay via {paymentDetails.paymentMethod.name}
          </h1>
          <p className="mt-2 text-gray-400">
            {paymentDetails.collectionName} - {paymentDetails.percentage} Ownership
          </p>
        </div>

        {/* Amount Card */}
        <Card className="mb-6 border-cyan-500/30 bg-gray-900/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-400">Amount to Pay</p>
              <p className="mt-1 text-4xl font-bold text-cyan-400">
                $
                {parseFloat(paymentDetails.amountDue).toLocaleString()}
              </p>
            </div>

            {/* Reference Code */}
            <div className="mt-6 rounded-lg bg-gray-800/50 p-4">
              <p className="text-center text-sm text-gray-400">
                Reference Code (include in payment)
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <code className="text-xl font-mono font-bold text-white">
                  {referenceCode}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyReference}
                  className="text-gray-400 hover:text-white"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card className="mb-6 border-gray-700 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentDetails.paymentMethod.accountName && (
              <div>
                <p className="text-sm text-gray-400">Account Name</p>
                <p className="font-medium text-white">
                  {paymentDetails.paymentMethod.accountName}
                </p>
              </div>
            )}
            {paymentDetails.paymentMethod.accountNumber && (
              <div>
                <p className="text-sm text-gray-400">Account Number</p>
                <p className="font-mono text-lg font-medium text-white">
                  {paymentDetails.paymentMethod.accountNumber}
                </p>
              </div>
            )}
            {paymentDetails.paymentMethod.qrCodeUrl && (
              <div className="flex justify-center">
                <img
                  src={paymentDetails.paymentMethod.qrCodeUrl}
                  alt="QR Code"
                  className="h-48 w-48 rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-6 border-gray-700 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>
                {paymentDetails.paymentMethod.instructions}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Proof Upload */}
        <Card className="mb-6 border-cyan-500/30 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Upload Proof of Payment</CardTitle>
          </CardHeader>
          <CardContent>
            {proofUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <Check className="mr-2 h-5 w-5 text-green-400" />
                  <span className="text-green-400">
                    Proof of payment uploaded
                  </span>
                </div>
                <img
                  src={proofUrl}
                  alt="Proof of payment"
                  className="mx-auto max-h-64 rounded-lg"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setProofUrl(null)}
                >
                  Upload Different Image
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 p-8">
                <Upload className="mb-4 h-10 w-10 text-gray-400" />
                <p className="mb-4 text-center text-gray-400">
                  Upload a screenshot of your payment confirmation
                </p>
                <UploadButton
                  endpoint="proofOfPayment"
                  onClientUploadComplete={(res) => {
                    if (res?.[0]?.url) {
                      setProofUrl(res[0].url);
                      toast.success("Image uploaded successfully");
                    }
                  }}
                  onUploadError={(error: Error) => {
                    toast.error(`Upload failed: ${error.message}`);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-6 text-lg font-semibold text-white hover:from-cyan-600 hover:to-blue-600"
          disabled={!proofUrl || isSubmitting}
          onClick={handleSubmitProof}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit for Review"
          )}
        </Button>

        {/* Info Note */}
        <div className="mt-6 flex items-start gap-3 rounded-lg bg-gray-800/50 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
          <div>
            <p className="font-medium text-white">Review Process</p>
            <p className="mt-1 text-sm text-gray-400">
              Your payment will be reviewed within 24-48 hours. Once approved,
              you'll receive an email confirmation and can sign your MOA.
            </p>
          </div>
        </div>

        {/* Contact Us */}
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
          <div>
            <p className="font-medium text-white">Need Help?</p>
            <p className="mt-1 text-sm text-gray-400">
              For queries, follow-ups, or payment issues,{" "}
              <a
                href={siteConfig.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline hover:text-cyan-300"
              >
                contact us on Facebook
              </a>
              .
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ManualPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      }
    >
      <ManualPaymentContent />
    </Suspense>
  );
}
