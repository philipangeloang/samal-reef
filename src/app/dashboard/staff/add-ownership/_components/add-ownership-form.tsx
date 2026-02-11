"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

type Collection = RouterOutputs["collection"]["getAll"][number];

interface AddOwnershipFormProps {
  collections: Collection[];
  isAdmin: boolean;
}

export function AddOwnershipForm({ collections, isAdmin }: AddOwnershipFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch staff's affiliate code
  const { data: affiliateData } = api.user.getMyAffiliateCode.useQuery();

  // Form state
  const [investorEmail, setInvestorEmail] = useState("");
  const [investorName, setInvestorName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"FIAT" | "CRYPTO" | "MANUAL">("MANUAL");
  const [internalNotes, setInternalNotes] = useState("");

  // Get pricing tiers for selected collection
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
  const pricingTiers = selectedCollection?.pricingTiers ?? [];

  // Get selected tier details
  const selectedTier = pricingTiers.find((t) => t.id === selectedTierId);

  const createOwnership = api.staffEntry.createOwnership.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      router.push("/dashboard/staff/submissions");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create ownership entry");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedCollectionId || !selectedTierId) {
      toast.error("Please select a collection and pricing tier");
      setIsSubmitting(false);
      return;
    }

    if (!investorEmail) {
      toast.error("Please enter investor email");
      setIsSubmitting(false);
      return;
    }

    if (!purchasePrice) {
      toast.error("Please select a pricing tier");
      setIsSubmitting(false);
      return;
    }

    createOwnership.mutate({
      investorEmail,
      investorName: investorName || undefined,
      collectionId: selectedCollectionId,
      pricingTierId: selectedTierId,
      purchasePrice,
      currency: "PHP",
      paymentMethod,
      affiliateCode: affiliateData?.affiliateCode || undefined,
      internalNotes: internalNotes || undefined,
    });
  };

  // Auto-fill price when tier is selected
  const handleTierChange = (tierId: string) => {
    const tier = pricingTiers.find((t) => t.id === parseInt(tierId));
    setSelectedTierId(parseInt(tierId));
    if (tier) {
      // Use fiat price by default
      setPurchasePrice(tier.fiatPrice);
    }
  };

  return (
    <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-400/10 p-2">
            <Building2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-white">Ownership Details</CardTitle>
            <CardDescription className="text-cyan-100/60">
              {isAdmin
                ? "Entry will be immediately approved"
                : "Entry will be submitted for admin approval"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Investor Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cyan-300">Investor Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="investorEmail" className="text-cyan-100">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="investorEmail"
                  type="email"
                  value={investorEmail}
                  onChange={(e) => setInvestorEmail(e.target.value)}
                  placeholder="investor@example.com"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investorName" className="text-cyan-100">
                  Name (optional)
                </Label>
                <Input
                  id="investorName"
                  type="text"
                  value={investorName}
                  onChange={(e) => setInvestorName(e.target.value)}
                  placeholder="John Doe"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>
            </div>
          </div>

          {/* Property Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cyan-300">Property Selection</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="collection" className="text-cyan-100">
                  Collection <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={selectedCollectionId?.toString() ?? ""}
                  onValueChange={(value) => {
                    setSelectedCollectionId(parseInt(value));
                    setSelectedTierId(null);
                  }}
                >
                  <SelectTrigger className="w-full border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id.toString()}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricingTier" className="text-cyan-100">
                  Pricing Tier <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={selectedTierId?.toString() ?? ""}
                  onValueChange={handleTierChange}
                  disabled={!selectedCollectionId}
                >
                  <SelectTrigger className="w-full border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                    <SelectValue placeholder="Select pricing tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingTiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id.toString()}>
                        {tier.displayLabel} - ₱{tier.fiatPrice} ({(tier.percentage / 100).toFixed(2)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedTier && (
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
                <p className="text-sm text-cyan-100/70">
                  Selected: <span className="font-medium text-white">{selectedTier.displayLabel}</span>
                  {" - "}
                  <span className="text-green-400">₱{selectedTier.fiatPrice}</span>
                  {" for "}
                  <span className="text-blue-400">{(selectedTier.percentage / 100).toFixed(2)}%</span>
                  {" ownership"}
                </p>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cyan-300">Payment Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice" className="text-cyan-100">
                  Amount (PHP)
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  disabled
                  placeholder="Select a pricing tier"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="text-xs text-cyan-100/50">
                  Auto-filled from pricing tier
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-cyan-100">
                  Payment Method
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "FIAT" | "CRYPTO" | "MANUAL")}
                >
                  <SelectTrigger className="w-full border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual/Bank Transfer</SelectItem>
                    <SelectItem value="FIAT">Fiat (Card)</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cyan-300">Additional Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="affiliateCode" className="text-cyan-100">
                  Affiliate Code
                  {affiliateData?.isAffiliate && (
                    <span className="ml-2 text-xs text-green-400">(Your code)</span>
                  )}
                </Label>
                <Input
                  id="affiliateCode"
                  type="text"
                  value={affiliateData?.affiliateCode ?? ""}
                  disabled
                  placeholder={affiliateData?.isAffiliate ? "" : "Not an affiliate"}
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {!affiliateData?.isAffiliate && (
                  <p className="text-xs text-cyan-100/50">
                    You are not an affiliate. No commission will be applied.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalNotes" className="text-cyan-100">
                  Internal Notes (optional)
                </Label>
                <Textarea
                  id="internalNotes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Any notes about this entry..."
                  className="min-h-[80px] border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : isAdmin ? (
                "Create & Approve"
              ) : (
                "Submit for Approval"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
