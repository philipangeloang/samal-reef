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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { currencyCode } from "@/lib/currency";

interface CreateTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTierDialog({ open, onOpenChange }: CreateTierDialogProps) {
  const [collectionId, setCollectionId] = useState("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [percentage, setPercentage] = useState("");
  const [cryptoPrice, setCryptoPrice] = useState("");
  const [fiatPrice, setFiatPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  const utils = api.useUtils();

  // Fetch collections for dropdown
  const { data: collections = [] } = api.collection.getAll.useQuery();

  const createTier = api.pricing.createTier.useMutation({
    onSuccess: async () => {
      toast.success("Pricing tier created successfully");
      await utils.pricing.invalidate();
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create pricing tier");
    },
  });

  const resetForm = () => {
    setCollectionId("");
    setDisplayLabel("");
    setPercentage("");
    setCryptoPrice("");
    setFiatPrice("");
    setIsActive(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!collectionId) {
      toast.error("Please select a collection");
      return;
    }

    // Validate percentage
    const percentageNum = parseFloat(percentage);
    if (isNaN(percentageNum) || percentageNum < 1 || percentageNum > 100) {
      toast.error("Percentage must be between 1 and 100");
      return;
    }

    // Convert percentage to basis points
    const percentageBasisPoints = Math.round(percentageNum * 100);

    // Validate prices
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

    createTier.mutate({
      collectionId: parseInt(collectionId),
      percentage: percentageBasisPoints,
      cryptoPrice: cryptoPriceNum.toFixed(2),
      fiatPrice: fiatPriceNum.toFixed(2),
      displayLabel: displayLabel.trim(),
      isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Pricing Tier</DialogTitle>
            <DialogDescription>
              Add a new pricing tier for unit ownership
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="collectionId">Property Collection *</Label>
              <Select
                value={collectionId}
                onValueChange={setCollectionId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id.toString()}>
                      {collection.name} ({collection.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The property collection this pricing tier belongs to
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayLabel">Display Label *</Label>
              <Input
                id="displayLabel"
                value={displayLabel}
                onChange={(e) => setDisplayLabel(e.target.value)}
                placeholder="e.g., 1%, 5%, 10%"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="percentage">Ownership Percentage *</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                min="1"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="1.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the percentage (e.g., 1 for 1%, 12 for 12%)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cryptoPrice">Crypto Price (USDC) *</Label>
              <Input
                id="cryptoPrice"
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
              <Label htmlFor="fiatPrice">Fiat Price ({currencyCode}) *</Label>
              <Input
                id="fiatPrice"
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
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Make this tier available immediately
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
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
            <Button type="submit" disabled={createTier.isPending}>
              {createTier.isPending ? "Creating..." : "Create Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
