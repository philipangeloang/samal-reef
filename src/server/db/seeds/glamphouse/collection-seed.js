/**
 * Glamphouse Collection Seed
 *
 * Creates the Glamphouse property collection.
 * This should be run FIRST before pricing and units seeds.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import {
  integer,
  varchar,
  text,
  boolean,
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

// Define property collections table structure
const propertyCollections = pgTable("prospera-reef_property_collection", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull().unique(),
  description: text(),
  imageUrl: varchar({ length: 500 }),
  location: varchar({ length: 255 }),
  isActive: boolean().notNull().default(true),
  displayOrder: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp({ withTimezone: true }),
});

/**
 * Seed Glamphouse collection into the database
 *
 * Usage:
 *   node src/server/db/seeds/glamphouse/collection-seed.js
 */
async function seedGlamphouseCollection() {
  const conn = postgres(DATABASE_URL ?? "");
  const db = drizzle(conn);

  try {
    console.log("🌱 Seeding Glamphouse collection...");

    // Check if Glamphouse collection already exists
    const existingCollection = await conn`
      SELECT * FROM "prospera-reef_property_collection"
      WHERE slug = 'glamphouse'
    `;

    if (existingCollection.length > 0) {
      console.log("✅ Glamphouse collection already exists:");
      console.log(
        `   - ${existingCollection[0]?.name ?? ""} (${existingCollection[0]?.slug ?? ""})`,
      );
      console.log(`   - Active: ${existingCollection[0]?.isActive ?? ""}`);
      console.log(`   - Location: ${existingCollection[0]?.location ?? ""}`);
      console.log("\n⚠️  Glamphouse collection already exists. Skipping seed.");
      await conn.end();
      return;
    }

    // Create Glamphouse collection
    await db.insert(propertyCollections).values({
      name: "Glamphouse",
      slug: "glamphouse",
      description:
        "Experience modern oceanfront living in our glamphouses designed for sustainability and comfort. Each Glamphouse features panoramic sea views, contemporary interiors, and access to exclusive resort amenities. Perfect for those seeking flexible ownership and a new way to live on the water.",
      imageUrl: null, // Add hero image URL later
      location: null,
      isActive: true,
      displayOrder: 1,
    });

    console.log("✅ Glamphouse collection created successfully!");
    console.log(`   Collection: Glamphouse`);
    console.log(`   Slug: glamphouse`);
    console.log(`   Status: Active`);
    console.log("");
    console.log("📝 Next steps:");
    console.log(
      "   1. Run pricing seed: node src/server/db/seeds/glamphouse/pricing-seed.js",
    );
    console.log(
      "   2. Run units seed: node src/server/db/seeds/glamphouse/units-seed.js",
    );

    await conn.end();
  } catch (error) {
    console.error("❌ Error seeding Glamphouse collection:", error);
    await conn.end();
    throw error;
  }
}

// Run seed
seedGlamphouseCollection()
  .then(() => {
    console.log("🎉 Glamphouse collection seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Glamphouse collection seeding failed:", error);
    process.exit(1);
  });
