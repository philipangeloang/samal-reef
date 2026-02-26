/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface RmaSigningFormProps {
  ownershipId: number;
}

export function RmaSigningForm({ ownershipId }: RmaSigningFormProps) {
  const router = useRouter();
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signerName, setSignerName] = useState("");
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  // Fetch ownership details and RMA preview
  const { data: rmaPreview, isLoading: isLoadingPreview } =
    api.rma.generateUnsignedPreview.useQuery({ ownershipId });

  const { data: ownership, isLoading: isLoadingOwnership } =
    api.rma.getRmaByOwnership.useQuery({ ownershipId });

  // Submit signed RMA mutation
  const submitRma = api.rma.submitSignedRma.useMutation({
    onSuccess: (_data) => {
      toast.success("RMA signed successfully!", {
        description: "Your signed document has been saved securely.",
      });

      // Redirect to investor dashboard after a brief delay
      setTimeout(() => {
        router.push("/dashboard/investor");
      }, 1500);
    },
    onError: (error) => {
      toast.error("Failed to sign RMA", {
        description: error.message ?? "An error occurred while signing the RMA",
      });
    },
  });

  // Track when user draws on signature pad
  const handleSignatureBegin = () => {
    setHasDrawnSignature(true);
  };

  // Clear signature
  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setHasDrawnSignature(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!signerName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!hasDrawnSignature || signatureRef.current?.isEmpty()) {
      toast.error("Please add your signature");
      return;
    }

    // Get signature as data URL
    if (!signatureRef.current) {
      toast.error("Signature pad not initialized");
      return;
    }

    const signatureDataUrl = signatureRef.current.toDataURL();

    // Submit
    submitRma.mutate({
      ownershipId,
      signatureDataUrl,
      signerName: signerName.trim(),
    });
  };

  // Loading state
  if (isLoadingPreview || isLoadingOwnership) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Already signed
  if (ownership?.isRmaSigned) {
    return (
      <Card className="border-green-400/30 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
            <CardTitle className="text-white">RMA Already Signed</CardTitle>
          </div>
          <CardDescription className="text-cyan-100/70">
            You signed this document on{" "}
            {ownership.rmaSignedAt
              ? new Date(ownership.rmaSignedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            {ownership.rmaUrl && (
              <Button
                asChild
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
              >
                <a
                  href={ownership.rmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download RMA
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              className="border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10"
              onClick={() => router.push("/dashboard/investor")}
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (!rmaPreview || !ownership) {
    return (
      <Alert className="border-red-400/30 bg-red-400/10">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">
          Unable to load RMA document. Please try again or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Details and Signature */}
        <div className="space-y-6">
          {/* Ownership Details */}
          <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Ownership Details</CardTitle>
              <CardDescription className="text-cyan-100/60">
                Review your property ownership information
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-cyan-100/60">Property Unit</Label>
                <p className="font-semibold text-white">
                  {rmaPreview.ownershipDetails.unitName}
                </p>
              </div>
              <div>
                <Label className="text-xs text-cyan-100/60">
                  Ownership Percentage
                </Label>
                <p className="font-semibold text-white">
                  {rmaPreview.ownershipDetails.percentage}%
                </p>
              </div>
              <div>
                <Label className="text-xs text-cyan-100/60">Purchase Price</Label>
                <p className="font-semibold text-white">
                  {rmaPreview.ownershipDetails.purchasePrice}
                </p>
              </div>
              <div>
                <Label className="text-xs text-cyan-100/60">Purchase Date</Label>
                <p className="font-semibold text-white">
                  {new Date(
                    rmaPreview.ownershipDetails.purchaseDate,
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Signature Section */}
          <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Sign Document</CardTitle>
              <CardDescription className="text-cyan-100/60">
                Add your full legal name and signature
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Full Name Input */}
              <div className="space-y-2">
                <Label htmlFor="signerName" className="text-cyan-100">
                  Full Legal Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="signerName"
                  type="text"
                  placeholder="Enter your full name as it appears on official documents"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  required
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>

              {/* Signature Pad */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-cyan-100">
                    Digital Signature <span className="text-red-400">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSignature}
                    disabled={!hasDrawnSignature}
                    className="text-cyan-400 hover:bg-cyan-400/20 hover:text-cyan-300"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
                <div className="overflow-hidden rounded-lg border-2 border-dashed border-cyan-400/30 bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      className: "w-full h-48 touch-none cursor-crosshair",
                      width: 600,
                      height: 200,
                    }}
                    backgroundColor="transparent"
                    penColor="#000000"
                    onBegin={handleSignatureBegin}
                  />
                </div>
                <p className="text-xs text-cyan-100/60">
                  Draw your signature above using your mouse or touchscreen
                </p>
              </div>

              {/* Agreement Checkbox */}
              <Alert className="border-cyan-400/30 bg-cyan-400/10">
                <AlertDescription className="text-sm text-cyan-100/80">
                  By signing this document, you acknowledge that you have read,
                  understood, and agree to all terms and conditions outlined in the
                  Rental Management Agreement.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={submitRma.isPending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
            >
              {submitRma.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Sign & Submit RMA
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push("/dashboard/investor")}
              disabled={submitRma.isPending}
              className="flex-1 border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10"
            >
              Sign Later
            </Button>
          </div>
        </div>

        {/* Right Column - RMA Document Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">RMA Document Preview</CardTitle>
              <CardDescription className="text-cyan-100/60">
                Review the agreement before signing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-[8.5/11] w-full overflow-hidden rounded-lg border border-cyan-400/30 bg-white">
                <embed
                  src={`data:application/pdf;base64,${rmaPreview.pdfBase64}`}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  className="h-full w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
