"use client";

import { useState } from "react";
import { currencySymbol } from "@/lib/currency";
import { siteConfig } from "@/site.config";
import NextImage from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Home,
  Waves,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
} from "lucide-react";
import { PurchaseButton } from "./purchase-button";
import { ManualPaymentButton } from "./manual-payment-button";
import { getAffiliateCode } from "@/hooks/use-affiliate-tracking";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"FIAT" | "CRYPTO" | "MANUAL">("FIAT");

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % collections.length);
  };

  const prevSlide = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + collections.length) % collections.length,
    );
  };

  const currentCollection = collections[currentIndex]!;

  return (
    <section
      id="collection-showcase"
      className="relative overflow-hidden bg-linear-to-b from-[#0f2435] to-[#0a1929] py-24"
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
        <div className="mb-12 text-center">
          <h2 className="mb-4 bg-linear-to-r from-cyan-300 via-cyan-400 to-blue-300 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Invest in the Future of Ocean Living
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-cyan-100/70">
            Build your floating real estate portfolio with {siteConfig.brand.name}
            — combining real-estate investment with sustainable living on the
            Caribbean coast of Honduras
          </p>
        </div>

        {/* Navigation Buttons - Top Center */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <Button
            onClick={prevSlide}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-2 border-cyan-400/40 bg-[#0d1f31]/80 text-cyan-300 backdrop-blur-sm transition-all hover:border-cyan-400 hover:bg-cyan-400/20 hover:text-cyan-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          {/* Slide Indicators */}
          <div className="flex gap-2">
            {collections.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-8 bg-cyan-400"
                    : "w-2 bg-cyan-400/30 hover:bg-cyan-400/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <Button
            onClick={nextSlide}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-2 border-cyan-400/40 bg-[#0d1f31]/80 text-cyan-300 backdrop-blur-sm transition-all hover:border-cyan-400 hover:bg-cyan-400/20 hover:text-cyan-100"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Collection Card */}
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-linear-to-br from-[#0d1f31]/90 to-[#0a1929]/90 shadow-2xl backdrop-blur-sm">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Collection Image - Compact */}
              <div className="relative h-64 overflow-hidden md:h-auto">
                <div className="absolute inset-0 bg-linear-to-br from-[#0a1929]/40 via-transparent to-cyan-400/10" />
                <NextImage
                  src={
                    currentCollection.imageUrl ??
                    "https://arkpad.co/wp-content/uploads/2025/09/Reef-Resort-35.jpg"
                  }
                  alt={currentCollection.name}
                  fill
                  className="object-cover transition-all duration-500"
                />

                {/* Floating Badge */}
                <div
                  className={`absolute top-4 left-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 backdrop-blur-sm ${
                    currentCollection.available
                      ? "bg-linear-to-r from-cyan-400 to-blue-500"
                      : "bg-linear-to-r from-purple-500 to-pink-500"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  {currentCollection.available
                    ? "Available Now"
                    : "Coming Soon"}
                </div>
              </div>

              {/* Collection Info - Compact */}
              <div className="flex flex-col justify-between p-6 md:py-8 md:pr-8">
                <div>
                  <h3 className="mb-2 text-2xl font-bold text-white md:text-3xl">
                    {currentCollection.name}
                  </h3>
                  <div className="mb-3 flex items-center gap-2 text-sm text-cyan-300/80">
                    <Home className="h-4 w-4" />
                    <span>
                      {currentCollection.name === "Glamphouse"
                        ? "24 units (290 sq ft each)"
                        : currentCollection.name === "Arkpad"
                          ? "2 units (490 sq ft each)"
                          : `${currentCollection.totalUnits} Units`}
                    </span>
                  </div>
                  <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-cyan-50/70">
                    {currentCollection.description ?? ""}
                  </p>

                  {/* Features - Compact Inline */}
                  <div className="mb-5 flex flex-wrap gap-2">
                    <div className="group inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10">
                      <Home className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="font-medium text-cyan-100">
                        Usage Rights
                      </span>
                    </div>
                    <div className="group inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10">
                      <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="font-medium text-cyan-100">
                        Flexible Terms
                      </span>
                    </div>
                    <div className="group inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10">
                      <Waves className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="font-medium text-cyan-100">
                        Eco-Restorative Vision
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {currentCollection.available ? (
                    <>
                      <Link href={`/gallery/${currentCollection.slug.toLowerCase()}`}>
                        <Button
                          size="sm"
                          className="rounded-full bg-linear-to-r from-cyan-400 to-blue-500 px-6 py-5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 hover:from-cyan-300 hover:to-blue-400 hover:shadow-xl hover:shadow-cyan-500/30"
                        >
                          View Gallery
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/book/${currentCollection.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-2 border-cyan-400/50 bg-transparent px-6 py-5 text-sm font-bold text-cyan-100 transition-all hover:scale-105 hover:border-cyan-400 hover:bg-cyan-400/20"
                        >
                          Book a Stay
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled
                        className="rounded-full bg-linear-to-r from-gray-500 to-gray-600 px-6 py-5 text-sm font-bold text-white opacity-60"
                      >
                        Coming Soon
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <p className="text-xs text-cyan-200/60">Join waitlist</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section - Only show for available collections */}
          {currentCollection.available &&
            currentCollection.pricingTiers.length > 0 && (
              <div id="pricing-section" className="mt-8">
                <div className="overflow-hidden rounded-3xl border border-cyan-400/30 bg-linear-to-br from-[#0d1f31]/95 to-[#0a1929]/95 p-8 shadow-2xl backdrop-blur-sm lg:p-12">
                  {/* Payment Method Toggle */}
                  <div className="mb-8 flex justify-center">
                    <div className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-cyan-400/30 bg-[#0a1929]/50 p-1">
                      <button
                        onClick={() => setPaymentMethod("FIAT")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-6 ${
                          paymentMethod === "FIAT"
                            ? "bg-linear-to-r from-cyan-400 to-blue-500 text-white shadow-lg"
                            : "text-cyan-300 hover:text-cyan-100"
                        }`}
                      >
                        Pay with Card
                      </button>
                      <button
                        onClick={() => setPaymentMethod("CRYPTO")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-6 ${
                          paymentMethod === "CRYPTO"
                            ? "bg-linear-to-r from-cyan-400 to-blue-500 text-white shadow-lg"
                            : "text-cyan-300 hover:text-cyan-100"
                        }`}
                      >
                        Pay with Crypto
                      </button>
                      {manualPaymentMethods.length > 0 && (
                        <button
                          onClick={() => setPaymentMethod("MANUAL")}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-6 ${
                            paymentMethod === "MANUAL"
                              ? "bg-linear-to-r from-cyan-400 to-blue-500 text-white shadow-lg"
                              : "text-cyan-300 hover:text-cyan-100"
                          }`}
                        >
                          Pay Manually
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pricing Tiers Grid */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {currentCollection.pricingTiers.map((tier) => {
                      const isAvailable =
                        currentCollection.tierAvailability[tier.percentage] ??
                        false;

                      return (
                        <div
                          key={tier.id}
                          className={`relative overflow-hidden rounded-2xl border p-6 transition-all ${
                            isAvailable
                              ? "border-cyan-400/40 bg-linear-to-br from-cyan-400/10 to-blue-500/10 shadow-lg hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/20"
                              : "border-cyan-400/20 bg-cyan-400/5 opacity-60"
                          }`}
                        >
                          {/* Tier Label */}
                          <div className="mb-4">
                            <h4 className="text-xl font-bold text-cyan-100">
                              {tier.displayLabel}
                            </h4>
                          </div>

                          {/* Price */}
                          <div className="mb-6">
                            <div className="text-3xl font-bold text-cyan-100">
                              {paymentMethod === "CRYPTO"
                                ? `${Number(tier.cryptoPrice).toLocaleString()} USDC`
                                : `${currencySymbol}${Number(tier.fiatPrice).toLocaleString()}`}
                            </div>
                          </div>

                          {/* Benefits */}
                          <div className="mb-6 space-y-2">
                            <div className="flex items-start gap-2 text-sm text-cyan-100/80">
                              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                              <span>{(tier.percentage / 100).toFixed(2)}% revenue share</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-cyan-100/80">
                              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                              <span>Tradeable NFT certificate</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-cyan-100/80">
                              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                              <span>Seastead access rights</span>
                            </div>
                          </div>

                          {/* Purchase Button */}
                          {paymentMethod === "MANUAL" ? (
                            <ManualPaymentButton
                              collectionId={currentCollection.id}
                              tierId={tier.id}
                              tierLabel={tier.displayLabel}
                              isAvailable={isAvailable}
                              manualPaymentMethods={manualPaymentMethods}
                            />
                          ) : (
                            <PurchaseButton
                              collectionId={currentCollection.id}
                              tierId={tier.id}
                              tierLabel={tier.displayLabel}
                              isAvailable={isAvailable}
                              paymentMethod={paymentMethod}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          {/* Coming Soon Message for Arkpad */}
          {!currentCollection.available && (
            <div className="mt-8 text-center">
              <div className="rounded-3xl border border-amber-400/30 bg-linear-to-br from-amber-400/10 to-orange-400/10 p-8 backdrop-blur-sm">
                <h4 className="mb-2 text-2xl font-bold text-amber-100">
                  Coming Soon
                </h4>
                <p className="text-amber-100/70">
                  Stay tuned for investment opportunities in this exclusive
                  collection
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Collection Counter */}
        <div className="mt-8 text-center text-sm text-cyan-300/60">
          Collection {currentIndex + 1} of {collections.length}
        </div>
      </div>
    </section>
  );
}
