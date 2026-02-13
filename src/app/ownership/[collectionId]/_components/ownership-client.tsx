"use client";

import { useState } from "react";
import { currencySymbol } from "@/lib/currency";
import NextImage from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Waves, Sparkles, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { PurchaseButton } from "@/app/_components/purchase-button";
import { ManualPaymentButton } from "@/app/_components/manual-payment-button";

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
};

type ManualPaymentMethod = {
  id: string;
  name: string;
};

interface OwnershipClientProps {
  collection: Collection;
  manualPaymentMethods?: ManualPaymentMethod[];
}

export function OwnershipClient({
  collection,
  manualPaymentMethods = [],
}: OwnershipClientProps) {
  const [paymentMethod, setPaymentMethod] = useState<
    "FIAT" | "CRYPTO" | "MANUAL"
  >("FIAT");

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322d3ee' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="container relative mx-auto px-4">
          {/* Back Button */}
          <Link href="/#collection-showcase">
            <Button
              variant="ghost"
              className="mb-8 text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Collections
            </Button>
          </Link>

          {/* Collection Header */}
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 shadow-2xl backdrop-blur-sm">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Collection Image */}
                <div className="relative h-80 overflow-hidden lg:h-auto">
                  <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#0a1929]/40 via-transparent to-cyan-400/10" />
                  <NextImage
                    src={
                      collection.imageUrl ??
                      "https://arkpad.co/wp-content/uploads/2025/09/Reef-Resort-35.jpg"
                    }
                    alt={collection.name}
                    fill
                    className="object-cover"
                  />

                  {/* Floating Badge */}
                  <div className="absolute top-6 left-6 z-20 flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
                    <Sparkles className="h-4 w-4" />
                    Available Now
                  </div>
                </div>

                {/* Collection Info */}
                <div className="flex flex-col justify-center p-8 lg:p-12">
                  <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
                    {collection.name}
                  </h1>
                  <div className="mb-6 flex items-center gap-2 text-cyan-300/80">
                    <Home className="h-5 w-5" />
                    <span>
                      {collection.name === "Glamphouse"
                        ? "24 units (290 sq ft each)"
                        : collection.name === "Arkpad"
                          ? "2 units (490 sq ft each)"
                          : `${collection.totalUnits} Units`}
                    </span>
                  </div>
                  <p className="mb-8 text-lg leading-relaxed text-cyan-50/70">
                    {collection.description ?? ""}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-sm transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10">
                      <Home className="h-4 w-4 text-cyan-400" />
                      <span className="font-medium text-cyan-100">
                        Usage Rights
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-sm transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10">
                      <ArrowRight className="h-4 w-4 text-cyan-400" />
                      <span className="font-medium text-cyan-100">
                        Flexible Terms
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-sm transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10">
                      <Waves className="h-4 w-4 text-cyan-400" />
                      <span className="font-medium text-cyan-100">
                        Eco-Restorative Vision
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/95 to-[#0a1929]/95 p-8 shadow-2xl backdrop-blur-sm lg:p-12">
              {/* Section Header */}
              <div className="mb-12 text-center">
                <h2 className="mb-4 bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-300 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                  Choose Your Ownership Tier
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-cyan-100/70">
                  Select the ownership percentage that fits your investment goals
                </p>
              </div>

              {/* Payment Method Toggle */}
              <div className="mb-12 flex justify-center">
                <div className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-cyan-400/30 bg-[#0a1929]/50 p-1">
                  <button
                    onClick={() => setPaymentMethod("FIAT")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-6 ${
                      paymentMethod === "FIAT"
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg"
                        : "text-cyan-300 hover:text-cyan-100"
                    }`}
                  >
                    Pay with Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod("CRYPTO")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-6 ${
                      paymentMethod === "CRYPTO"
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg"
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
                          ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg"
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
                {collection.pricingTiers.map((tier) => {
                  const isAvailable =
                    collection.tierAvailability[tier.percentage] ?? false;

                  return (
                    <div
                      key={tier.id}
                      className={`relative overflow-hidden rounded-2xl border p-6 transition-all ${
                        isAvailable
                          ? "border-cyan-400/40 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 shadow-lg hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/20"
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
                          <span>
                            {(tier.percentage / 100).toFixed(2)}% revenue share
                          </span>
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
                          collectionId={collection.id}
                          tierId={tier.id}
                          tierLabel={tier.displayLabel}
                          isAvailable={isAvailable}
                          manualPaymentMethods={manualPaymentMethods}
                        />
                      ) : (
                        <PurchaseButton
                          collectionId={collection.id}
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
        </div>
      </section>

      {/* Additional Info Section */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/60 to-[#0a1929]/60 p-8 backdrop-blur-sm lg:p-12">
              <h3 className="mb-6 text-2xl font-bold text-white md:text-3xl">
                What You Get
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-2 text-lg font-bold text-cyan-100">
                      Revenue Sharing
                    </h4>
                    <p className="text-sm leading-relaxed text-cyan-200/70">
                      Earn passive income from rental revenue based on your
                      ownership percentage
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-2 text-lg font-bold text-cyan-100">
                      NFT Certificate
                    </h4>
                    <p className="text-sm leading-relaxed text-cyan-200/70">
                      Blockchain-verified ownership that can be traded or
                      transferred at any time
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-2 text-lg font-bold text-cyan-100">
                      Access Rights
                    </h4>
                    <p className="text-sm leading-relaxed text-cyan-200/70">
                      Book stays at your owned property with special owner
                      benefits and priority booking
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-2 text-lg font-bold text-cyan-100">
                      Community Membership
                    </h4>
                    <p className="text-sm leading-relaxed text-cyan-200/70">
                      Join an exclusive community of ocean living pioneers and
                      seastead innovators
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
