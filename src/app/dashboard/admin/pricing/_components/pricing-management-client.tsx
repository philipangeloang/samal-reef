"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { currencySymbol } from "@/lib/currency";
import { CreateTierDialog } from "./create-tier-dialog";
import { EditTierDialog } from "./edit-tier-dialog";

type PricingTier = RouterOutputs["pricing"]["getAllTiers"][number];

interface PricingManagementClientProps {
  initialTiers: PricingTier[];
}

export function PricingManagementClient({ initialTiers }: PricingManagementClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string>("all");

  const { data: tiers = initialTiers } = api.pricing.getAllTiers.useQuery(undefined, {
    initialData: initialTiers,
    refetchOnMount: false,
  });

  const { data: collections = [] } = api.collection.getAll.useQuery();

  const utils = api.useUtils();

  // Filter tiers by collection
  const filteredTiers =
    collectionFilter === "all"
      ? tiers
      : tiers.filter((tier) => tier.collectionId.toString() === collectionFilter);

  const deactivateTier = api.pricing.deactivateTier.useMutation({
    onSuccess: async () => {
      toast.success("Pricing tier deactivated");
      await utils.pricing.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to deactivate tier");
    },
  });

  const handleDeactivate = (tierId: number) => {
    if (confirm("Are you sure you want to deactivate this pricing tier?")) {
      deactivateTier.mutate({ id: tierId });
    }
  };

  return (
    <>
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Pricing Tiers</CardTitle>
              <CardDescription className="text-cyan-100/60">
                {filteredTiers.length} of {tiers.length} tiers ({filteredTiers.filter((t) => t.isActive).length} active)
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Tier
            </Button>
          </div>

          {/* Filter Section */}
          <div className="mt-4 flex items-center gap-3">
            <Select
              value={collectionFilter}
              onValueChange={setCollectionFilter}
            >
              <SelectTrigger className="w-[250px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                <SelectValue placeholder="Filter by collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collections</SelectItem>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id.toString()}>
                    {collection.name} ({collection.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {collectionFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollectionFilter("all")}
                className="text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-cyan-400/20">
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                  <TableHead className="text-cyan-100">Label</TableHead>
                  <TableHead className="text-cyan-100">Percentage</TableHead>
                  <TableHead className="text-cyan-100">Crypto Price</TableHead>
                  <TableHead className="text-cyan-100">Fiat Price</TableHead>
                  <TableHead className="text-cyan-100">Status</TableHead>
                  <TableHead className="text-cyan-100">Effective From</TableHead>
                  <TableHead className="text-cyan-100">Effective Until</TableHead>
                  <TableHead className="text-right text-cyan-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTiers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-cyan-100/60">
                      {tiers.length === 0
                        ? "No pricing tiers found. Create your first tier to get started."
                        : "No pricing tiers match the selected filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTiers.map((tier) => (
                    <TableRow
                      key={tier.id}
                      className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                    >
                      <TableCell className="font-medium text-white">
                        {tier.displayLabel}
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {(tier.percentage / 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {tier.cryptoPrice} USDC
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {currencySymbol}{tier.fiatPrice}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            tier.isActive
                              ? "bg-green-400/20 text-green-300"
                              : "bg-gray-400/20 text-gray-300"
                          }
                        >
                          {tier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {new Date(tier.effectiveFrom).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {tier.effectiveUntil
                          ? new Date(tier.effectiveUntil).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTier(tier)}
                          className="text-cyan-400 hover:bg-cyan-400/20 hover:text-cyan-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {tier.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeactivate(tier.id)}
                            disabled={deactivateTier.isPending}
                            className="text-orange-400 hover:bg-orange-400/20 hover:text-orange-300"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateTierDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditTierDialog
        open={!!editingTier}
        onOpenChange={(open) => { if (!open) setEditingTier(null); }}
        tier={editingTier}
      />
    </>
  );
}
