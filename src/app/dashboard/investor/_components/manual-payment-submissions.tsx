"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Loader2,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { UploadButton } from "@/utils/uploadthing";
import { currencySymbol } from "@/lib/currency";
import { siteConfig } from "@/site.config";

type Submission = RouterOutputs["manualPayment"]["getMySubmissions"][number];

interface ManualPaymentSubmissionsProps {
  initialSubmissions: Submission[];
}

export function ManualPaymentSubmissions({
  initialSubmissions,
}: ManualPaymentSubmissionsProps) {
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [newProofUrl, setNewProofUrl] = useState<string | null>(null);

  const utils = api.useUtils();

  // Get submissions with refetch capability
  const { data: submissions } = api.manualPayment.getMySubmissions.useQuery(
    undefined,
    {
      initialData: initialSubmissions,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  );

  // Resubmit mutation
  const resubmitMutation = api.manualPayment.resubmit.useMutation({
    onSuccess: () => {
      toast.success("Payment resubmitted for review");
      setResubmitDialogOpen(false);
      setSelectedSubmission(null);
      setNewProofUrl(null);
      utils.manualPayment.getMySubmissions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleResubmit = () => {
    if (!selectedSubmission || !newProofUrl) {
      toast.error("Please upload new proof of payment");
      return;
    }

    resubmitMutation.mutate({
      paymentId: selectedSubmission.id,
      proofImageUrl: newProofUrl,
    });
  };

  const openResubmitDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setNewProofUrl(null);
    setResubmitDialogOpen(true);
  };

  if (!submissions || submissions.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-400/10 p-2">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <CardTitle className="text-white">
                  Manual Payment Submissions
                </CardTitle>
                <CardDescription className="text-cyan-100/60">
                  Track the status of your manual payment submissions
                </CardDescription>
              </div>
            </div>
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300 transition-colors hover:bg-cyan-500/20"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Us
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-cyan-400/20">
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                  <TableHead className="text-cyan-100">Reference</TableHead>
                  <TableHead className="text-cyan-100">Collection</TableHead>
                  <TableHead className="text-cyan-100">Tier</TableHead>
                  <TableHead className="text-cyan-100">Amount</TableHead>
                  <TableHead className="text-cyan-100">Method</TableHead>
                  <TableHead className="text-cyan-100">Status</TableHead>
                  <TableHead className="text-cyan-100">Submitted</TableHead>
                  <TableHead className="text-cyan-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow
                    key={submission.id}
                    className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                  >
                    <TableCell className="font-mono text-sm text-white">
                      {submission.referenceCode}
                    </TableCell>
                    <TableCell className="text-cyan-100/70">
                      {submission.collection?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-400/20 text-blue-300">
                        {submission.pricingTier?.displayLabel ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-400">
                      {currencySymbol}{parseFloat(submission.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-cyan-100/70">
                      {submission.paymentMethod?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      {submission.status === "IN_REVIEW" && (
                        <Badge className="border-yellow-400/30 bg-yellow-400/20 text-yellow-300">
                          <Clock className="mr-1 h-3 w-3" />
                          Under Review
                        </Badge>
                      )}
                      {submission.status === "SUCCESS" && (
                        <Badge className="border-green-400/30 bg-green-400/20 text-green-300">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Approved
                        </Badge>
                      )}
                      {submission.status === "FAILED" && (
                        <div className="flex flex-col gap-1">
                          <Badge className="border-red-400/30 bg-red-400/20 text-red-300">
                            <XCircle className="mr-1 h-3 w-3" />
                            Rejected
                          </Badge>
                          {submission.rejectionReason && (
                            <span className="text-xs text-red-300/70">
                              {submission.rejectionReason}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-cyan-100/70">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {submission.status === "FAILED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                          onClick={() => openResubmitDialog(submission)}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Resubmit
                        </Button>
                      )}
                      {submission.status === "IN_REVIEW" && (
                        <span className="text-xs text-cyan-100/40">
                          Pending review
                        </span>
                      )}
                      {submission.status === "SUCCESS" && (
                        <span className="text-xs text-green-400/70">
                          Complete
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Contact Us Note */}
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4">
            <MessageCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" />
            <div>
              <p className="text-sm font-medium text-cyan-100">
                Need help with your payment?
              </p>
              <p className="mt-1 text-xs text-cyan-100/70">
                For queries, follow-ups, or issues with your manual payments,{" "}
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
        </CardContent>
      </Card>

      {/* Resubmit Dialog */}
      <Dialog open={resubmitDialogOpen} onOpenChange={setResubmitDialogOpen}>
        <DialogContent className="border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-cyan-100">
              Resubmit Payment Proof
            </DialogTitle>
            <DialogDescription>
              Upload a new proof of payment to resubmit your rejected payment
              for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Original submission details */}
            <div className="rounded-lg bg-gray-800/50 p-4">
              <p className="text-sm text-gray-400">Reference Code</p>
              <p className="font-mono text-cyan-100">
                {selectedSubmission?.referenceCode}
              </p>
              <p className="mt-2 text-sm text-gray-400">Amount Due</p>
              <p className="text-lg font-bold text-cyan-400">
                {currencySymbol}
                {selectedSubmission?.amount
                  ? parseFloat(selectedSubmission.amount).toLocaleString()
                  : "-"}
              </p>
              {selectedSubmission?.rejectionReason && (
                <>
                  <p className="mt-2 text-sm text-gray-400">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-red-300">
                    {selectedSubmission.rejectionReason}
                  </p>
                </>
              )}
            </div>

            {/* Upload new proof */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">New Proof of Payment</p>
              {newProofUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-400" />
                    <span className="text-green-400">
                      New proof uploaded
                    </span>
                  </div>
                  <img
                    src={newProofUrl}
                    alt="New proof of payment"
                    className="mx-auto max-h-48 rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setNewProofUrl(null)}
                  >
                    Upload Different Image
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 p-6">
                  <Upload className="mb-3 h-8 w-8 text-gray-400" />
                  <p className="mb-3 text-center text-sm text-gray-400">
                    Upload a screenshot of your payment confirmation
                  </p>
                  <UploadButton
                    endpoint="proofOfPayment"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]?.url) {
                        setNewProofUrl(res[0].url);
                        toast.success("Image uploaded successfully");
                      }
                    }}
                    onUploadError={(error: Error) => {
                      toast.error(`Upload failed: ${error.message}`);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResubmitDialogOpen(false);
                setNewProofUrl(null);
              }}
              disabled={resubmitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              onClick={handleResubmit}
              disabled={!newProofUrl || resubmitMutation.isPending}
            >
              {resubmitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resubmit for Review
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
