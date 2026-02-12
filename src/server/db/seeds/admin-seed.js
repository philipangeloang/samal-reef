/**
 * Admin User Seed Data
 *
 * This file creates an initial admin user for testing.
 * Email: admin@arkpad.co
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { varchar, timestamp, pgTable } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import "dotenv/config";

// Table prefix — must match siteConfig.tablePrefix in src/site.config.ts
const TABLE_PREFIX = "samal-reef";

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in environment variables");
  process.exit(1);
}

// Define users table structure
const users = pgTable(`${TABLE_PREFIX}_user`, {
  id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }).notNull(),
  emailVerified: timestamp({ withTimezone: true }),
  image: varchar({ length: 255 }),
  role: varchar({ length: 50 }).notNull().default("VISITOR"),
  status: varchar({ length: 50 }).notNull().default("ACTIVE"),
  createdAt: timestamp({ withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp({ withTimezone: true }),
});

/**
 * Seed admin user into the database
 *
 * Usage:
 *   node src/server/db/seeds/admin-seed.js
 */
async function seedAdmin() {
  const conn = postgres(DATABASE_URL ?? "");
  const db = drizzle(conn);

  try {
    console.log("🌱 Seeding admin user...");

    // Check if admin already exists
    const result = await conn`
      SELECT * FROM ${conn(`${TABLE_PREFIX}_user`)}
      WHERE email = 'admin@arkpad.co'
    `;

    if (result.length > 0) {
      console.log("✅ Admin user already exists");
      console.log(`   Email: ${result[0]?.email}`);
      console.log(`   Name: ${result[0]?.name}`);
      console.log(`   Role: ${result[0]?.role}`);
      console.log(`   ID: ${result[0]?.id}`);
      await conn.end();
      return;
    }

    // Generate a simple UUID for the admin user
    const adminId = crypto.randomUUID();

    // Insert admin user
    await db.insert(users).values({
      id: adminId,
      email: "admin@arkpad.co",
      name: "admin",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
    });

    console.log("✅ Admin user created successfully!");
    console.log(`   Email: admin@arkpad.co`);
    console.log(`   Name: admin`);
    console.log(`   Role: ADMIN`);
    console.log(`   ID: ${adminId}`);
    console.log("");
    console.log("📧 To sign in:");
    console.log("   1. Go to your app homepage");
    console.log("   2. Click 'Sign In'");
    console.log("   3. Enter: admin@arkpad.co");
    console.log("   4. Check your email for the magic link");

    await conn.end();
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    await conn.end();
    throw error;
  }
}

// Run seed
seedAdmin()
  .then(() => {
    console.log("🎉 Admin seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Admin seeding failed:", error);
    process.exit(1);
  });
