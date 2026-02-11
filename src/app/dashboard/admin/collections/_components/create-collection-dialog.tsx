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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCollectionDialog({
  open,
  onOpenChange,
}: CreateCollectionDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [location, setLocation] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("0");

  const utils = api.useUtils();

  const createCollection = api.collection.create.useMutation({
    onSuccess: async () => {
      toast.success("Collection created successfully");
      await utils.collection.invalidate();
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create collection");
    },
  });

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setImageUrl("");
    setLocation("");
    setIsActive(true);
    setDisplayOrder("0");
  };

  // Auto-generate slug from name
  const handleNameChange = (newName: string) => {
    setName(newName);
    // Auto-generate slug if it hasn't been manually edited
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) {
      setSlug(newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    if (!slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error("Slug must contain only lowercase letters, numbers, and hyphens");
      return;
    }

    createCollection.mutate({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      location: location.trim() || undefined,
      isActive,
      displayOrder: parseInt(displayOrder) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/95 to-[#0a1929]/95 sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Create New Collection</DialogTitle>
            <DialogDescription className="text-cyan-100/60">
              Add a new property collection to the platform
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-cyan-100">
                Collection Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Reef Resort Bungalows"
                required
                className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug" className="text-cyan-100">
                URL Slug <span className="text-red-400">*</span>
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="reef-resort-bungalows"
                required
                className="border-cyan-400/30 bg-[#0a1929]/50 font-mono text-white placeholder:text-cyan-100/40"
              />
              <p className="text-xs text-cyan-100/60">
                Used in URLs. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location" className="text-cyan-100">
                Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Roatan, Honduras"
                className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-cyan-100">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Luxurious beachfront properties with stunning ocean views..."
                rows={4}
                className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl" className="text-cyan-100">
                Hero Image URL
              </Label>
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayOrder" className="text-cyan-100">
                Display Order
              </Label>
              <Input
                id="displayOrder"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
                className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
              />
              <p className="text-xs text-cyan-100/60">
                Lower numbers appear first on the homepage
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
                className="border-cyan-400/30"
              />
              <Label htmlFor="isActive" className="text-cyan-100">
                Active (visible on frontend)
              </Label>
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
              className="border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCollection.isPending}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
            >
              {createCollection.isPending ? "Creating..." : "Create Collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
