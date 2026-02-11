/**
 * Unit Allocation Strategy: Sequential Fill
 *
 * This module handles the allocation of units to buyers based on their purchased tier.
 * Strategy: Fill units sequentially by ID (B1 → B2 → B3...) to minimize fragmentation.
 *
 * Why Sequential?
 * - Prevents inventory fragmentation (no "1% sold on every unit" scenario)
 * - Allows some units to remain 100% available for large buyers
 * - Predictable sales progression
 * - Clear marketing message ("B1 is 90% sold!")
 *
 * IMPORTANT: This file contains server-only code and should never be imported in client components.
 */

import "server-only";
import { db } from "@/server/db";
import { ownerships } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Find the first available unit in a collection that can accommodate the requested percentage
 *
 * Algorithm:
 * 1. Get all units in the collection, sorted by ID (ascending)
 * 2. For each unit, calculate total ownership
 * 3. Return first unit with enough available space
 * 4. Return null if no units can accommodate the purchase
 *
 * @param collectionId - Property collection ID (e.g., Glamphouse, Arkpad)
 * @param percentageNeeded - Ownership percentage in basis points (e.g., 2500 = 25%)
 * @returns Unit ID if available, null if collection is sold out for this tier
 *
 * @example
 * // User wants to buy 25% (2500 basis points)
 * const unitId = await findAvailableUnit(1, 2500);
 * if (!unitId) {
 *   throw new Error("This tier is sold out for this collection");
 * }
 */
export async function findAvailableUnit(
  collectionId: number,
  percentageNeeded: number,
): Promise<number | null> {
  // Get all units in collection, ordered by ID (sequential fill)
  const collectionUnits = await db.query.units.findMany({
    where: (units, { eq }) => eq(units.collectionId, collectionId),
    orderBy: (units, { asc }) => [asc(units.id)],
  });

  // No units in collection
  if (collectionUnits.length === 0) {
    return null;
  }

  // Check each unit in order to find one with enough space
  for (const unit of collectionUnits) {
    // Calculate total ownership for this unit
    const result = await db
      .select({
        totalOwned: sql<number>`COALESCE(SUM(${ownerships.percentageOwned}), 0)`,
      })
      .from(ownerships)
      .where(eq(ownerships.unitId, unit.id));

    const totalOwned = Number(result[0]?.totalOwned ?? 0);
    const availablePercentage = 10000 - totalOwned; // 10000 basis points = 100%

    // If this unit has enough space, return it
    if (availablePercentage >= percentageNeeded) {
      return unit.id;
    }
  }

  // No units have enough space - tier is sold out for this collection
  return null;
}

/**
 * Get availability status for all pricing tiers in a collection
 *
 * This is used on the frontend to show which tiers are still available
 * and disable "sold out" options before the user tries to purchase.
 *
 * @param collectionId - Property collection ID
 * @returns Map of tier percentage to availability status
 *
 * @example
 * const availability = await getCollectionTierAvailability(1);
 * // Result: { 2500: true, 5000: true, 10000: false }
 * // Meaning: 25% and 50% tiers available, 100% tier sold out
 */
export async function getCollectionTierAvailability(
  collectionId: number,
): Promise<Record<number, boolean>> {
  // Get all units in collection
  const collectionUnits = await db.query.units.findMany({
    where: (units, { eq }) => eq(units.collectionId, collectionId),
  });

  if (collectionUnits.length === 0) {
    return {};
  }

  // Calculate available percentage for each unit
  const unitAvailability = await Promise.all(
    collectionUnits.map(async (unit) => {
      const result = await db
        .select({
          totalOwned: sql<number>`COALESCE(SUM(${ownerships.percentageOwned}), 0)`,
        })
        .from(ownerships)
        .where(eq(ownerships.unitId, unit.id));

      const totalOwned = Number(result[0]?.totalOwned ?? 0);
      return 10000 - totalOwned; // Available percentage in basis points
    }),
  );

  // Find maximum available percentage across all units
  const maxAvailable = Math.max(...unitAvailability);

  // Get actual pricing tiers for this collection from database
  const pricingTiers = await db.query.pricingTiers.findMany({
    where: (tiers, { eq, and }) =>
      and(eq(tiers.collectionId, collectionId), eq(tiers.isActive, true)),
  });

  // Check if each tier is available based on actual pricing tiers
  const availability: Record<number, boolean> = {};
  for (const tier of pricingTiers) {
    availability[tier.percentage] = maxAvailable >= tier.percentage;
  }

  return availability;
}
