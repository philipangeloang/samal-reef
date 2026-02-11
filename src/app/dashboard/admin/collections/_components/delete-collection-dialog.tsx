"use client";

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
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

type Collection = RouterOutputs["collection"]["getAll"][number];

interface DeleteCollectionDialogProps {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteCollectionDialog({
  collection,
  open,
  onOpenChange,
}: DeleteCollectionDialogProps) {
  const utils = api.useUtils();

  const deleteCollection = api.collection.delete.useMutation({
    onSuccess: async () => {
      toast.success("Collection deleted successfully");
      await utils.collection.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete collection");
    },
  });

  const handleDelete = () => {
    deleteCollection.mutate({ id: collection.id });
  };

  const hasUnitsOrTiers = collection.unitCount > 0 || collection.pricingTierCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/95 to-[#0a1929]/95 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white">Delete Collection</DialogTitle>
          <DialogDescription className="text-cyan-100/60">
            Are you sure you want to delete this collection?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4">
            <p className="font-medium text-white">{collection.name}</p>
            <p className="mt-1 text-sm text-cyan-100/60">
              Slug: <code className="rounded bg-cyan-400/20 px-1">{collection.slug}</code>
            </p>
          </div>

          {hasUnitsOrTiers && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <div>
                  <p className="font-medium text-red-300">Cannot Delete</p>
                  <p className="mt-1 text-sm text-red-200/80">
                    This collection has:
                  </p>
                  <ul className="mt-2 list-inside list-disc text-sm text-red-200/80">
                    {collection.unitCount > 0 && (
                      <li>{collection.unitCount} unit(s)</li>
                    )}
                    {collection.pricingTierCount > 0 && (
                      <li>{collection.pricingTierCount} pricing tier(s)</li>
                    )}
                  </ul>
                  <p className="mt-2 text-sm text-red-200/80">
                    Delete or reassign all units and pricing tiers before deleting this
                    collection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!hasUnitsOrTiers && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                <div>
                  <p className="font-medium text-amber-300">Warning</p>
                  <p className="mt-1 text-sm text-amber-200/80">
                    This action cannot be undone. This will permanently delete the
                    collection from the database.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteCollection.isPending || hasUnitsOrTiers}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {deleteCollection.isPending ? "Deleting..." : "Delete Collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
