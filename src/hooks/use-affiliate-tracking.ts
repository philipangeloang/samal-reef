"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";

/**
 * Affiliate Tracking Hook
 *
 * Attribution Model: Last-Click (90-day window)
 * - LAST-CLICK: New affiliate codes overwrite existing ones and reset expiry to 90 days
 * - SAME CODE: Revisiting same affiliate link does NOT reset expiry (natural countdown)
 * - EXPIRY: Code expires after 90 days from last NEW affiliate click
 * - Click tracking: Increments database counter on EVERY visit with ref parameter
 *
 * Examples:
 * Day 1: Click REEF-ALICE → Expiry Day 91, clickCount +1
 * Day 7: Click REEF-ALICE (same) → Expiry still Day 91 (no reset), clickCount +1
 * Day 30: Click REEF-BOB (different) → Expiry Day 120 (last-click: overwrites Alice, resets timer), clickCount +1
 * Day 50: Click REEF-BOB (same) → Expiry still Day 120 (no reset), clickCount +1
 * Day 121: Code expires, localStorage empty
 * Day 125: Click REEF-ALICE → Expiry Day 215 (fresh start), clickCount +1
 *
 * Industry Standard: High-ticket items (real estate) use 90-day attribution windows
 *
 * Usage: Automatically runs in root layout via <AffiliateTracker />
 */

const AFFILIATE_EXPIRY_DAYS = 90;
const STORAGE_KEY_CODE = "affiliateCode";
const STORAGE_KEY_EXPIRY = "affiliateExpiry";
const STORAGE_KEY_FIRST_VISIT = "affiliateFirstVisit";

export function useAffiliateTracking() {
  const searchParams = useSearchParams();
  const trackClick = api.affiliate.trackClick.useMutation();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Check if URL has affiliate code
    const refCode = searchParams.get("ref");

    if (refCode && !hasTrackedRef.current) {
      // Mark as tracked to prevent infinite loop
      hasTrackedRef.current = true;

      // Check if this is a NEW code (different from stored code OR no code at all)
      const existingCode = localStorage.getItem(STORAGE_KEY_CODE);
      const isNewClick = existingCode !== refCode;

      // Track EVERY click in database (for analytics)
      trackClick.mutate(
        { affiliateCode: refCode },
        {
          onSuccess: () => {
            console.log(
              `[Affiliate Tracking] Click tracked for ${refCode}`
            );
          },
          onError: (error) => {
            console.error(
              "[Affiliate Tracking] Failed to track click:",
              error
            );
          },
        }
      );

      // LAST-CLICK ATTRIBUTION: Only overwrite and reset timer for NEW affiliate codes
      if (isNewClick) {
        const expiryTimestamp =
          Date.now() + AFFILIATE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        localStorage.setItem(STORAGE_KEY_CODE, refCode);
        localStorage.setItem(STORAGE_KEY_EXPIRY, expiryTimestamp.toString());

        // Track first visit timestamp (for analytics)
        if (!localStorage.getItem(STORAGE_KEY_FIRST_VISIT)) {
          localStorage.setItem(STORAGE_KEY_FIRST_VISIT, Date.now().toString());
        }

        console.log(
          `[Affiliate Tracking] New code ${refCode} stored (expires in ${AFFILIATE_EXPIRY_DAYS} days)`
        );
      } else {
        // Same code - no reset, but still tracking click
        console.log(
          `[Affiliate Tracking] Same code ${refCode} - expiry not reset`
        );
      }
    }

    // Check expiry on every page load
    cleanupExpiredCode();
  }, [searchParams, trackClick]);
}

/**
 * Get the stored affiliate code (with expiry check)
 * Returns null if expired or not set
 */
export function getAffiliateCode(): string | null {
  if (typeof window === "undefined") return null;

  const code = localStorage.getItem(STORAGE_KEY_CODE);
  const expiry = localStorage.getItem(STORAGE_KEY_EXPIRY);

  // No code stored
  if (!code) return null;

  // Check if expired
  if (expiry && Date.now() > parseInt(expiry)) {
    console.log("[Affiliate Tracking] Code expired, clearing...");
    clearAffiliateCode();
    return null;
  }

  return code;
}

/**
 * Clear the stored affiliate code
 * Call this after successful purchase (optional - see notes below)
 */
export function clearAffiliateCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_CODE);
  localStorage.removeItem(STORAGE_KEY_EXPIRY);
  localStorage.removeItem(STORAGE_KEY_FIRST_VISIT);
  console.log("[Affiliate Tracking] Cleared affiliate data");
}

/**
 * Remove expired codes (automatic cleanup)
 */
function cleanupExpiredCode(): void {
  if (typeof window === "undefined") return;

  const expiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
  if (expiry && Date.now() > parseInt(expiry)) {
    clearAffiliateCode();
  }
}

/**
 * Get affiliate tracking metadata (for analytics)
 */
export function getAffiliateMetadata(): {
  code: string | null;
  daysUntilExpiry: number | null;
  daysSinceFirstVisit: number | null;
} {
  if (typeof window === "undefined") {
    return { code: null, daysUntilExpiry: null, daysSinceFirstVisit: null };
  }

  const code = getAffiliateCode();
  const expiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
  const firstVisit = localStorage.getItem(STORAGE_KEY_FIRST_VISIT);

  const daysUntilExpiry = expiry
    ? Math.floor((parseInt(expiry) - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  const daysSinceFirstVisit = firstVisit
    ? Math.floor((Date.now() - parseInt(firstVisit)) / (24 * 60 * 60 * 1000))
    : null;

  return { code, daysUntilExpiry, daysSinceFirstVisit };
}
