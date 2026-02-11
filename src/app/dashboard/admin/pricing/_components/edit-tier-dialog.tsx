"use client";

import { useEffect, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type PricingTier = RouterOutputs["pricing"]["getAllTiers"][number];

interface EditTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: PricingTier | null;
}

export function EditTierDialog({ open, onOpenChange, tier }: EditTierDialogProps) {
  const [displayLabel, setDisplayLabel] = useState("");
  const [cryptoPrice, setCryptoPrice] = useState("");
  const [fiatPrice, setFiatPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  const utils = api.useUtils();

  // Populate form when tier changes
  useEffect(() => {
    if (tier) {
      setDisplayLabel(tier.displayLabel);
      setCryptoPrice(tier.cryptoPrice);
      setFiatPrice(tier.fiatPrice);
      setIsActive(tier.isActive);
    }
  }, [tier]);

  const updateTier = api.pricing.updateTier.useMutation({
    onSuccess: async () => {
      toast.success("Pricing tier updated successfully");
      await utils.pricing.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update pricing tier");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tier) return;

    const cryptoPriceNum = parseFloat(cryptoPrice);
    const fiatPriceNum = parseFloat(fiatPrice);

    if (isNaN(cryptoPriceNum) || cryptoPriceNum < 0) {
      toast.error("Invalid crypto price");
      return;
    }

    if (isNaN(fiatPriceNum) || fiatPriceNum < 0) {
      toast.error("Invalid fiat price");
      return;
    }

    updateTier.mutate({
      id: tier.id,
      cryptoPrice: cryptoPriceNum.toFixed(2),
      fiatPrice: fiatPriceNum.toFixed(2),
      displayLabel: displayLabel.trim(),
      isActive,
    });
  };

  if (!tier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Pricing Tier</DialogTitle>
            <DialogDescription>
              Update pricing for the {tier.displayLabel} tier ({(tier.percentage / 100).toFixed(0)}% ownership)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editDisplayLabel">Display Label *</Label>
              <Input
                id="editDisplayLabel"
                value={displayLabel}
                onChange={(e) => setDisplayLabel(e.target.value)}
                placeholder="e.g., 1%, 5%, 10%"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editCryptoPrice">Crypto Price (USDC) *</Label>
              <Input
                id="editCryptoPrice"
                type="number"
                step="0.01"
                min="0"
                value={cryptoPrice}
                onChange={(e) => setCryptoPrice(e.target.value)}
                placeholder="1100.00"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editFiatPrice">Fiat Price (PHP) *</Label>
              <Input
                id="editFiatPrice"
                type="number"
                step="0.01"
                min="0"
                value={fiatPrice}
                onChange={(e) => setFiatPrice(e.target.value)}
                placeholder="1200.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Fiat price is typically higher than crypto price
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="editIsActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Whether this tier is available for purchase
                </p>
              </div>
              <Switch
                id="editIsActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
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
            <Button type="submit" disabled={updateTier.isPending}>
              {updateTier.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
