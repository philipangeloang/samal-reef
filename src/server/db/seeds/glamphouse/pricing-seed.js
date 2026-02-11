/**
 * Pricing Tiers Seed Data
 *
 * This file creates pricing tiers for the Glamphouse collection.
 * These are inserted into the database ONCE during initial setup.
 *
 * After seeding, the DATABASE is the source of truth for pricing.
 * Admins can update prices via the admin panel without code changes.
 *
 * IMPORTANT: Run glamphouse/collection-seed.js FIRST before running this!
 */

import { drizzle } from "drizzle-orm/postgres-js";
import {
  integer,
  numeric,
  boolean,
  varchar,
  timestamp,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import "dotenv/config";

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in environment variables");
  process.exit(1);
}

// Define pricingTiers table structure (with collectionId)
const pricingTiers = pgTable(
  "prospera-reef_pricing_tier",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    collectionId: integer().notNull(),
    percentage: integer().notNull(),
    cryptoPrice: numeric({ precision: 10, scale: 2 }).notNull(),
    fiatPrice: numeric({ precision: 10, scale: 2 }).notNull(),
    displayLabel: varchar({ length: 50 }).notNull(),
    isActive: boolean().notNull().default(true),
    effectiveFrom: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    effectiveUntil: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("pricing_tier_collection_idx").on(t.collectionId),
    index("pricing_tier_percentage_idx").on(t.percentage),
    index("pricing_tier_active_idx").on(t.isActive),
    uniqueIndex("pricing_tier_collection_percentage_idx").on(
      t.collectionId,
      t.percentage,
    ),
  ],
);

/**
 * Initial pricing tier configuration for Glamphouse
 *
 * Business Rules:
 * - 7 fixed percentage tiers: 1%, 3%, 6%, 12%, 25%, 50%, 100%
 * - Crypto prices (Depay) are lower than fiat prices (Stripe)
 * - Affiliate commissions ALWAYS calculated from fiatPrice (higher amount)
 * - Percentages stored as basis points: 100 = 1%, 10000 = 100%
 */
const GLAMPHOUSE_PRICING_TIERS = [
  {
    percentage: 100, // 1%
    cryptoPrice: "1100.00",
    fiatPrice: "1200.00",
    displayLabel: "1%",
    isActive: true,
  },
  {
    percentage: 300, // 3%
    cryptoPrice: "3000.00",
    fiatPrice: "3200.00",
    displayLabel: "3%",
    isActive: true,
  },
  {
    percentage: 600, // 6%
    cryptoPrice: "5800.00",
    fiatPrice: "6000.00",
    displayLabel: "6%",
    isActive: true,
  },
  {
    percentage: 1200, // 12%
    cryptoPrice: "11500.00",
    fiatPrice: "12000.00",
    displayLabel: "12%",
    isActive: true,
  },
  {
    percentage: 2500, // 25%
    cryptoPrice: "23000.00",
    fiatPrice: "24000.00",
    displayLabel: "25%",
    isActive: true,
  },
  {
    percentage: 5000, // 50%
    cryptoPrice: "45000.00",
    fiatPrice: "48000.00",
    displayLabel: "50%",
    isActive: true,
  },
  {
    percentage: 10000, // 100%
    cryptoPrice: "89000.00",
    fiatPrice: "95000.00",
    displayLabel: "100%",
    isActive: true,
  },
];

/**
 * Seed Glamphouse pricing tiers into the database
 *
 * Usage:
 *   node src/server/db/seeds/glamphouse/pricing-seed.js
 *
 * Prerequisites:
 *   - Run collection-seed.js FIRST to create Glamphouse collection
 *
 * This should only be run ONCE during initial setup.
 * After this, manage pricing through the admin panel.
 */
async function seedPricingTiers() {
  const conn = postgres(DATABASE_URL ?? "");
  const db = drizzle(conn);

  try {
    console.log("🌱 Seeding pricing tiers for Glamphouse...");

    // Get Glamphouse collection ID
    const glamphouseResult = await conn`
      SELECT id FROM "prospera-reef_property_collection"
      WHERE slug = 'glamphouse'
      LIMIT 1
    `;

    if (glamphouseResult.length === 0 || !glamphouseResult[0]) {
      console.error("❌ Glamphouse collection not found!");
      console.error("   Please run collection-seed.js first:");
      console.error(
        "   node src/server/db/seeds/glamphouse/collection-seed.js",
      );
      await conn.end();
      process.exit(1);
    }

    const glamphouseId = glamphouseResult[0].id;
    console.log(`✅ Found Glamphouse collection (ID: ${glamphouseId})`);

    // Check if tiers already exist for this collection
    const existingTiers = await conn`
      SELECT COUNT(*) as count FROM "prospera-reef_pricing_tier"
      WHERE "collectionId" = ${glamphouseId}
    `;
    const existingCount = parseInt(existingTiers[0]?.count ?? "0");

    if (existingCount > 0) {
      console.log(
        `⚠️  Found ${existingCount} existing pricing tiers for Glamphouse. Skipping seed.`,
      );
      console.log("   To re-seed, manually delete existing tiers first.");
      await conn.end();
      return;
    }

    // Add collectionId to each tier
    const tiersWithCollection = GLAMPHOUSE_PRICING_TIERS.map((tier) => ({
      ...tier,
      collectionId: glamphouseId,
    }));

    // Insert all pricing tiers
    await db.insert(pricingTiers).values(tiersWithCollection);

    console.log("✅ Successfully seeded 7 pricing tiers for Glamphouse:");
    GLAMPHOUSE_PRICING_TIERS.forEach((tier) => {
      console.log(
        `   - ${tier.displayLabel}: Crypto $${tier.cryptoPrice} | Fiat $${tier.fiatPrice}`,
      );
    });
    console.log("");
    console.log("📝 Next step:");
    console.log(
      "   Run units seed: node src/server/db/seeds/glamphouse/units-seed.js",
    );

    await conn.end();
  } catch (error) {
    console.error("❌ Error seeding pricing tiers:", error);
    await conn.end();
    throw error;
  }
}

// Run seed
seedPricingTiers()
  .then(() => {
    console.log("🎉 Pricing tiers seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Pricing tiers seeding failed:", error);
    process.exit(1);
  });
