/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { siteConfig } from "@/site.config";

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Check if user has any profiles (only fetch when logged in)
  const { data: profiles } = api.user.getMyProfiles.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Don't show header on dashboard pages
  if (pathname.startsWith("/dashboard")) {
    return null;
  }

  // Check if user has access to any dashboard
  const hasDashboardAccess =
    profiles?.isAdmin ||
    profiles?.isStaff ||
    profiles?.hasAffiliateProfile ||
    profiles?.hasInvestorProfile ||
    profiles?.hasBookings;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-0">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="https://reefresort.co/wp-content/uploads/2025/03/Frame-171.png"
            alt={siteConfig.brand.name}
            width={150}
            height={40}
            className="h-8 w-auto md:h-10"
            priority
          />
        </Link>

        {/* Right Buttons */}
        <div className="flex items-center gap-3">
          {/* TODO: TEMPORARY - Hidden since we only have 1 collection, bring back when we have multiple */}
          {/* View Collections Button */}
          {/* <Button asChild variant="ghost" className="text-gray-300 hover:bg-white/10 hover:text-white">
            <Link href="/collections">
              View Collections
            </Link>
          </Button> */}

          {/* Dashboard/Sign In Button */}
          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-white/10" />
          ) : session?.user ? (
            // Logged in - only show Dashboard if has access
            hasDashboardAccess && (
              <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            )
          ) : (
            // Not logged in - show Sign In
            <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
