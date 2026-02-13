"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/currency";

type PendingReview = RouterOutputs["manualPayment"]["getPendingReviews"][number];

interface ManualPaymentsClientProps {
  initialPendingReviews: PendingReview[];
}

export function ManualPaymentsClient({
  initialPendingReviews,
}: ManualPaymentsClientProps) {
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(
    null,
  );
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const utils = api.useUtils();

  // Get pending reviews with refetch capability
  const { data: pendingReviews, isLoading } =
    api.manualPayment.getPendingReviews.useQuery(undefined, {
      initialData: initialPendingReviews,
      refetchInterval: 30000, // Refetch every 30 seconds
    });

  // Approve mutation
  const approveMutation = api.manualPayment.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setApproveDialogOpen(false);
      setSelectedReview(null);
      utils.manualPayment.getPendingReviews.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Reject mutation
  const rejectMutation = api.manualPayment.reject.useMutation({
    onSuccess: () => {
      toast.success("Payment rejected");
      setRejectDialogOpen(false);
      setSelectedReview(null);
      setRejectionReason("");
      utils.manualPayment.getPendingReviews.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation (for spam)
  const deleteMutation = api.manualPayment.deletePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment deleted permanently");
      setDeleteDialogOpen(false);
      setSelectedReview(null);
      utils.manualPayment.getPendingReviews.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleApprove = () => {
    if (!selectedReview) return;
    approveMutation.mutate({ paymentId: selectedReview.id });
  };

  const handleReject = () => {
    if (!selectedReview || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({
      paymentId: selectedReview.id,
      reason: rejectionReason.trim(),
    });
  };

  const handleDelete = () => {
    if (!selectedReview) return;
    deleteMutation.mutate({ paymentId: selectedReview.id });
  };

  const checkAmountMatch = (review: PendingReview): boolean => {
    if (!review.expectedAmount) return true;
    const paid = parseFloat(review.amount);
    const expected = parseFloat(review.expectedAmount);
    return Math.abs(paid - expected) < 0.01;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100/70">
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400">
              {pendingReviews?.length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reviews Table */}
      <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-100">
            <Clock className="h-5 w-5" />
            Pending Manual Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pendingReviews || pendingReviews.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400/50" />
              <p className="mt-4">No pending reviews</p>
              <p className="text-sm">All manual payments have been processed</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-500/20">
                  <TableHead className="text-cyan-100/70">Reference</TableHead>
                  <TableHead className="text-cyan-100/70">User</TableHead>
                  <TableHead className="text-cyan-100/70">Collection</TableHead>
                  <TableHead className="text-cyan-100/70">Tier</TableHead>
                  <TableHead className="text-cyan-100/70">Method</TableHead>
                  <TableHead className="text-cyan-100/70">Amount</TableHead>
                  <TableHead className="text-cyan-100/70">Submitted</TableHead>
                  <TableHead className="text-cyan-100/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReviews.map((review) => {
                  const amountMatches = checkAmountMatch(review);
                  return (
                    <TableRow key={review.id} className="border-cyan-500/10">
                      <TableCell className="font-mono text-sm text-cyan-100">
                        {review.referenceCode}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-cyan-100">
                            {review.user?.name ?? "Unknown"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {review.user?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-cyan-100/80">
                        {review.collection?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-cyan-500/30">
                          {review.pricingTier?.displayLabel ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-cyan-100/80">
                        {review.paymentMethod?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              amountMatches ? "text-green-400" : "text-yellow-400"
                            }
                          >
                            {formatCurrency(review.amount)}
                          </span>
                          {!amountMatches && (
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          )}
                        </div>
                        {review.expectedAmount && (
                          <p className="text-xs text-gray-400">
                            Expected: {formatCurrency(review.expectedAmount)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {formatDistanceToNow(new Date(review.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(review);
                              setProofDialogOpen(true);
                            }}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(review);
                              setApproveDialogOpen(true);
                            }}
                            className="text-green-400 hover:text-green-300"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(review);
                              setRejectDialogOpen(true);
                            }}
                            className="text-red-400 hover:text-red-300"
                            title="Reject (user can resubmit)"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(review);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-gray-400 hover:text-red-400"
                            title="Delete permanently (spam)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-2xl border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-cyan-100">
              Payment Proof - {selectedReview?.referenceCode}
            </DialogTitle>
            <DialogDescription>
              Review the proof of payment submitted by the user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-800/50 p-4">
              <div>
                <p className="text-sm text-gray-400">User</p>
                <p className="text-cyan-100">
                  {selectedReview?.user?.name ?? "Unknown"}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedReview?.user?.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Amount</p>
                <p className="text-xl font-bold text-cyan-400">
                  {selectedReview?.amount
                    ? formatCurrency(selectedReview.amount)
                    : "-"}
                </p>
                {selectedReview?.expectedAmount && (
                  <p className="text-xs text-gray-400">
                    Expected: {formatCurrency(selectedReview.expectedAmount)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400">Collection</p>
                <p className="text-cyan-100">
                  {selectedReview?.collection?.name ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Tier</p>
                <p className="text-cyan-100">
                  {selectedReview?.pricingTier?.displayLabel ?? "-"}
                </p>
              </div>
            </div>

            {/* Proof Image */}
            {selectedReview?.proofImageUrl ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">Proof of Payment</p>
                  <a
                    href={selectedReview.proofImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Open Full Size <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex justify-center rounded-lg bg-gray-800 p-4">
                  <img
                    src={selectedReview.proofImageUrl}
                    alt="Proof of payment"
                    className="max-h-96 rounded-lg object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-800/50 p-8 text-center text-gray-400">
                No proof image uploaded
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setProofDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setProofDialogOpen(false);
                setRejectDialogOpen(true);
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setProofDialogOpen(false);
                setApproveDialogOpen(true);
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-cyan-100">
              Approve Payment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this payment? This will:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-300">
            <li>Assign a unit to the user</li>
            <li>Create an ownership record</li>
            <li>Process any affiliate commission</li>
            <li>Send confirmation email to the user</li>
          </ul>
          <div className="rounded-lg bg-gray-800/50 p-4">
            <p className="text-sm text-gray-400">Reference Code</p>
            <p className="font-mono text-cyan-100">
              {selectedReview?.referenceCode}
            </p>
            <p className="mt-2 text-sm text-gray-400">Amount</p>
            <p className="text-lg font-bold text-cyan-400">
              {selectedReview?.amount
                ? formatCurrency(selectedReview.amount)
                : "-"}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-cyan-100">Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment. The user will
              be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-800/50 p-4">
              <p className="text-sm text-gray-400">Reference Code</p>
              <p className="font-mono text-cyan-100">
                {selectedReview?.referenceCode}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Rejection Reason</label>
              <Textarea
                placeholder="e.g., Invalid proof of payment, amount doesn't match, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="border-gray-700 bg-gray-800"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (for spam) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-red-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Delete Payment Permanently
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Only use this for spam or fraudulent
              submissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">
                <strong>Warning:</strong> This will permanently delete this
                payment record from the database. The user will not be notified
                and cannot resubmit.
              </p>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-4">
              <p className="text-sm text-gray-400">Reference Code</p>
              <p className="font-mono text-cyan-100">
                {selectedReview?.referenceCode}
              </p>
              <p className="mt-2 text-sm text-gray-400">User</p>
              <p className="text-cyan-100">
                {selectedReview?.user?.email ?? "Unknown"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
