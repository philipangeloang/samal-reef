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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Unit {
  id: number;
  name: string;
  collectionId: number;
  description: string | null;
  imageUrl: string | null;
  status: "AVAILABLE" | "SOLD_OUT" | "DRAFT";
}

interface EditUnitDialogProps {
  unit: Unit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUnitDialog({
  unit,
  open,
  onOpenChange,
}: EditUnitDialogProps) {
  const [collectionId, setCollectionId] = useState(unit.collectionId.toString());
  const [name, setName] = useState(unit.name);
  const [description, setDescription] = useState(unit.description ?? "");
  const [imageUrl, setImageUrl] = useState(unit.imageUrl ?? "");
  const [status, setStatus] = useState<"AVAILABLE" | "SOLD_OUT" | "DRAFT">(
    unit.status,
  );

  useEffect(() => {
    setCollectionId(unit.collectionId.toString());
    setName(unit.name);
    setDescription(unit.description ?? "");
    setImageUrl(unit.imageUrl ?? "");
    setStatus(unit.status);
  }, [unit]);

  const utils = api.useUtils();

  // Fetch collections for dropdown
  const { data: collections = [] } = api.collection.getAll.useQuery();

  const updateUnit = api.units.update.useMutation({
    onSuccess: async () => {
      toast.success("Unit updated successfully");
      await utils.units.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update unit");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!collectionId) {
      toast.error("Please select a collection");
      return;
    }

    if (!name.trim()) {
      toast.error("Unit name is required");
      return;
    }

    updateUnit.mutate({
      id: unit.id,
      name: name.trim(),
      collectionId: parseInt(collectionId),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>Update property unit details</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-collectionId">Property Collection *</Label>
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
              <p className="text-muted-foreground text-xs">
                The property collection this unit belongs to
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-name">Unit Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ocean View Villa"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Luxurious beachfront property with stunning ocean views..."
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-imageUrl">Image URL</Label>
              <Input
                id="edit-imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value: "AVAILABLE" | "SOLD_OUT" | "DRAFT") =>
                  setStatus(value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="SOLD_OUT">Sold Out</SelectItem>
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={updateUnit.isPending}>
              {updateUnit.isPending ? "Updating..." : "Update Unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
