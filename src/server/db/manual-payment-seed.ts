/**
 * Seed script for Manual Payment Methods
 *
 * Run this ONCE to create the initial payment methods:
 * pnpm tsx src/server/db/manual-payment-seed.ts
 *
 * After initial setup, manage methods via the admin panel.
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { pgTableCreator } from "drizzle-orm/pg-core";

// Direct database connection (bypasses schema.ts which has next-auth imports)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

const conn = postgres(connectionString);
const db = drizzle(conn);

// Define only the table we need for seeding
const createTable = pgTableCreator((name) => `prospera-reef_${name}`);

const manualPaymentMethods = createTable("manual_payment_method", (d) => ({
  id: d.varchar({ length: 50 }).primaryKey(),
  name: d.varchar({ length: 100 }).notNull(),
  instructions: d.text().notNull(),
  accountNumber: d.varchar({ length: 100 }),
  accountName: d.varchar({ length: 200 }),
  qrCodeUrl: d.text(),
  isActive: d.boolean().default(true).notNull(),
  sortOrder: d.integer().default(0).notNull(),
}));

const PAYMENT_METHODS = [
  {
    id: "gcash",
    name: "GCash",
    instructions: `## How to Pay via GCash

1. Open your GCash app
2. Tap "Send Money"
3. Enter the mobile number below
4. Enter the exact amount shown
5. Add the reference code in the message field
6. Confirm and complete the payment
7. Take a screenshot of the confirmation
8. Upload the screenshot as proof of payment`,
    accountNumber: "0917-XXX-XXXX", // Replace with actual number
    accountName: "Prospera Reef Inc.",
    qrCodeUrl: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "maya",
    name: "Maya",
    instructions: `## How to Pay via Maya

1. Open your Maya app
2. Tap "Send Money"
3. Enter the mobile number below
4. Enter the exact amount shown
5. Add the reference code in the message field
6. Confirm and complete the payment
7. Take a screenshot of the confirmation
8. Upload the screenshot as proof of payment`,
    accountNumber: "0917-XXX-XXXX", // Replace with actual number
    accountName: "Prospera Reef Inc.",
    qrCodeUrl: null,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    instructions: `## How to Pay via Bank Transfer

1. Log in to your online banking or visit your bank
2. Select "Fund Transfer" or "Send Money"
3. Enter the account details below
4. Enter the exact amount shown
5. Add the reference code in the remarks/notes field
6. Complete the transfer
7. Take a screenshot or save the transaction confirmation
8. Upload it as proof of payment

**Important:** Include the reference code in your transfer remarks for faster verification.`,
    accountNumber: "XXXX-XXXX-XXXX", // Replace with actual account
    accountName: "Prospera Reef Inc. - BDO",
    qrCodeUrl: null,
    isActive: true,
    sortOrder: 3,
  },
];

async function seed() {
  console.log("🌱 Seeding manual payment methods...");

  for (const method of PAYMENT_METHODS) {
    try {
      await db
        .insert(manualPaymentMethods)
        .values(method)
        .onConflictDoNothing({ target: manualPaymentMethods.id });

      console.log(`  ✅ Created: ${method.name}`);
    } catch (error) {
      console.error(`  ❌ Failed to create ${method.name}:`, error);
    }
  }

  console.log("\n✅ Manual payment methods seeded successfully!");
  console.log("\n📝 Next steps:");
  console.log("   1. Update account numbers in the admin panel");
  console.log("   2. Add QR code images if available");
  console.log("   3. Customize instructions as needed");

  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
