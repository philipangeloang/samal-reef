"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/site.config";
import {
  ArrowDown,
  Waves,
  Anchor,
  ArrowRightLeft,
  TrendingUp,
} from "lucide-react";

export function HeroSection() {
  const scrollToCollection = () => {
    document
      .getElementById("collection-showcase")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-[#0a1929] from-0% via-[#0d1f31] via-40% to-[#0f2435] to-100%">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-25">
        <Image
          src="https://arkpad.co/wp-content/uploads/2025/09/Reef-Resort-35.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1929]/60 via-[#0d1f31]/70 to-[#0f2435]" />

      {/* Animated ocean wave overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,206,209,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(64,224,208,0.06),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 text-center text-white">
        <div className="animate-fade-in mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-medium backdrop-blur-sm">
            <Waves className="h-4 w-4 text-cyan-300" />
            <span className="text-cyan-100">
              Sustainable • Innovative • Ocean Living
            </span>
          </div>
        </div>

        <h1 className="mb-6 text-5xl leading-tight font-bold text-balance md:text-7xl lg:text-8xl">
          <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
            {siteConfig.brand.name}
          </span>
        </h1>

        <p className="mx-auto mb-16 max-w-3xl text-lg leading-relaxed text-balance text-cyan-50/90 md:text-xl">
          Experience the first floating real estate — an eco-restorative
          seastead community in the ocean.
        </p>

        <div className="mx-auto mb-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          <div className="group rounded-2xl border border-cyan-400/20 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:bg-white/10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
              <ArrowRightLeft className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-cyan-100">
              Instant Liquidity
            </h3>
            <p className="text-sm leading-relaxed text-cyan-200/70">
              Trade your ownership shares anytime
            </p>
          </div>

          <div className="group rounded-2xl border border-cyan-400/20 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:bg-white/10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
              <Anchor className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-cyan-100">
              Seastead Access
            </h3>
            <p className="text-sm leading-relaxed text-cyan-200/70">
              Join one of the world&apos;s first communities redefining how
              people live, invest, and thrive on the ocean.
            </p>
          </div>

          <div className="group rounded-2xl border border-cyan-400/20 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:bg-white/10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-cyan-100">
              Yield Potential
            </h3>
            <p className="text-sm leading-relaxed text-cyan-200/70">
              Earn from eco-resort operations
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button
            onClick={scrollToCollection}
            size="lg"
            className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-10 py-4 text-lg font-bold text-white shadow-xl shadow-cyan-500/20 transition-all hover:scale-105 hover:from-cyan-300 hover:to-blue-400 hover:shadow-2xl hover:shadow-cyan-500/30"
          >
            Become an Owner
            <ArrowDown className="ml-2 h-5 w-5" />
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full border-2 border-cyan-400/50 bg-transparent px-10 py-4 text-lg font-semibold text-cyan-100 backdrop-blur-sm transition-all hover:border-cyan-400 hover:bg-cyan-400/20"
          >
            <Link href="/book">
              Book a Stay
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
