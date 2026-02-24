"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Waves, Mail } from "lucide-react";
import { siteConfig } from "@/site.config";

export function FinalCTA() {
  const scrollToCollection = () => {
    document
      .getElementById("collection-showcase")
      ?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <footer className="relative overflow-hidden bg-linear-to-b from-[#0b1c2e] to-[#0a1929] text-white">
      {/* Animated ocean wave overlays */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,206,209,0.06),transparent_60%)]" />
        <div className="absolute top-0 right-0 left-0 h-px bg-linear-to-r from-transparent via-cyan-400/30 to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Main Content */}
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
              <Waves className="h-8 w-8 text-white" />
            </div>

            <h2 className="mb-6 text-4xl leading-tight font-bold md:text-5xl lg:text-6xl">
              <span className="bg-linear-to-r from-cyan-300 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                Join the Future
              </span>
              <br />
              <span className="text-white">of Ocean Living</span>
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-cyan-50/80 md:text-xl">
              Be part of the first floating eco-resort community. Whether
              you&apos;re a builder, traveler, or visionary — your place on
              the water awaits.
            </p>

            <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                onClick={scrollToCollection}
                size="lg"
                className="group rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-10 py-6 text-lg font-bold text-white shadow-xl shadow-cyan-500/20 transition-all hover:scale-105 hover:from-cyan-300 hover:to-blue-400 hover:shadow-2xl hover:shadow-cyan-500/30"
              >
                Become an Owner
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-2 border-cyan-400/60 bg-transparent px-10 py-6 text-lg font-bold text-cyan-100 transition-all hover:border-cyan-400 hover:bg-cyan-400/20"
              >
                <Link
                  href={siteConfig.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Message Us
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 gap-8 border-t border-cyan-400/20 pt-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-cyan-300">
                1-100%
              </div>
              <div className="text-sm text-cyan-100/70">Flexible Ownership</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-cyan-300">
                30-65 years
              </div>
              <div className="text-sm text-cyan-100/70">
                Real Estate Durability
              </div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-cyan-300">
                Crypto
              </div>
              <div className="text-sm text-cyan-100/70">Payment Ready</div>
            </div>
          </div>
        </div>

        {/* Footer Bottom - Contact & Socials */}
        <div className="mt-16 border-t border-cyan-400/20 pt-10">
          <div className="mx-auto max-w-4xl">
            {/* Contact & Social Links */}
            <div className="mb-8 flex flex-col items-center gap-6 md:flex-row md:justify-between">
              {/* Email */}
              <Link
                href={`mailto:${siteConfig.emails.sales}`}
                className="group flex items-center gap-2 text-cyan-200/80 transition-colors hover:text-cyan-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 transition-all group-hover:border-cyan-400/50 group-hover:bg-cyan-400/20">
                  <Mail className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{siteConfig.emails.sales}</span>
              </Link>

              {/* Social Links */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-cyan-200/60">Follow Us:</span>
                <div className="flex gap-3">
                  {/* Facebook */}
                  <Link
                    href={siteConfig.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 transition-all hover:scale-110 hover:border-cyan-400/50 hover:bg-cyan-400/20"
                    aria-label="Facebook"
                  >
                    <svg
                      className="h-5 w-5 text-cyan-200"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </Link>

                  {/* Instagram */}
                  <Link
                    href={siteConfig.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 transition-all hover:scale-110 hover:border-cyan-400/50 hover:bg-cyan-400/20"
                    aria-label="Instagram"
                  >
                    <svg
                      className="h-5 w-5 text-cyan-200"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </Link>

                  {/* TikTok */}
                  <Link
                    href={siteConfig.social.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 transition-all hover:scale-110 hover:border-cyan-400/50 hover:bg-cyan-400/20"
                    aria-label="TikTok"
                  >
                    <svg
                      className="h-5 w-5 text-cyan-200"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="text-center">
              <p className="text-sm text-cyan-100/60">
                © 2025 {siteConfig.brand.name}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
