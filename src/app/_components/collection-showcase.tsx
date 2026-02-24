"use client";

import { siteConfig } from "@/site.config";
import NextImage from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Home,
  Sparkles,
  ArrowRight,
} from "lucide-react";

type PricingTier = {
  id: number;
  displayLabel: string;
  percentage: number;
  fiatPrice: string;
  cryptoPrice: string;
};

type Collection = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  location: string | null;
  totalUnits: number;
  pricingTiers: PricingTier[];
  tierAvailability: Record<number, boolean>;
  available: boolean;
};

type ManualPaymentMethod = {
  id: string;
  name: string;
};

interface CollectionShowcaseProps {
  collections: Collection[];
  manualPaymentMethods?: ManualPaymentMethod[];
}

export function CollectionShowcase({ collections, manualPaymentMethods = [] }: CollectionShowcaseProps) {

  return (
    <section
      id="collection-showcase"
      className="relative overflow-hidden bg-gradient-to-b from-[#0f2435] to-[#0a1929] py-24"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322d3ee' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-300 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Invest in the Future of Ocean Living
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-cyan-100/70">
            Build your floating real estate portfolio with {siteConfig.brand.name}
            — combining real-estate investment with sustainable living on the
            Caribbean coast of Honduras
          </p>
        </div>

        {/* Collections Grid - Side by Side */}
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="group relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 shadow-2xl backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:shadow-cyan-500/20"
              >
                {/* Collection Image */}
                <div className="relative h-72 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0a1929]/40 via-transparent to-cyan-400/10 z-10" />
                  <NextImage
                    src={
                      collection.imageUrl ??
                      "https://arkpad.co/wp-content/uploads/2025/09/Reef-Resort-35.jpg"
                    }
                    alt={collection.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  {/* Floating Badge */}
                  <div
                    className={`absolute top-6 left-6 z-20 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm ${
                      collection.available
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500"
                        : "bg-gradient-to-r from-purple-500 to-pink-500"
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    {collection.available ? "Available Now" : "Coming Soon"}
                  </div>
                </div>

                {/* Collection Info */}
                <div className="p-8">
                  <h3 className="mb-3 text-3xl font-bold text-white">
                    {collection.name}
                  </h3>
                  <div className="mb-4 flex items-center gap-2 text-sm text-cyan-300/80">
                    <Home className="h-4 w-4" />
                    <span>
                      {collection.name === "Glamphouse"
                        ? "14 units (290 sq ft each)"
                        : collection.name === "Arkpad"
                          ? "2 units (490 sq ft each)"
                          : `${collection.totalUnits} Units`}
                    </span>
                  </div>
                  <p className="mb-6 text-sm leading-relaxed text-cyan-50/70">
                    {collection.description ?? ""}
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-col gap-3">
                    {collection.available ? (
                      <>
                        {/* Primary CTA - Book a Stay */}
                        <Link href={`/book/${collection.id}`} className="w-full">
                          <Button
                            size="lg"
                            className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-6 text-base font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 hover:from-cyan-300 hover:to-blue-400 hover:shadow-xl hover:shadow-cyan-500/30"
                          >
                            Book a Stay
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </Link>

                        {/* Subtle Secondary CTA - Become an Owner */}
                        <Link href={`/ownership/${collection.id}`} className="w-full">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs font-medium text-cyan-300/70 hover:bg-cyan-400/5 hover:text-cyan-300"
                          >
                            or explore ownership options
                            <ArrowRight className="ml-1.5 h-3 w-3" />
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Button
                        size="lg"
                        disabled
                        className="w-full rounded-full bg-gradient-to-r from-gray-500 to-gray-600 px-8 py-6 text-base font-bold text-white opacity-60"
                      >
                        Coming Soon
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
