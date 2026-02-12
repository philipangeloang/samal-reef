import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GalleryViewer } from "./_components/gallery-viewer";
import {
  GALLERY_COLLECTIONS as COLLECTIONS,
  type GalleryCollectionKey as CollectionKey,
} from "@/lib/gallery-config";
import { siteConfig } from "@/site.config";

interface PageProps {
  params: Promise<{
    collection: string;
  }>;
}

export async function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((collection) => ({
    collection,
  }));
}

export default async function GalleryPage({ params }: PageProps) {
  const { collection } = await params;

  // Check if collection exists
  if (!(collection in COLLECTIONS)) {
    notFound();
  }

  const collectionData = COLLECTIONS[collection as CollectionKey];

  return (
    <div className="bg-linear-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      <div className="mx-auto min-h-screen max-w-7xl">
        {/* Background Effects */}

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="border-b border-cyan-400/20">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-cyan-300/80 transition-colors hover:text-cyan-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </div>

              <div className="mt-6">
                <h1 className="mb-2 bg-linear-to-r from-cyan-300 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
                  {collectionData.name} Gallery
                </h1>
                <p className="text-cyan-100/70">{collectionData.description}</p>
              </div>
            </div>
          </header>

          {/* Gallery */}
          <main className="container mx-auto px-4 py-12">
            <GalleryViewer
              images={Array.from(collectionData.images)}
              collectionName={collectionData.name}
            />
          </main>

          {/* Footer */}
          <footer className="border-t border-cyan-400/20 py-8">
            <div className="container mx-auto px-4 text-center">
              <p className="text-sm text-cyan-100/50">
                {collectionData.name} - {siteConfig.brand.name} Collection
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
