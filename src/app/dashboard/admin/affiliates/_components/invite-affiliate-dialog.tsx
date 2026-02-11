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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface InviteAffiliateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteAffiliateDialog({
  open,
  onOpenChange,
}: InviteAffiliateDialogProps) {
  const [email, setEmail] = useState("");
  const [commissionRate, setCommissionRate] = useState("5.00");
  const [affiliateCode, setAffiliateCode] = useState("");

  const utils = api.useUtils();

  const createInvitation = api.affiliate.createInvitation.useMutation({
    onSuccess: async () => {
      toast.success("Invitation sent successfully");
      await utils.affiliate.invalidate();
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

  const resetForm = () => {
    setEmail("");
    setCommissionRate("5.00");
    setAffiliateCode("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Commission rate must be between 0 and 100");
      return;
    }

    createInvitation.mutate({
      email: email.trim(),
      commissionRate: rate.toFixed(2),
      affiliateCode: affiliateCode.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite Affiliate Partner</DialogTitle>
            <DialogDescription>
              Send an invitation to join as an affiliate. They will receive an
              email with instructions to accept.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="affiliate@example.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="commissionRate">Commission Rate (%) *</Label>
              <Input
                id="commissionRate"
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
                The percentage of each sale this affiliate will earn
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="affiliateCode">
                Affiliate Code (Optional)
              </Label>
              <Input
                id="affiliateCode"
                type="text"
                value={affiliateCode}
                onChange={(e) => setAffiliateCode(e.target.value)}
                placeholder="e.g., PHIL or PARTNER123"
                maxLength={20}
              />
              <p className="text-muted-foreground text-xs">
                Custom code for this affiliate (e.g., PHIL or PARTNER123). If left empty, a random code will be generated.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createInvitation.isPending}>
              {createInvitation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
