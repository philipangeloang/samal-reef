import { relations, sql } from "drizzle-orm";
import {
  index,
  pgTableCreator,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `samal-reef_${name}`);

// ===== USERS TABLE =====
// Core user accounts with role-based access control
export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d
    .timestamp({
      mode: "date",
      withTimezone: true,
    })
    .default(sql`CURRENT_TIMESTAMP`),
  image: d.varchar({ length: 255 }),
  // New fields for role-based access
  role: d
    .varchar({ length: 50 })
    .$type<"ADMIN" | "STAFF" | "AFFILIATE" | "INVESTOR" | "VISITOR">()
    .notNull()
    .default("VISITOR"),
  status: d
    .varchar({ length: 50 })
    .$type<"ACTIVE" | "SUSPENDED">()
    .notNull()
    .default("ACTIVE"),
  createdAt: d
    .timestamp({ withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  affiliateProfile: one(affiliateProfiles, {
    fields: [users.id],
    references: [affiliateProfiles.userId],
  }),
  investorProfile: one(investorProfiles, {
    fields: [users.id],
    references: [investorProfiles.userId],
  }),
  ownerships: many(ownerships),
  affiliateLink: one(affiliateLinks, {
    fields: [users.id],
    references: [affiliateLinks.affiliateUserId],
  }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("t_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ===== PROPERTY COLLECTIONS TABLE =====
/**
 * Groups of similar properties with shared characteristics
 * Examples: "Reef Resort Bungalows", "Luxury Beachfront Villas", "Mountain Cabins"
 *
 * Purpose:
 * - Each collection has its own pricing structure
 * - Units belong to one collection
 * - Pricing tiers are collection-specific
 * - Enables selling different property types on same platform
 *
 * Usage:
 * - Create collection first (e.g., "Reef Resort Bungalows")
 * - Assign units to collection (B1-B24)
 * - Create pricing tiers for that collection
 * - Frontend shows collection-specific pricing
 */
export const propertyCollections = createTable(
  "property_collection",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 255 }).notNull(), // "Reef Resort Bungalows"
    slug: d.varchar({ length: 255 }).notNull().unique(), // "roatan-reef-bungalows" for URLs
    description: d.text(), // Marketing description for collection page
    imageUrl: d.varchar({ length: 500 }), // Hero image for collection
    location: d.varchar({ length: 255 }), // Property location (city, country)
    // Detailed location fields (nullable for safe migration)
    address: d.varchar({ length: 500 }), // Street address
    city: d.varchar({ length: 255 }), // City name
    country: d.varchar({ length: 255 }), // Country name
    // Business entity fields (nullable for safe migration)
    construction: d.varchar({ length: 255 }), // Construction company name
    manager: d.varchar({ length: 255 }), // Property manager name
    managerPosition: d.varchar({ length: 255 }), // Manager's position/title (e.g., "General Manager")
    monthlyFee: d.varchar({ length: 255 }), // Monthly common facility fee (e.g., "2,000 pesos or $40")
    isActive: d.boolean().notNull().default(true), // Can be hidden from frontend
    displayOrder: d.integer().notNull().default(0), // Sort order on homepage
    // ===== BOOKING PRICING (managed in-app, not from Smoobu) =====
    bookingPricePerNight: d.numeric({ precision: 10, scale: 2 }), // Base nightly rate in PHP
    bookingCleaningFee: d.numeric({ precision: 10, scale: 2 }).default("50.00"), // Fixed cleaning fee
    bookingServiceFeePercent: d.numeric({ precision: 5, scale: 2 }).default("10.00"), // Service fee % (e.g., 10.00 = 10%)
    bookingMinNights: d.integer().default(1), // Minimum nights required
    bookingMaxGuests: d.integer().default(6), // Maximum guests allowed
    // Discounts managed via collectionDiscounts table
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("collection_slug_idx").on(t.slug),
    index("collection_active_idx").on(t.isActive),
  ],
);

// ===== COLLECTION DISCOUNTS TABLE =====
/**
 * Dynamic conditional discounts for booking collections.
 * Admins can add multiple discounts per collection with different conditions.
 *
 * Stacking: same conditionType = best wins; different types = additive.
 */
export const collectionDiscounts = createTable(
  "collection_discount",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    collectionId: d
      .integer()
      .notNull()
      .references(() => propertyCollections.id),
    label: d.varchar({ length: 100 }).notNull(), // e.g., "Weekly Deal", "Holiday Sale"
    percent: d.numeric({ precision: 5, scale: 2 }).notNull(), // Discount % (e.g., 15.00 = 15% off)
    conditionType: d
      .varchar({ length: 50 })
      .$type<"ALWAYS" | "MIN_NIGHTS" | "DATE_RANGE" | "WEEKEND">()
      .notNull()
      .default("ALWAYS"),
    conditionValue: d.text(), // JSON: null for ALWAYS/WEEKEND, {"minNights":7} for MIN_NIGHTS, {"startDate":"...","endDate":"..."} for DATE_RANGE
    isActive: d.boolean().notNull().default(true),
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("collection_discount_collection_idx").on(t.collectionId),
    index("collection_discount_active_idx").on(t.collectionId, t.isActive),
  ],
);

// ===== PRICING TIERS TABLE =====
/**
 * Collection-specific pricing structure for fractional ownership
 * Each property collection has its own set of pricing tiers
 *
 * Business Rules:
 * - Fixed percentage tiers: 1%, 3%, 6%, 12%, 25%, 50%, 100%
 * - Pricing is collection-specific (different prices for different property types)
 * - Crypto prices (Depay) are LOWER than fiat prices (Stripe)
 * - Affiliate commissions ALWAYS based on fiatPrice, regardless of payment method
 *
 * Initial Setup:
 * - Run: pnpm tsx src/server/db/pricing-seed.ts (only ONCE)
 *
 * Price Management:
 * - After initial seed, manage prices via admin panel
 * - Admins can update prices without code deployment
 * - Historical pricing tracked via effectiveFrom/effectiveUntil fields
 * - Set effectiveUntil on old tier, create new tier with updated prices
 *
 * DO NOT hardcode pricing in TypeScript files - always fetch from this table
 */
export const pricingTiers = createTable(
  "pricing_tier",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    collectionId: d
      .integer()
      .notNull()
      .references(() => propertyCollections.id), // Links pricing to specific property collection
    percentage: d.integer().notNull(), // Basis points: 100 = 1%, 300 = 3%, etc. (removed unique - now unique per collection)
    cryptoPrice: d.numeric({ precision: 10, scale: 2 }).notNull(), // Price when paying with crypto (Depay) - LOWER
    fiatPrice: d.numeric({ precision: 10, scale: 2 }).notNull(), // Price when paying with fiat (Stripe) - HIGHER (used for commissions)
    displayLabel: d.varchar({ length: 50 }).notNull(), // "1%", "3%", "6%", etc. for UI
    isActive: d.boolean().notNull().default(true), // Can be deactivated when updating prices
    effectiveFrom: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    effectiveUntil: d.timestamp({ withTimezone: true }), // NULL = currently active
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  }),
  (t) => [
    index("pricing_tier_collection_idx").on(t.collectionId),
    index("pricing_tier_percentage_idx").on(t.percentage),
    index("pricing_tier_active_idx").on(t.isActive),
    // Unique constraint: same percentage can exist for different collections
    uniqueIndex("pricing_tier_collection_percentage_idx").on(
      t.collectionId,
      t.percentage,
    ),
  ],
);

// ===== UNITS TABLE =====
// Each individual property unit that can be sold fractionally
// Units belong to a property collection and inherit that collection's pricing
export const units = createTable(
  "unit",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    collectionId: d
      .integer()
      .notNull()
      .references(() => propertyCollections.id), // Links unit to its property collection
    name: d.varchar({ length: 255 }).notNull(), // B1, B2, V1, M1, etc.
    description: d.text(),
    imageUrl: d.varchar({ length: 500 }),
    status: d
      .varchar({ length: 50 })
      .$type<"AVAILABLE" | "SOLD_OUT" | "DRAFT">()
      .notNull()
      .default("AVAILABLE"),
    // Smoobu integration field
    smoobuApartmentId: d.integer().unique(), // Smoobu's apartment ID (nullable until linked)
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("unit_collection_idx").on(t.collectionId),
    index("unit_status_idx").on(t.status),
    index("unit_smoobu_idx").on(t.smoobuApartmentId),
  ],
);

// ===== OWNERSHIPS TABLE =====
// Immutable ledger of all ownership purchases
export const ownerships = createTable(
  "ownership",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    unitId: d
      .integer()
      .references(() => units.id), // Nullable for pending staff entries, assigned on approval
    userId: d
      .varchar({ length: 255 })
      .references(() => users.id), // Nullable for pending staff entries, linked on approval
    // Pending investor info (for staff entries before approval)
    pendingInvestorEmail: d.varchar({ length: 255 }), // Email stored until approval
    pendingInvestorName: d.varchar({ length: 255 }), // Name stored until approval
    pricingTierId: d
      .integer()
      .notNull()
      .references(() => pricingTiers.id), // Lock in the pricing tier at time of purchase
    percentageOwned: d.integer().notNull(), // Basis points from pricing tier: 100 = 1%, 300 = 3%, etc.
    purchasePrice: d.numeric({ precision: 10, scale: 2 }).notNull(), // Actual amount paid (crypto or fiat price)
    paymentMethod: d.varchar({ length: 20 }).notNull(), // 'CRYPTO' | 'FIAT'
    currency: d.varchar({ length: 10 }).notNull().default("PHP"), // 'PHP', 'ETH', 'USDC', etc.
    // Affiliate tracking
    affiliateLinkId: d.integer().references(() => affiliateLinks.id),
    // Payment tracking
    paymentId: d.integer().references(() => payments.id),
    // MOA (Memorandum of Agreement) tracking
    moaUrl: d.varchar({ length: 500 }), // UploadThing URL (null until signed)
    isSigned: d.boolean().notNull().default(false), // MOA signature status
    moaSignedAt: d.timestamp({ withTimezone: true }), // When user signed MOA
    signerName: d.varchar({ length: 255 }), // Full name provided during MOA signing
    // Certificate of Ownership tracking
    certificateUrl: d.varchar({ length: 500 }), // Certificate PDF URL (null until generated)
    certificateGeneratedAt: d.timestamp({ withTimezone: true }), // When certificate was generated
    // Staff entry approval tracking (null = normal automated purchase)
    approvalStatus: d
      .varchar({ length: 50 })
      .$type<"PENDING_APPROVAL" | "APPROVED" | "REJECTED" | null>(),
    createdByUserId: d.varchar({ length: 255 }).references(() => users.id), // Staff who created entry
    approvedByUserId: d.varchar({ length: 255 }).references(() => users.id), // Admin who approved
    approvedAt: d.timestamp({ withTimezone: true }),
    rejectionReason: d.varchar({ length: 500 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  }),
  (t) => [
    index("ownership_unit_idx").on(t.unitId),
    index("ownership_user_idx").on(t.userId),
    index("ownership_affiliate_idx").on(t.affiliateLinkId),
    index("ownership_pricing_tier_idx").on(t.pricingTierId),
    index("ownership_moa_signed_idx").on(t.isSigned),
    index("ownership_approval_status_idx").on(t.approvalStatus),
  ],
);

// ===== AFFILIATE INVITATIONS TABLE =====
// Admin creates invitations that generate affiliate accounts
export const affiliateInvitations = createTable(
  "affiliate_invitation",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    token: d.varchar({ length: 255 }).notNull().unique(), // UUID for invitation link
    email: d.varchar({ length: 255 }).notNull(),
    commissionRate: d
      .numeric({ precision: 5, scale: 2 })
      .notNull()
      .default("1.00"), // e.g., "1.00" = 1%
    affiliateCode: d.varchar({ length: 50 }), // Optional custom affiliate code
    expiresAt: d.timestamp({ withTimezone: true }).notNull(), // 7 days from creation
    usedAt: d.timestamp({ withTimezone: true }),
    usedBy: d.varchar({ length: 255 }).references(() => users.id), // User who accepted invitation
    createdBy: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id), // Admin who created
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  }),
  (t) => [
    index("invitation_token_idx").on(t.token),
    index("invitation_email_idx").on(t.email),
  ],
);

// ===== AFFILIATE PROFILES TABLE =====
// Created when user accepts affiliate invitation
export const affiliateProfiles = createTable(
  "affiliate_profile",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    defaultCommissionRate: d
      .numeric({ precision: 5, scale: 2 })
      .notNull()
      .default("1.00"), // Inherited from invitation
    totalEarned: d
      .numeric({ precision: 10, scale: 2 })
      .notNull()
      .default("0.00"), // Sum of all commissions
    totalPaid: d.numeric({ precision: 10, scale: 2 }).notNull().default("0.00"), // Sum of paid commissions
    status: d
      .varchar({ length: 50 })
      .$type<"ACTIVE" | "SUSPENDED">()
      .notNull()
      .default("ACTIVE"),
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("affiliate_user_idx").on(t.userId)],
);

// ===== AFFILIATE LINKS TABLE =====
// Generated by admin or auto-created when affiliate accepts invitation
export const affiliateLinks = createTable(
  "affiliate_link",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    code: d.varchar({ length: 50 }).notNull().unique(), // "REEF-ABC123" (URL-safe)
    affiliateUserId: d
      .varchar({ length: 255 })
      .notNull()
      .unique() // One user can only have ONE affiliate link
      .references(() => users.id),
    commissionRate: d.numeric({ precision: 5, scale: 2 }).notNull(), // Can override affiliate's default rate
    status: d.varchar({ length: 50 }).notNull().default("ACTIVE"), // 'ACTIVE' | 'PAUSED' | 'EXPIRED'
    // Analytics (future enhancement)
    clickCount: d.integer().notNull().default(0),
    conversionCount: d.integer().notNull().default(0),
    createdBy: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id), // Admin who created
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("affiliate_link_code_idx").on(t.code),
    index("affiliate_link_user_idx").on(t.affiliateUserId),
  ],
);

// ===== AFFILIATE TRANSACTIONS TABLE =====
/**
 * Commission records (created on each affiliate-driven sale)
 *
 * For ownerships: Commission is ALWAYS calculated from fiatPrice in pricingTiers table,
 * even if customer paid with crypto at the lower cryptoPrice.
 * For bookings: Commission is calculated from booking totalPrice (before affiliate discount).
 *
 * Either ownershipId OR bookingId must be set (not both, not neither).
 */
export const affiliateTransactions = createTable(
  "affiliate_transaction",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    affiliateLinkId: d
      .integer()
      .notNull()
      .references(() => affiliateLinks.id),
    // One of these must be set - ownership commission OR booking commission
    ownershipId: d.integer().references(() => ownerships.id), // For ownership purchases
    bookingId: d.integer().references(() => bookings.id), // For booking reservations
    commissionAmount: d.numeric({ precision: 10, scale: 2 }).notNull(), // Calculated: purchasePrice * commissionRate
    commissionRate: d.numeric({ precision: 5, scale: 2 }).notNull(), // Snapshot at time of sale
    isPaid: d.boolean().notNull().default(false),
    paidAt: d.timestamp({ withTimezone: true }),
    paidBy: d.varchar({ length: 255 }).references(() => users.id), // Admin who marked as paid
    notes: d.text(), // Optional: "Paid via PayPal on 2024-01-15"
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  }),
  (t) => [
    index("transaction_affiliate_idx").on(t.affiliateLinkId),
    index("transaction_ownership_idx").on(t.ownershipId),
    index("transaction_booking_idx").on(t.bookingId),
    index("transaction_paid_idx").on(t.isPaid),
  ],
);

// ===== MANUAL PAYMENT METHODS TABLE =====
// Extensible list of manual payment methods (GCash, Maya, Bank Transfer, etc.)
// Add new methods by inserting rows - no code changes needed
export const manualPaymentMethods = createTable(
  "manual_payment_method",
  (d) => ({
    id: d.varchar({ length: 50 }).primaryKey(), // 'gcash', 'maya', 'bank_bdo', etc.
    name: d.varchar({ length: 100 }).notNull(), // 'GCash', 'Maya', 'BDO Bank Transfer'
    instructions: d.text().notNull(), // Payment instructions (supports markdown)
    accountNumber: d.varchar({ length: 100 }), // Account number to display
    accountName: d.varchar({ length: 200 }), // Account holder name
    qrCodeUrl: d.varchar({ length: 500 }), // Optional QR code image URL
    isActive: d.boolean().notNull().default(true), // Toggle visibility
    sortOrder: d.integer().notNull().default(0), // Display order in UI
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("manual_payment_method_active_idx").on(t.isActive)],
);

// ===== PAYMENTS TABLE =====
/**
 * Unified payment records for all providers (Stripe, DePay, Manual)
 *
 * Payment Status Flow:
 * - PENDING: Initial state (rarely used, mostly for async payments)
 * - IN_REVIEW: Manual payment awaiting admin approval
 * - SUCCESS: Payment confirmed → triggers unit assignment
 * - FAILED: Payment failed or rejected by admin
 * - REFUNDED: Payment refunded
 *
 * For Stripe/DePay: Status goes directly to SUCCESS via webhook
 * For Manual: Status is IN_REVIEW until admin approves
 */
export const payments = createTable(
  "payment",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    // Provider: 'STRIPE' | 'DEPAY' | 'MANUAL'
    provider: d.varchar({ length: 50 }).notNull(),
    // External ID: Stripe session ID, DePay tx hash, or manual reference code
    externalId: d.varchar({ length: 255 }).notNull().unique(),

    // User who made the payment (required for all payment types)
    userId: d.varchar({ length: 255 }).references(() => users.id),

    // Payment amount and currency
    amount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    currency: d.varchar({ length: 10 }).notNull(), // 'USD', 'PHP', 'ETH', 'USDC'

    // Status: 'PENDING' | 'IN_REVIEW' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
    status: d.varchar({ length: 50 }).notNull(),

    // Purchase context (denormalized for easier querying)
    collectionId: d.integer().references(() => propertyCollections.id),
    pricingTierId: d.integer().references(() => pricingTiers.id),
    percentageToBuy: d.integer(), // basis points
    affiliateLinkId: d.integer().references(() => affiliateLinks.id),

    // Manual payment specific fields
    manualPaymentMethodId: d
      .varchar({ length: 50 })
      .references(() => manualPaymentMethods.id),
    proofImageUrl: d.varchar({ length: 500 }), // Uploaded proof of payment

    // Admin review fields (for manual payments)
    reviewedAt: d.timestamp({ withTimezone: true }),
    reviewedBy: d.varchar({ length: 255 }).references(() => users.id),
    rejectionReason: d.text(),

    // Legacy metadata field (for backwards compatibility)
    metadata: d.json(),

    // Timestamps
    webhookProcessedAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("payment_external_idx").on(t.externalId),
    index("payment_status_idx").on(t.status),
    index("payment_user_idx").on(t.userId),
    index("payment_provider_idx").on(t.provider),
  ],
);

// ===== INVESTOR PROFILES TABLE =====
// Created when VISITOR becomes INVESTOR (first purchase)
export const investorProfiles = createTable(
  "investor_profile",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    totalInvested: d
      .numeric({ precision: 12, scale: 2 })
      .notNull()
      .default("0.00"), // Sum of all purchases
    totalUnitsOwned: d.integer().notNull().default(0), // Count of distinct units
    phoneNumber: d.varchar({ length: 50 }),
    address: d.text(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("investor_user_idx").on(t.userId)],
);

// ===== BOOKINGS TABLE =====
/**
 * Booking records for property reservations
 *
 * Sources:
 * - DIRECT: Booked through our app
 * - AIRBNB, BOOKING_COM, etc: Synced from Smoobu
 * - SMOOBU: Booked directly in Smoobu
 *
 * Status Flow:
 * - PENDING_PAYMENT: Booking created, awaiting payment
 * - PAYMENT_RECEIVED: Payment confirmed (for manual review if needed)
 * - CONFIRMED: Booking confirmed and synced to Smoobu
 * - CANCELLED: Booking cancelled
 * - COMPLETED: Guest has checked out
 */
export const bookings = createTable(
  "booking",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),

    // External references
    paymentId: d.integer().references(() => payments.id),

    // Guest information
    userId: d.varchar({ length: 255 }).references(() => users.id), // NULL for external bookings
    guestName: d.varchar({ length: 255 }).notNull(),
    guestEmail: d.varchar({ length: 255 }).notNull(),
    guestPhone: d.varchar({ length: 50 }),
    guestCountry: d.varchar({ length: 100 }),
    numberOfGuests: d.integer().notNull().default(1),

    // Booking details
    collectionId: d.integer().notNull().references(() => propertyCollections.id),
    unitsRequired: d.integer().notNull().default(1), // How many units needed based on guest count
    checkIn: d.date().notNull(),
    checkOut: d.date().notNull(),

    // Pricing (in PHP)
    nightlyRate: d.numeric({ precision: 10, scale: 2 }).notNull(),
    totalNights: d.integer().notNull(),
    subtotal: d.numeric({ precision: 10, scale: 2 }).notNull(),
    cleaningFee: d.numeric({ precision: 10, scale: 2 }).notNull().default("0.00"),
    serviceFee: d.numeric({ precision: 10, scale: 2 }).notNull().default("0.00"),
    totalPrice: d.numeric({ precision: 10, scale: 2 }).notNull(),
    currency: d.varchar({ length: 10 }).notNull().default("PHP"),

    // Status
    status: d
      .varchar({ length: 50 })
      .$type<"PENDING_PAYMENT" | "PAYMENT_RECEIVED" | "CONFIRMED" | "CANCELLED" | "COMPLETED">()
      .notNull()
      .default("PENDING_PAYMENT"),

    // Source tracking
    source: d
      .varchar({ length: 50 })
      .$type<"DIRECT" | "AIRBNB" | "BOOKING_COM" | "SMOOBU" | "OTHER">()
      .notNull()
      .default("DIRECT"),

    // Notes
    guestNotes: d.text(), // Guest special requests
    internalNotes: d.text(), // Admin notes

    // Affiliate tracking (for referral bookings)
    affiliateLinkId: d.integer().references(() => affiliateLinks.id),
    affiliateDiscount: d.numeric({ precision: 10, scale: 2 }), // 5% referral discount amount applied

    // Cancellation
    cancelledAt: d.timestamp({ withTimezone: true }),
    cancelledBy: d.varchar({ length: 255 }).references(() => users.id),
    cancellationReason: d.text(),

    // Staff entry approval tracking (null = normal automated booking)
    approvalStatus: d
      .varchar({ length: 50 })
      .$type<"PENDING_APPROVAL" | "APPROVED" | "REJECTED" | null>(),
    createdByUserId: d.varchar({ length: 255 }).references(() => users.id), // Staff who created entry
    approvedByUserId: d.varchar({ length: 255 }).references(() => users.id), // Admin who approved
    approvedAt: d.timestamp({ withTimezone: true }),
    rejectionReason: d.varchar({ length: 500 }),

    // Timestamps
    confirmedAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("booking_payment_idx").on(t.paymentId),
    index("booking_user_idx").on(t.userId),
    index("booking_collection_idx").on(t.collectionId),
    index("booking_status_idx").on(t.status),
    index("booking_dates_idx").on(t.checkIn, t.checkOut),
    index("booking_source_idx").on(t.source),
    index("booking_approval_status_idx").on(t.approvalStatus),
    index("booking_affiliate_idx").on(t.affiliateLinkId),
  ],
);

// Tracks all units assigned to a booking (supports multi-unit bookings)
export const bookingUnits = createTable(
  "booking_unit",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    bookingId: d.integer().notNull().references(() => bookings.id),
    unitId: d.integer().notNull().references(() => units.id),
    smoobuReservationId: d.integer(), // Each unit gets its own Smoobu reservation
    createdAt: d
      .timestamp({ withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  }),
  (t) => [
    index("booking_unit_booking_idx").on(t.bookingId),
    index("booking_unit_unit_idx").on(t.unitId),
  ],
);

// ===== RELATIONS =====

export const propertyCollectionsRelations = relations(
  propertyCollections,
  ({ many }) => ({
    units: many(units),
    pricingTiers: many(pricingTiers),
    discounts: many(collectionDiscounts),
  }),
);

export const collectionDiscountsRelations = relations(
  collectionDiscounts,
  ({ one }) => ({
    collection: one(propertyCollections, {
      fields: [collectionDiscounts.collectionId],
      references: [propertyCollections.id],
    }),
  }),
);

export const unitsRelations = relations(units, ({ one, many }) => ({
  collection: one(propertyCollections, {
    fields: [units.collectionId],
    references: [propertyCollections.id],
  }),
  ownerships: many(ownerships),
}));

export const pricingTiersRelations = relations(
  pricingTiers,
  ({ one, many }) => ({
    collection: one(propertyCollections, {
      fields: [pricingTiers.collectionId],
      references: [propertyCollections.id],
    }),
    ownerships: many(ownerships),
  }),
);

export const ownershipsRelations = relations(ownerships, ({ one }) => ({
  unit: one(units, { fields: [ownerships.unitId], references: [units.id] }),
  user: one(users, { fields: [ownerships.userId], references: [users.id] }),
  pricingTier: one(pricingTiers, {
    fields: [ownerships.pricingTierId],
    references: [pricingTiers.id],
  }),
  affiliateLink: one(affiliateLinks, {
    fields: [ownerships.affiliateLinkId],
    references: [affiliateLinks.id],
  }),
  payment: one(payments, {
    fields: [ownerships.paymentId],
    references: [payments.id],
  }),
}));

export const affiliateLinksRelations = relations(
  affiliateLinks,
  ({ one, many }) => ({
    affiliate: one(users, {
      fields: [affiliateLinks.affiliateUserId],
      references: [users.id],
    }),
    transactions: many(affiliateTransactions),
    ownerships: many(ownerships),
    bookings: many(bookings),
  }),
);

export const affiliateTransactionsRelations = relations(
  affiliateTransactions,
  ({ one }) => ({
    affiliateLink: one(affiliateLinks, {
      fields: [affiliateTransactions.affiliateLinkId],
      references: [affiliateLinks.id],
    }),
    ownership: one(ownerships, {
      fields: [affiliateTransactions.ownershipId],
      references: [ownerships.id],
    }),
    booking: one(bookings, {
      fields: [affiliateTransactions.bookingId],
      references: [bookings.id],
    }),
  }),
);

export const affiliateProfilesRelations = relations(
  affiliateProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [affiliateProfiles.userId],
      references: [users.id],
    }),
  }),
);

export const investorProfilesRelations = relations(
  investorProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [investorProfiles.userId],
      references: [users.id],
    }),
  }),
);

export const affiliateInvitationsRelations = relations(
  affiliateInvitations,
  ({ one }) => ({
    createdByUser: one(users, {
      fields: [affiliateInvitations.createdBy],
      references: [users.id],
    }),
    usedByUser: one(users, {
      fields: [affiliateInvitations.usedBy],
      references: [users.id],
    }),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  collection: one(propertyCollections, {
    fields: [payments.collectionId],
    references: [propertyCollections.id],
  }),
  pricingTier: one(pricingTiers, {
    fields: [payments.pricingTierId],
    references: [pricingTiers.id],
  }),
  affiliateLink: one(affiliateLinks, {
    fields: [payments.affiliateLinkId],
    references: [affiliateLinks.id],
  }),
  manualPaymentMethod: one(manualPaymentMethods, {
    fields: [payments.manualPaymentMethodId],
    references: [manualPaymentMethods.id],
  }),
  reviewedByUser: one(users, {
    fields: [payments.reviewedBy],
    references: [users.id],
    relationName: "reviewedByUser",
  }),
}));

export const manualPaymentMethodsRelations = relations(
  manualPaymentMethods,
  ({ many }) => ({
    payments: many(payments),
  }),
);

// ===== BOOKING RELATIONS =====

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  assignedUnits: many(bookingUnits),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  collection: one(propertyCollections, {
    fields: [bookings.collectionId],
    references: [propertyCollections.id],
  }),
  payment: one(payments, {
    fields: [bookings.paymentId],
    references: [payments.id],
  }),
  affiliateLink: one(affiliateLinks, {
    fields: [bookings.affiliateLinkId],
    references: [affiliateLinks.id],
  }),
  cancelledByUser: one(users, {
    fields: [bookings.cancelledBy],
    references: [users.id],
    relationName: "cancelledByUser",
  }),
}));

export const bookingUnitsRelations = relations(bookingUnits, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingUnits.bookingId],
    references: [bookings.id],
  }),
  unit: one(units, {
    fields: [bookingUnits.unitId],
    references: [units.id],
  }),
}));

// ============================================================================
// BOOKING REVENUE CACHE
// ============================================================================

/**
 * Cached booking revenue data per unit per month
 * Pre-computed from Smoobu to avoid slow API calls on every page load
 * Refreshed on-demand via admin action
 */
export const bookingRevenueCache = createTable(
  "booking_revenue_cache",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    year: d.integer().notNull(),
    unitId: d.integer().notNull().references(() => units.id, { onDelete: "cascade" }),
    month: d.integer().notNull(), // 1-12
    revenue: d.numeric({ precision: 12, scale: 2 }).notNull().default("0"),
    bookingCount: d.integer().notNull().default(0),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("revenue_cache_year_idx").on(t.year),
    index("revenue_cache_unit_month_idx").on(t.unitId, t.month),
  ]
);

/**
 * Tracks when revenue cache was last refreshed per year
 */
export const bookingRevenueCacheMeta = createTable(
  "booking_revenue_cache_meta",
  (d) => ({
    year: d.integer().primaryKey(),
    lastRefreshedAt: d.timestamp({ withTimezone: true }).notNull(),
    refreshedByUserId: d.varchar({ length: 255 }).references(() => users.id),
    error: d.text(), // Store any error from last refresh attempt
  })
);

export const bookingRevenueCacheRelations = relations(bookingRevenueCache, ({ one }) => ({
  unit: one(units, {
    fields: [bookingRevenueCache.unitId],
    references: [units.id],
  }),
}));

