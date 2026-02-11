"use client";

import { useAffiliateTracking } from "@/hooks/use-affiliate-tracking";

/**
 * Affiliate Tracker Component
 *
 * Automatically captures and stores affiliate codes from URL parameters.
 * Must be mounted in the root layout to track across all pages.
 */
export function AffiliateTracker() {
  useAffiliateTracking();
  return null; // Renders nothing, just runs the tracking logic
}
