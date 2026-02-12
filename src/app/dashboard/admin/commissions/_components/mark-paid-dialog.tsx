"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { currencySymbol } from "@/lib/currency";

interface Commission {
  id: number;
  commissionAmount: string;
  affiliateLink: {
    code: string;
    affiliate: {
      name: string | null;
      email: string | null;
    };
  };
}

interface MarkPaidDialogProps {
  commission: Commission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkPaidDialog({
  commission,
  open,
  onOpenChange,
}: MarkPaidDialogProps) {
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();

  const markPaid = api.admin.markCommissionPaid.useMutation({
    onSuccess: async () => {
      toast.success("Commission marked as paid");
      await utils.admin.getPendingCommissions.invalidate();
      await utils.affiliate.getAllAffiliates.invalidate();
      setNotes("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark commission as paid");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    markPaid.mutate({
      transactionId: commission.id,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Mark Commission as Paid</DialogTitle>
            <DialogDescription>
              Confirm payment to{" "}
              {commission.affiliateLink.affiliate.name ?? "affiliate"} (
              {commission.affiliateLink.affiliate.email})
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Affiliate Code:</span>
                  <span className="font-medium">
                    {commission.affiliateLink.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Commission Amount:
                  </span>
                  <span className="text-lg font-bold">
                    {currencySymbol}{parseFloat(commission.commissionAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Payment Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., PayPal transaction ID, bank transfer reference, etc."
                rows={3}
              />
            </div>

            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
              <p className="text-sm text-orange-900 dark:text-orange-200">
                <strong>Important:</strong> Only mark this commission as paid
                after you have actually transferred the funds to the affiliate.
                This action will update the affiliate&apos;s total paid balance
                and cannot be easily undone.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNotes("");
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={markPaid.isPending}>
              {markPaid.isPending ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
