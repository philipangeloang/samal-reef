"use client";

import { useState } from "react";
import Image from "next/image";
import { api, type RouterOutputs } from "@/trpc/react";
import { UploadDropzone } from "@/utils/uploadthing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, ChevronUp, ChevronDown, ImageIcon } from "lucide-react";

type Collection = RouterOutputs["collection"]["getAll"][number];

interface GalleryManagementClientProps {
  initialCollections: Collection[];
}

export function GalleryManagementClient({
  initialCollections,
}: GalleryManagementClientProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(initialCollections[0]?.id ?? null);

  const { data: collections = initialCollections } =
    api.collection.getAll.useQuery(undefined, {
      initialData: initialCollections,
      refetchOnMount: false,
    });

  const { data: images = [], isLoading: imagesLoading } =
    api.gallery.getByCollection.useQuery(
      { collectionId: selectedCollectionId! },
      { enabled: !!selectedCollectionId },
    );

  const utils = api.useUtils();

  const addImages = api.gallery.addImages.useMutation({
    onSuccess: async () => {
      toast.success("Images uploaded successfully");
      await utils.gallery.getByCollection.invalidate({
        collectionId: selectedCollectionId!,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save images");
    },
  });

  const deleteImage = api.gallery.deleteImage.useMutation({
    onSuccess: async () => {
      toast.success("Image deleted");
      await utils.gallery.getByCollection.invalidate({
        collectionId: selectedCollectionId!,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete image");
    },
  });

  const reorder = api.gallery.reorder.useMutation({
    onSuccess: async () => {
      await utils.gallery.getByCollection.invalidate({
        collectionId: selectedCollectionId!,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reorder images");
    },
  });

  const moveImage = (index: number, direction: "up" | "down") => {
    if (!selectedCollectionId) return;
    const newImages = [...images];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newImages.length) return;

    // Swap
    [newImages[index], newImages[swapIndex]] = [
      newImages[swapIndex]!,
      newImages[index]!,
    ];

    // Build new order
    const imageOrders = newImages.map((img, i) => ({
      id: img.id,
      displayOrder: i,
    }));

    reorder.mutate({
      collectionId: selectedCollectionId,
      imageOrders,
    });
  };

  return (
    <div className="space-y-6">
      {/* Collection Selector */}
      <Card className="border-cyan-400/20 bg-[#0d1f31]/80">
        <CardHeader>
          <CardTitle className="text-cyan-100">Select Collection</CardTitle>
          <CardDescription className="text-cyan-100/60">
            Choose a collection to manage its gallery images
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedCollectionId?.toString() ?? ""}
            onValueChange={(value) => setSelectedCollectionId(parseInt(value))}
          >
            <SelectTrigger className="w-full max-w-md border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
              <SelectValue placeholder="Select a collection..." />
            </SelectTrigger>
            <SelectContent className="border-cyan-400/30 bg-[#0d1f31]">
              {collections.map((collection) => (
                <SelectItem
                  key={collection.id}
                  value={collection.id.toString()}
                  className="text-cyan-100 focus:bg-cyan-400/20 focus:text-cyan-100"
                >
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCollectionId && (
        <>
          {/* Upload Section */}
          <Card className="border-cyan-400/20 bg-[#0d1f31]/80">
            <CardHeader>
              <CardTitle className="text-cyan-100">Upload Images</CardTitle>
              <CardDescription className="text-cyan-100/60">
                Upload up to 10 images at once (max 8MB each)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadDropzone
                endpoint="galleryUploader"
                onClientUploadComplete={(res) => {
                  if (!res?.length) return;
                  const uploaded = res.map((file) => ({
                    url: file.ufsUrl,
                    fileKey: file.key,
                  }));
                  addImages.mutate({
                    collectionId: selectedCollectionId,
                    images: uploaded,
                  });
                }}
                onUploadError={(error: Error) => {
                  toast.error(`Upload failed: ${error.message}`);
                }}
                className="border-cyan-400/30 ut-button:bg-gradient-to-r ut-button:from-cyan-400 ut-button:to-blue-500 ut-label:text-cyan-100 ut-allowed-content:text-cyan-100/60"
              />
            </CardContent>
          </Card>

          {/* Images Grid */}
          <Card className="border-cyan-400/20 bg-[#0d1f31]/80">
            <CardHeader>
              <CardTitle className="text-cyan-100">
                Gallery Images ({images.length})
              </CardTitle>
              <CardDescription className="text-cyan-100/60">
                Reorder images using the arrow buttons, or delete unwanted ones
              </CardDescription>
            </CardHeader>
            <CardContent>
              {imagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-cyan-100/50">
                  <ImageIcon className="mb-3 h-12 w-12" />
                  <p>No images yet. Upload some above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="group relative overflow-hidden rounded-xl border border-cyan-400/20 bg-[#0a1929]/50"
                    >
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={image.url}
                          alt={image.alt ?? `Gallery image ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </div>

                      {/* Controls overlay */}
                      <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        {/* Reorder buttons */}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-black/50 text-white hover:bg-black/70 hover:text-cyan-300"
                            onClick={() => moveImage(index, "up")}
                            disabled={
                              index === 0 || reorder.isPending
                            }
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-black/50 text-white hover:bg-black/70 hover:text-cyan-300"
                            onClick={() => moveImage(index, "down")}
                            disabled={
                              index === images.length - 1 ||
                              reorder.isPending
                            }
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-black/50 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                          onClick={() => deleteImage.mutate({ id: image.id })}
                          disabled={deleteImage.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Order badge */}
                      <div className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-cyan-300">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
