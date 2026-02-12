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

interface MarkAllPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unpaidCount: number;
  totalAmount: number;
}

export function MarkAllPaidDialog({
  open,
  onOpenChange,
  unpaidCount,
  totalAmount,
}: MarkAllPaidDialogProps) {
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();

  const markAllPaid = api.admin.markAllCommissionsPaid.useMutation({
    onSuccess: async (data) => {
      toast.success(data.message);
      await utils.admin.getAllCommissions.invalidate();
      await utils.affiliate.getAllAffiliates.invalidate();
      setNotes("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark commissions as paid");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    markAllPaid.mutate({
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Mark All Commissions as Paid</DialogTitle>
            <DialogDescription>
              This will mark all {unpaidCount} unpaid{" "}
              {unpaidCount === 1 ? "commission" : "commissions"} as paid
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Number of Commissions:
                  </span>
                  <span className="font-medium">{unpaidCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="text-lg font-bold">
                    {currencySymbol}{totalAmount.toFixed(2)}
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
                placeholder="e.g., Batch payment via PayPal, Monthly commission payout, etc."
                rows={3}
              />
            </div>

            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
              <p className="text-sm text-orange-900 dark:text-orange-200">
                <strong>Warning:</strong> This will mark ALL {unpaidCount}{" "}
                unpaid {unpaidCount === 1 ? "commission" : "commissions"} as
                paid. Make sure you have transferred the funds to all affiliates
                before proceeding. This action will update all affected
                affiliates&apos; total paid balances and cannot be easily
                undone.
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
            <Button type="submit" disabled={markAllPaid.isPending}>
              {markAllPaid.isPending
                ? "Processing..."
                : `Confirm Payment of ${currencySymbol}${totalAmount.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
