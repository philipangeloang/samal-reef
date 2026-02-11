/**
 * Glamphouse Units Seed
 *
 * This file creates 14 units (Glamphouse B1-B10, C1-C4) for the Glamphouse collection.
 * All units start with 0% ownership and AVAILABLE status.
 *
 * IMPORTANT: Run collection-seed.js FIRST before running this!
 */

import { drizzle } from "drizzle-orm/postgres-js";
import {
  integer,
  varchar,
  text,
  timestamp,
  pgTable,
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

// Define units table structure (with collectionId)
const units = pgTable("samal-reef_unit", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  collectionId: integer().notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  imageUrl: varchar({ length: 500 }),
  status: varchar({ length: 50 }).notNull().default("AVAILABLE"),
  createdAt: timestamp({ withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp({ withTimezone: true }),
});

/**
 * Seed 24 Glamphouse units (Glamphouse A1-A8, B1-B8, C1-C8) into the database
 *
 * Usage:
 *   node src/server/db/seeds/glamphouse/units-seed.js
 *
 * Prerequisites:
 *   - Run glamphouse/collection-seed.js FIRST to create Glamphouse collection
 */
async function seedUnits() {
  const conn = postgres(DATABASE_URL ?? "");
  const db = drizzle(conn);

  try {
    console.log("🌱 Seeding Glamphouse units (Glamphouse B1-B10, C1-C4)...");

    // Get Glamphouse collection ID
    const glamphouseResult = await conn`
      SELECT id FROM "samal-reef_property_collection"
      WHERE slug = 'glamphouse'
      LIMIT 1
    `;

    if (glamphouseResult.length === 0) {
      console.error("❌ Glamphouse collection not found!");
      console.error("   Please run glamphouse/collection-seed.js first:");
      console.error(
        "   node src/server/db/seeds/glamphouse/collection-seed.js",
      );
      await conn.end();
      process.exit(1);
    }

    const glamphouseId = glamphouseResult[0]?.id ?? "";
    console.log(`✅ Found Glamphouse collection (ID: ${glamphouseId})`);

    // Check if units already exist for this collection
    const existingUnits = await conn`
      SELECT * FROM "samal-reef_unit"
      WHERE "collectionId" = ${glamphouseId}
      AND name LIKE 'Glamphouse %'
      ORDER BY name
    `;

    if (existingUnits.length > 0) {
      console.log(
        `✅ Found ${existingUnits.length} existing Glamphouse units:`,
      );
      existingUnits.forEach((unit) => {
        console.log(`   - ${unit?.name ?? ""} (${unit?.status ?? ""})`);
      });
      console.log("\n⚠️  Glamphouse units already exist. Skipping seed.");
      await conn.end();
      return;
    }

    // Generate units Glamphouse B1-B10, C1-C4
    const unitsToInsert = [];
    const buildings = [
      { letter: 'B', count: 10 },
      { letter: 'C', count: 4 },
    ];

    for (const building of buildings) {
      for (let i = 1; i <= building.count; i++) {
        unitsToInsert.push({
          collectionId: glamphouseId,
          name: `Glamphouse ${building.letter}${i}`,
          description: null,
          imageUrl: null,
          status: "AVAILABLE",
        });
      }
    }

    // Insert all units
    await db.insert(units).values(unitsToInsert);

    console.log("✅ Glamphouse units created successfully!");
    console.log(`   Collection: Glamphouse`);
    console.log(`   Total units: 14`);
    console.log(`   Names: Glamphouse B1-B10, C1-C4`);
    console.log(`   Status: AVAILABLE`);
    console.log(`   Ownership: 0% (no ownerships yet)`);

    await conn.end();
  } catch (error) {
    console.error("❌ Error seeding units:", error);
    await conn.end();
    throw error;
  }
}

// Run seed
seedUnits()
  .then(() => {
    console.log("🎉 Units seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Units seeding failed:", error);
    process.exit(1);
  });
