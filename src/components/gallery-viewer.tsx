"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryViewerProps {
  images: string[];
  collectionName: string;
  /** Number of columns in the grid (default: responsive 1-4) */
  columns?: 2 | 3 | 4;
  /** Max images to show in the grid (lightbox still navigates all) */
  maxDisplay?: number;
}

const GRID_CLASSES = {
  2: "grid grid-cols-2 gap-3",
  3: "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
} as const;

export function GalleryViewer({ images, collectionName, columns, maxDisplay }: GalleryViewerProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImage === null) return;

      if (e.key === "Escape") {
        setSelectedImage(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedImage((prev) => (prev! > 0 ? prev! - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedImage((prev) => (prev! < images.length - 1 ? prev! + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, images.length]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (selectedImage !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedImage]);

  const handlePrevious = () => {
    setSelectedImage((prev) => (prev! > 0 ? prev! - 1 : images.length - 1));
  };

  const handleNext = () => {
    setSelectedImage((prev) => (prev! < images.length - 1 ? prev! + 1 : 0));
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className={columns ? GRID_CLASSES[columns] : GRID_CLASSES[4]}>
        {(maxDisplay ? images.slice(0, maxDisplay) : images).map((image, index) => (
          <div
            key={image}
            onClick={() => setSelectedImage(index)}
            className="group relative cursor-pointer overflow-hidden rounded-xl border border-cyan-400/20 bg-[#0d1f31]/40 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-500/20"
          >
            {/* Image */}
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={image}
                alt={`${collectionName} - Image ${index + 1}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1929]/90 via-[#0a1929]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Zoom Icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="rounded-full bg-cyan-400/20 p-3 backdrop-blur-sm">
                  <ZoomIn className="h-6 w-6 text-cyan-300" />
                </div>
              </div>
            </div>

            {/* Image Number */}
            <div className="absolute top-3 right-3 rounded-full bg-[#0a1929]/80 px-3 py-1 text-xs font-medium text-cyan-300 backdrop-blur-sm">
              {index + 1} / {images.length}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1929]/95 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <Button
            onClick={() => setSelectedImage(null)}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 h-12 w-12 rounded-full border border-cyan-400/30 bg-[#0d1f31]/80 text-cyan-300 backdrop-blur-sm hover:border-cyan-400/50 hover:bg-[#0d1f31] hover:text-cyan-100"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Previous Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            variant="ghost"
            size="icon"
            className="absolute top-1/2 left-4 z-10 h-12 w-12 -translate-y-1/2 rounded-full border border-cyan-400/30 bg-[#0d1f31]/80 text-cyan-300 backdrop-blur-sm hover:border-cyan-400/50 hover:bg-[#0d1f31] hover:text-cyan-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          {/* Next Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-4 z-10 h-12 w-12 -translate-y-1/2 rounded-full border border-cyan-400/30 bg-[#0d1f31]/80 text-cyan-300 backdrop-blur-sm hover:border-cyan-400/50 hover:bg-[#0d1f31] hover:text-cyan-100"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Image Container */}
          <div
            className="relative mx-auto max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Image
                src={images[selectedImage] ?? ""}
                alt={`${collectionName} - Image ${selectedImage + 1}`}
                width={1920}
                height={1080}
                className="max-h-[90vh] w-auto rounded-lg border border-cyan-400/30 object-contain shadow-2xl"
                priority
              />
            </div>

            {/* Image Counter */}
            <div className="mt-4 text-center">
              <span className="inline-block rounded-full border border-cyan-400/30 bg-[#0d1f31]/80 px-4 py-2 text-sm font-medium text-cyan-300 backdrop-blur-sm">
                {selectedImage + 1} / {images.length}
              </span>
            </div>

            {/* Keyboard Hints */}
            <div className="mt-2 text-center text-xs text-cyan-100/50">
              Use arrow keys to navigate • Press ESC to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
