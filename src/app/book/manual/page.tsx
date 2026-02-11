"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
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
  MessageCircle,
  Calendar,
  Home,
} from "lucide-react";
import { UploadButton } from "@/utils/uploadthing";
import ReactMarkdown from "react-markdown";

function ManualBookingPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get params from URL
  const bookingId = parseInt(searchParams.get("booking_id") ?? "0");
  const methodId = searchParams.get("method") ?? "";

  const [paymentMethodDetails, setPaymentMethodDetails] = useState<{
    id: string;
    name: string;
    instructions: string;
    accountNumber: string | null;
    accountName: string | null;
    qrCodeUrl: string | null;
  } | null>(null);
  const [bookingDetails, setBookingDetails] = useState<{
    id: number;
    guestName: string;
    guestEmail: string;
    collectionName: string;
    checkIn: string;
    checkOut: string;
    totalPrice: string;
    referenceCode: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get payment method details
  const { data: paymentMethods } = api.manualPayment.getMethods.useQuery();

  // Get booking details (we'll create a simple endpoint or use existing data)
  useEffect(() => {
    if (!bookingId || !methodId) {
      setIsLoading(false);
      return;
    }

    // Find the payment method
    if (paymentMethods) {
      const method = paymentMethods.find((m) => m.id === methodId);
      if (method) {
        setPaymentMethodDetails({
          id: method.id,
          name: method.name,
          instructions: method.instructions,
          accountNumber: method.accountNumber,
          accountName: method.accountName,
          qrCodeUrl: method.qrCodeUrl,
        });
      }
    }

    // For now, generate a reference code based on booking ID
    // In production, you'd fetch this from the booking record
    const refCode = `BK-${bookingId.toString().padStart(6, "0")}`;
    setBookingDetails({
      id: bookingId,
      guestName: "",
      guestEmail: "",
      collectionName: "Resort Booking",
      checkIn: "",
      checkOut: "",
      totalPrice: "0",
      referenceCode: refCode,
    });

    setIsLoading(false);
  }, [bookingId, methodId, paymentMethods]);

  const handleCopyReference = () => {
    if (bookingDetails?.referenceCode) {
      navigator.clipboard.writeText(bookingDetails.referenceCode);
      setCopied(true);
      toast.success("Reference code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofUrl || !bookingDetails) {
      toast.error("Please upload proof of payment first");
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit the proof - this would update the booking record
      // For now, just redirect to success
      router.push(`/book/success?booking_id=${bookingId}`);
    } catch (error) {
      toast.error("Failed to submit payment");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a1929] to-[#0f2435]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />
          <p className="mt-4 text-cyan-100/70">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!bookingId || !methodId || !paymentMethodDetails || !bookingDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a1929] to-[#0f2435] px-4">
        <Card className="max-w-md border-red-500/30 bg-[#0d1f31]/90">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              Invalid Payment Link
            </h2>
            <p className="mt-2 text-cyan-100/70">
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
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] to-[#0f2435] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Pay via {paymentMethodDetails.name}
          </h1>
          <p className="mt-2 text-cyan-100/70">
            Complete your booking payment
          </p>
        </div>

        {/* Amount Card */}
        <Card className="mb-6 border-cyan-500/30 bg-[#0d1f31]/90">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-cyan-300/70">Booking Reference</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <code className="text-xl font-mono font-bold text-white">
                  {bookingDetails.referenceCode}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyReference}
                  className="text-cyan-300 hover:text-white"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-4 text-sm text-cyan-300/60">
                Include this reference in your payment
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card className="mb-6 border-cyan-400/30 bg-[#0d1f31]/90">
          <CardHeader>
            <CardTitle className="text-white">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethodDetails.accountName && (
              <div>
                <p className="text-sm text-cyan-300/70">Account Name</p>
                <p className="font-medium text-white">
                  {paymentMethodDetails.accountName}
                </p>
              </div>
            )}
            {paymentMethodDetails.accountNumber && (
              <div>
                <p className="text-sm text-cyan-300/70">Account Number</p>
                <p className="font-mono text-lg font-medium text-white">
                  {paymentMethodDetails.accountNumber}
                </p>
              </div>
            )}
            {paymentMethodDetails.qrCodeUrl && (
              <div className="flex justify-center">
                <img
                  src={paymentMethodDetails.qrCodeUrl}
                  alt="QR Code"
                  className="h-48 w-48 rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-6 border-cyan-400/30 bg-[#0d1f31]/90">
          <CardHeader>
            <CardTitle className="text-white">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{paymentMethodDetails.instructions}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Proof Upload */}
        <Card className="mb-6 border-cyan-500/30 bg-[#0d1f31]/90">
          <CardHeader>
            <CardTitle className="text-white">Upload Proof of Payment</CardTitle>
          </CardHeader>
          <CardContent>
            {proofUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <Check className="mr-2 h-5 w-5 text-green-400" />
                  <span className="text-green-400">Proof of payment uploaded</span>
                </div>
                <img
                  src={proofUrl}
                  alt="Proof of payment"
                  className="mx-auto max-h-64 rounded-lg"
                />
                <Button
                  variant="outline"
                  className="w-full border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10"
                  onClick={() => setProofUrl(null)}
                >
                  Upload Different Image
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-cyan-400/30 p-8">
                <Upload className="mb-4 h-10 w-10 text-cyan-400" />
                <p className="mb-4 text-center text-cyan-100/70">
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
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-6 text-lg font-semibold text-white hover:from-cyan-400 hover:to-blue-400"
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
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-white">Review Process</p>
            <p className="mt-1 text-sm text-cyan-100/70">
              Your payment will be reviewed within 24-48 hours. Once approved,
              you'll receive an email confirmation with your booking details.
            </p>
          </div>
        </div>

        {/* Contact Us */}
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
          <div>
            <p className="font-medium text-white">Need Help?</p>
            <p className="mt-1 text-sm text-cyan-100/70">
              For queries, follow-ups, or payment issues, contact our support
              team.
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-cyan-300/70 hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ManualBookingPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a1929] to-[#0f2435]">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      }
    >
      <ManualBookingPaymentContent />
    </Suspense>
  );
}
