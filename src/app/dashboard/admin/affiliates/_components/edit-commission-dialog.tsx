"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliate: {
    name: string;
    email: string;
    linkId: number;
    currentRate: string;
    currentBookingRate: string | null;
  } | null;
}

export function EditCommissionDialog({
  open,
  onOpenChange,
  affiliate,
}: EditCommissionDialogProps) {
  const [commissionRate, setCommissionRate] = useState("");
  const [bookingCommissionRate, setBookingCommissionRate] = useState("");

  const utils = api.useUtils();

  useEffect(() => {
    if (affiliate) {
      setCommissionRate(parseFloat(affiliate.currentRate).toFixed(2));
      setBookingCommissionRate(
        affiliate.currentBookingRate
          ? parseFloat(affiliate.currentBookingRate).toFixed(2)
          : "",
      );
    }
  }, [affiliate]);

  const updateRate = api.affiliate.updateCommissionRate.useMutation({
    onSuccess: async () => {
      toast.success("Commission rates updated");
      await utils.affiliate.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update commission rate");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliate) return;

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Ownership commission rate must be between 0 and 100");
      return;
    }

    const bookingRate = bookingCommissionRate.trim()
      ? parseFloat(bookingCommissionRate)
      : null;
    if (bookingRate !== null && (isNaN(bookingRate) || bookingRate < 0 || bookingRate > 100)) {
      toast.error("Booking commission rate must be between 0 and 100");
      return;
    }

    updateRate.mutate({
      affiliateLinkId: affiliate.linkId,
      newRate: rate.toFixed(2),
      newBookingRate: bookingRate !== null ? bookingRate.toFixed(2) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Commission Rates</DialogTitle>
            <DialogDescription>
              Update the commission percentages for{" "}
              <span className="font-medium text-white">
                {affiliate?.name ?? affiliate?.email}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editCommissionRate">Ownership Commission Rate (%)</Label>
              <Input
                id="editCommissionRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="5.00"
                required
              />
              <p className="text-muted-foreground text-xs">
                Commission on ownership purchases
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editBookingCommissionRate">Booking Commission Rate (%)</Label>
              <Input
                id="editBookingCommissionRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={bookingCommissionRate}
                onChange={(e) => setBookingCommissionRate(e.target.value)}
                placeholder="Same as ownership"
              />
              <p className="text-muted-foreground text-xs">
                Commission on booking reservations. If empty, uses the ownership rate.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateRate.isPending}>
              {updateRate.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
