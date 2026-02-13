import Link from "next/link";
import NextImage from "next/image";
import { api } from "@/trpc/server";
import { ArrowRight, MapPin, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GALLERY_COLLECTIONS } from "@/lib/gallery-config";
import { GalleryViewer } from "@/components/gallery-viewer";
import { siteConfig } from "@/site.config";

export default async function BookPage() {
  // Get all active collections (public endpoint, no auth required)
  const activeCollections = await api.collection.getActiveForBooking();

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 bg-linear-to-r from-cyan-300 via-cyan-400 to-blue-300 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Book Your Stay
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-cyan-100/70">
            Experience luxury living at our seasteading resort. Select a property
            collection below to check availability and book your stay.
          </p>
        </div>

        {/* Collections Grid */}
        {activeCollections.length > 0 ? (
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3">
            {activeCollections.map((collection) => (
              <Link
                key={collection.id}
                href={`/book/${collection.id}`}
                className="group w-full overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#0d1f31]/80 transition-all hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"
              >
                <div className="relative h-48">
                  <NextImage
                    src={
                      collection.imageUrl ??
                      "https://arkpad.co/wp-content/uploads/2025/09/Reef-Resort-35.jpg"
                    }
                    alt={collection.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f31] to-transparent" />
                </div>

                <div className="p-6">
                  <h2 className="mb-2 text-xl font-bold text-white group-hover:text-cyan-300">
                    {collection.name}
                  </h2>

                  {collection.location && (
                    <div className="mb-3 flex items-center gap-2 text-sm text-cyan-300/70">
                      <MapPin className="h-4 w-4" />
                      <span>{collection.location}</span>
                    </div>
                  )}

                  <p className="mb-4 line-clamp-2 text-sm text-cyan-100/60">
                    {collection.description ?? "Book your stay at this beautiful property."}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-cyan-300/70">
                      <Home className="h-4 w-4" />
                      <span>{collection.unitCount} units</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/20 hover:text-white"
                    >
                      View
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-cyan-400/20 bg-[#0d1f31]/80 p-12 text-center">
            <Home className="mx-auto h-12 w-12 text-cyan-400/50" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              No Properties Available
            </h2>
            <p className="mt-2 text-cyan-100/70">
              There are currently no properties available for booking. Please check
              back later.
            </p>
            <Button asChild className="mt-6 bg-gradient-to-r from-cyan-500 to-blue-500">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        )}

        {/* Combined Gallery */}
        <div className="mx-auto mt-16 max-w-4xl space-y-4">
          <h2 className="text-center text-2xl font-bold text-white">Gallery</h2>
          <GalleryViewer
            images={Object.values(GALLERY_COLLECTIONS).flatMap((c) => Array.from(c.images))}
            collectionName={siteConfig.brand.name}
            columns={2}
          />
        </div>

      </div>
    </div>
  );
}
