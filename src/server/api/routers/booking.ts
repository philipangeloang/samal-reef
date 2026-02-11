/**
 * Booking Router
 *
 * Handles booking operations for resort stays.
 *
 * Flow:
 * 1. Guest checks availability → getAvailability
 * 2. Guest selects dates → checkPricing
 * 3. Guest initiates booking → initiate (creates pending booking)
 * 4. Guest pays → Stripe/DePay/Manual webhook
 * 5. Webhook confirms → processBookingPayment (assigns unit, syncs to Smoobu)
 *
 * Admin can:
 * - View all bookings
 * - Manually sync from Smoobu
 * - Link units to Smoobu apartments
 * - Cancel bookings
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import {
  bookings,
  bookingUnits,
  payments,
  units,
  propertyCollections,
  affiliateLinks,
  users,
  bookingRevenueCache,
  bookingRevenueCacheMeta,
} from "@/server/db/schema";
import { eq, and, desc, asc, gte, lte, sql, isNotNull, isNull } from "drizzle-orm";
import {
  checkCollectionAvailability,
  getBookingPricing,
  cancelBooking,
  syncBookingToSmoobu,
} from "@/server/services/booking-processor";
import { smoobuClient, type SmoobuReservation } from "@/server/services/smoobu-client";

/**
 * Generate a unique booking reference code
 * Format: BK-{YEAR}{MONTH}-{RANDOM5}
 * Example: BK-202501-X7K9A
 */
function generateBookingReference(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${year}${month}-${random}`;
}

export const bookingRouter = createTRPCRouter({
  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Get availability for a collection on a date range
   * Shows how many units are available per date
   *
   * This queries Smoobu's rates API for real-time availability
   * which includes bookings from all channels (Airbnb, Booking.com, etc.)
   */
  getAvailability: publicProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get collection with pricing info
      const collection = await ctx.db.query.propertyCollections.findFirst({
        where: eq(propertyCollections.id, input.collectionId),
      });

      if (!collection) {
        return { dates: {}, totalUnits: 0 };
      }

      // Get base nightly rate from collection (local pricing)
      const baseNightlyRate = collection.bookingPricePerNight
        ? parseFloat(collection.bookingPricePerNight)
        : null;

      // Get all units with Smoobu linked in this collection
      const linkedUnits = await ctx.db.query.units.findMany({
        where: and(
          eq(units.collectionId, input.collectionId),
          eq(units.status, "AVAILABLE"),
          isNotNull(units.smoobuApartmentId),
        ),
        columns: { id: true, smoobuApartmentId: true },
      });

      const totalUnits = linkedUnits.length;

      if (totalUnits === 0) {
        return { dates: {}, totalUnits: 0 };
      }

      // Get Smoobu apartment IDs for querying availability
      const smoobuApartmentIds = linkedUnits
        .map((u) => u.smoobuApartmentId)
        .filter((id): id is number => id !== null);

      // Build availability map by date
      const dates: Record<
        string,
        { available: number; minPrice: number | null; isAvailable: boolean }
      > = {};

      // Initialize all dates with full availability
      const [startYear, startMonth, startDay] = input.startDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = input.endDate.split("-").map(Number);
      const start = new Date(startYear!, startMonth! - 1, startDay);
      const end = new Date(endYear!, endMonth! - 1, endDay);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        dates[dateStr] = {
          available: totalUnits,
          minPrice: baseNightlyRate,
          isAvailable: true,
        };
      }

      // Query Smoobu for real-time availability from all channels
      // This includes Airbnb, Booking.com, and other connected platforms
      try {
        if (smoobuApartmentIds.length > 0) {
          const smoobuRates = await smoobuClient.getRatesForApartments(
            smoobuApartmentIds,
            input.startDate,
            input.endDate,
          );

          // For each date, count how many units are blocked in Smoobu
          for (const dateStr of Object.keys(dates)) {
            let blockedCount = 0;

            for (const apartmentId of smoobuApartmentIds) {
              const rates = smoobuRates.get(apartmentId);
              if (rates) {
                const dateRate = rates.find((r) => r.date === dateStr);
                // available: 0 means blocked, available: 1 means free
                if (dateRate && dateRate.available === 0) {
                  blockedCount++;
                }
              }
            }

            const available = totalUnits - blockedCount;
            dates[dateStr] = {
              available,
              minPrice: baseNightlyRate,
              isAvailable: available > 0,
            };
          }
        }
      } catch (smoobuError) {
        // If Smoobu API fails, fall back to local bookings only
        console.warn(
          "Failed to fetch Smoobu availability, falling back to local data:",
          smoobuError,
        );

        // Get local confirmed bookings as fallback (via bookingUnits junction table)
        const bookedSlots = await ctx.db
          .select({
            unitId: bookingUnits.unitId,
            checkIn: bookings.checkIn,
            checkOut: bookings.checkOut,
          })
          .from(bookingUnits)
          .innerJoin(bookings, eq(bookingUnits.bookingId, bookings.id))
          .where(
            and(
              eq(bookings.collectionId, input.collectionId),
              sql`${bookings.status} IN ('CONFIRMED', 'COMPLETED')`,
              sql`${bookings.checkIn} <= ${input.endDate}`,
              sql`${bookings.checkOut} >= ${input.startDate}`,
            ),
          );

        // Update dates with local booking data
        for (const dateStr of Object.keys(dates)) {
          const [year, month, day] = dateStr.split("-").map(Number);
          const currentDate = new Date(year!, month! - 1, day);

          const bookedCount = bookedSlots.filter((slot) => {
            const [ciYear, ciMonth, ciDay] = slot.checkIn
              .split("-")
              .map(Number);
            const [coYear, coMonth, coDay] = slot.checkOut
              .split("-")
              .map(Number);
            const checkIn = new Date(ciYear!, ciMonth! - 1, ciDay);
            const checkOut = new Date(coYear!, coMonth! - 1, coDay);
            return currentDate >= checkIn && currentDate < checkOut;
          }).length;

          const available = totalUnits - bookedCount;
          dates[dateStr] = {
            available,
            minPrice: baseNightlyRate,
            isAvailable: available > 0,
          };
        }
      }

      return { dates, totalUnits };
    }),

  /**
   * Check pricing for a specific date range
   * If affiliate code is provided and valid, a $5 discount is applied
   */
  checkPricing: publicProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        guests: z.number().int().positive().default(1),
        affiliateCode: z.string().optional(), // Optional affiliate code for $5 discount
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get pricing with guest count for multi-unit calculation
      const pricing = await getBookingPricing(
        input.collectionId,
        input.checkIn,
        input.checkOut,
        input.guests,
      );

      if (!pricing.available) {
        return {
          available: false,
          availableUnits: 0,
          error: pricing.error ?? "No units available for the selected dates",
        };
      }

      // Get availability info for display
      const availability = await checkCollectionAvailability(
        input.collectionId,
        input.checkIn,
        input.checkOut,
      );

      // Check if affiliate code is valid and get discount (5% of total price)
      let affiliateDiscount = 0;
      let affiliateCodeValid = false;
      if (input.affiliateCode && pricing.totalPrice) {
        const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
          where: eq(affiliateLinks.code, input.affiliateCode),
        });
        if (affiliateLink && affiliateLink.status === "ACTIVE") {
          affiliateDiscount = Math.round(pricing.totalPrice * 0.05 * 100) / 100; // 5% discount
          affiliateCodeValid = true;
        }
      }

      // Calculate final price with affiliate discount
      const finalTotalPrice = pricing.totalPrice
        ? Math.max(0, pricing.totalPrice - affiliateDiscount)
        : undefined;

      return {
        available: pricing.available,
        availableUnits: availability.availableUnits,
        totalUnits: availability.totalUnits,
        nightlyRate: pricing.nightlyRate,
        originalNightlyRate: pricing.originalNightlyRate,
        totalNights: pricing.totalNights,
        subtotal: pricing.subtotal,
        originalSubtotal: pricing.originalSubtotal,
        cleaningFee: pricing.cleaningFee,
        serviceFee: pricing.serviceFee,
        totalPrice: finalTotalPrice,
        totalPriceBeforeAffiliateDiscount: pricing.totalPrice,
        originalTotalPrice: pricing.originalTotalPrice,
        minStay: pricing.minStay,
        maxGuests: pricing.maxGuests,
        unitsRequired: pricing.unitsRequired,
        discountPercent: pricing.discountPercent,
        discountLabel: pricing.discountLabel,
        discounts: pricing.discounts,
        // Affiliate discount info
        affiliateDiscount: affiliateCodeValid ? affiliateDiscount : 0,
        affiliateCodeValid,
        error: pricing.error,
      };
    }),

  /**
   * Initiate a booking (creates pending booking record)
   * Returns booking ID for payment processing
   * If affiliate code is provided and valid, a $5 discount is applied
   */
  initiate: publicProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        guestName: z.string().min(2),
        guestEmail: z.string().email(),
        guestPhone: z.string().optional(),
        guestCountry: z.string().optional(),
        numberOfGuests: z.number().int().positive().default(1),
        guestNotes: z.string().optional(),
        paymentMethod: z.enum(["FIAT", "CRYPTO", "MANUAL"]),
        affiliateCode: z.string().optional(), // Optional affiliate code for $5 discount
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Validate collection
      const collection = await ctx.db.query.propertyCollections.findFirst({
        where: (c, { eq }) => eq(c.id, input.collectionId),
      });

      if (!collection || !collection.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found or inactive",
        });
      }

      // 2. Get pricing (includes availability check and units-required calculation)
      const pricing = await getBookingPricing(
        input.collectionId,
        input.checkIn,
        input.checkOut,
        input.numberOfGuests,
      );

      if (!pricing.available || !pricing.totalPrice) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: pricing.error ?? "Unable to calculate pricing",
        });
      }

      // 3. Validate affiliate code if provided (5% discount for referred bookings)
      let affiliateLinkId: number | null = null;
      let affiliateDiscount = 0;
      if (input.affiliateCode) {
        const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
          where: eq(affiliateLinks.code, input.affiliateCode),
        });
        if (affiliateLink && affiliateLink.status === "ACTIVE") {
          affiliateLinkId = affiliateLink.id;
          affiliateDiscount = Math.round(pricing.totalPrice * 0.05 * 100) / 100; // 5% discount
        }
      }

      // 4. Calculate final price with affiliate discount
      const finalTotalPrice = Math.max(0, pricing.totalPrice - affiliateDiscount);

      // 5. Calculate nights
      const checkInDate = new Date(input.checkIn);
      const checkOutDate = new Date(input.checkOut);
      const totalNights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // 6. Determine userId - find or create user account
      let userId = ctx.session?.user?.id ?? null;

      if (!userId) {
        // Not logged in - check if user exists with this email
        const existingUser = await ctx.db.query.users.findFirst({
          where: eq(users.email, input.guestEmail),
        });

        if (existingUser) {
          // Scenario 2: Link to existing account
          userId = existingUser.id;
        } else {
          // Scenario 1: Create new account for guest
          const [newUser] = await ctx.db
            .insert(users)
            .values({
              email: input.guestEmail,
              name: input.guestName,
              role: "VISITOR",
            })
            .returning();

          if (newUser) {
            userId = newUser.id;
            console.log(`Created new user account for guest: ${input.guestEmail}`);
          }
        }
      }

      // 7. Create booking record
      const [booking] = await ctx.db
        .insert(bookings)
        .values({
          collectionId: input.collectionId,
          userId,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone ?? null,
          guestCountry: input.guestCountry ?? null,
          numberOfGuests: input.numberOfGuests,
          unitsRequired: pricing.unitsRequired ?? 1,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          nightlyRate: pricing.nightlyRate!.toFixed(2),
          totalNights,
          subtotal: pricing.subtotal!.toFixed(2),
          cleaningFee: pricing.cleaningFee!.toFixed(2),
          serviceFee: pricing.serviceFee!.toFixed(2),
          totalPrice: finalTotalPrice.toFixed(2),
          status: "PENDING_PAYMENT",
          source: "DIRECT",
          guestNotes: input.guestNotes ?? null,
          // Affiliate tracking
          affiliateLinkId,
          affiliateDiscount: affiliateDiscount > 0 ? affiliateDiscount.toFixed(2) : null,
        })
        .returning();

      if (!booking) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create booking",
        });
      }

      return {
        bookingId: booking.id,
        referenceCode: generateBookingReference(),
        totalPrice: finalTotalPrice,
        originalTotalPrice: pricing.totalPrice, // Before affiliate discount
        affiliateDiscount,
        collectionName: collection.name,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights: totalNights,
      };
    }),

  // ============================================
  // PROTECTED ENDPOINTS (LOGGED IN USERS)
  // ============================================

  /**
   * Get current user's bookings
   */
  getMyBookings: protectedProcedure.query(async ({ ctx }) => {
    const userBookings = await ctx.db.query.bookings.findMany({
      where: eq(bookings.userId, ctx.session.user.id),
      orderBy: [desc(bookings.createdAt)],
      with: {
        collection: true,
        assignedUnits: {
          with: {
            unit: true,
          },
        },
      },
    });

    return userBookings.map((booking) => ({
      id: booking.id,
      collection: booking.collection.name,
      unit: booking.assignedUnits.map((bu) => bu.unit.name).join(", ") || "Pending assignment",
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.numberOfGuests,
      totalPrice: booking.totalPrice,
      status: booking.status,
      source: booking.source,
      createdAt: booking.createdAt,
    }));
  }),

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get all bookings with filters
   */
  getAllBookings: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "PENDING_PAYMENT",
              "PAYMENT_RECEIVED",
              "CONFIRMED",
              "CANCELLED",
              "COMPLETED",
            ])
            .optional(),
          source: z
            .enum(["DIRECT", "AIRBNB", "BOOKING_COM", "SMOOBU", "OTHER"])
            .optional(),
          createdBy: z.enum(["ADMIN", "STAFF", "PUBLIC"]).optional(),
          collectionId: z.number().int().positive().optional(),
          limit: z.number().int().positive().default(50),
          offset: z.number().int().nonnegative().default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [];

      if (input?.status) {
        filters.push(eq(bookings.status, input.status));
      }
      if (input?.source) {
        filters.push(eq(bookings.source, input.source));
      }
      if (input?.collectionId) {
        filters.push(eq(bookings.collectionId, input.collectionId));
      }
      // Filter by who created the booking
      if (input?.createdBy === "PUBLIC") {
        // Public bookings have no createdByUserId
        filters.push(isNull(bookings.createdByUserId));
      } else if (input?.createdBy === "ADMIN" || input?.createdBy === "STAFF") {
        // Admin/Staff bookings have createdByUserId set
        filters.push(isNotNull(bookings.createdByUserId));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const allBookings = await ctx.db.query.bookings.findMany({
        where: whereClause,
        orderBy: [desc(bookings.createdAt)],
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        with: {
          collection: true,
          assignedUnits: {
            with: {
              unit: true,
            },
          },
          user: {
            columns: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // Get creator info for bookings created by staff/admin
      const creatorIds = [
        ...new Set(
          allBookings
            .map((b) => b.createdByUserId)
            .filter((id): id is string => id !== null),
        ),
      ];

      const creators =
        creatorIds.length > 0
          ? await ctx.db.query.users.findMany({
              where: (users, { inArray }) => inArray(users.id, creatorIds),
              columns: { id: true, name: true, email: true, role: true },
            })
          : [];

      const creatorMap = new Map(creators.map((c) => [c.id, c]));

      // Get total count for pagination
      const countResult = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(whereClause);

      return {
        bookings: allBookings.map((booking) => {
          const creator = booking.createdByUserId
            ? creatorMap.get(booking.createdByUserId)
            : null;

          return {
            id: booking.id,
            smoobuReservationId: booking.assignedUnits[0]?.smoobuReservationId ?? null,
            collection: booking.collection.name,
            collectionId: booking.collectionId,
            unit: booking.assignedUnits.map((bu) => bu.unit.name).join(", ") || undefined,
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            guestPhone: booking.guestPhone,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            guests: booking.numberOfGuests,
            totalPrice: booking.totalPrice,
            status: booking.status,
            approvalStatus: booking.approvalStatus,
            source: booking.source,
            user: booking.user,
            confirmedAt: booking.confirmedAt,
            cancelledAt: booking.cancelledAt,
            cancellationReason: booking.cancellationReason,
            createdAt: booking.createdAt,
            // Who created this booking
            createdByType: creator
              ? creator.role === "ADMIN"
                ? "ADMIN"
                : "STAFF"
              : ("PUBLIC" as "ADMIN" | "STAFF" | "PUBLIC"),
            createdBy: creator
              ? { name: creator.name, email: creator.email }
              : null,
          };
        }),
        total: countResult[0]?.count ?? 0,
      };
    }),

  /**
   * Cancel a booking
   */
  cancelBooking: adminProcedure
    .input(
      z.object({
        bookingId: z.number().int().positive(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await cancelBooking(
        input.bookingId,
        ctx.session.user.id,
        input.reason,
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to cancel booking",
        });
      }

      return { success: true };
    }),

  /**
   * Bulk cancel stale PENDING_PAYMENT bookings (older than 7 days)
   * Excludes staff-created bookings waiting for approval
   */
  bulkCancelStaleBookings: adminProcedure.mutation(async ({ ctx }) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find stale bookings: PENDING_PAYMENT, older than 7 days, NOT staff approval bookings
    const staleBookings = await ctx.db
      .update(bookings)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: ctx.session.user.id,
        cancellationReason: "Auto-cancelled: abandoned payment (stale for 7+ days)",
      })
      .where(
        and(
          eq(bookings.status, "PENDING_PAYMENT"),
          isNull(bookings.approvalStatus),
          lte(bookings.createdAt, sevenDaysAgo),
        ),
      )
      .returning({ id: bookings.id });

    return { cancelledCount: staleBookings.length };
  }),

  /**
   * Admin create booking (auto-approved, no approval workflow)
   * Creates a confirmed booking immediately
   */
  adminCreateBooking: adminProcedure
    .input(
      z.object({
        // Guest info
        guestEmail: z.string().email(),
        guestName: z.string().min(1),
        guestPhone: z.string().optional(),
        guestCountry: z.string().optional(),
        numberOfGuests: z.number().int().min(1).default(1),
        // Booking details
        collectionId: z.number().int().positive(),
        checkIn: z.string(), // Date string YYYY-MM-DD
        checkOut: z.string(),
        // Pricing
        nightlyRate: z.string().regex(/^\d+\.?\d*$/),
        totalNights: z.number().int().min(1),
        cleaningFee: z.string().regex(/^\d+\.?\d*$/).default("0"),
        serviceFee: z.string().regex(/^\d+\.?\d*$/).default("0"),
        totalPrice: z.string().regex(/^\d+\.?\d*$/),
        currency: z.string().default("PHP"),
        // Optional
        guestNotes: z.string().optional(),
        internalNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const adminUserId = ctx.session.user.id;

      // Check if guest user exists
      let guestUser = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, input.guestEmail.toLowerCase()),
      });

      const subtotal = (parseFloat(input.nightlyRate) * input.totalNights).toFixed(2);

      // Admin creates booking directly as CONFIRMED (no approval needed)
      const [booking] = await ctx.db
        .insert(bookings)
        .values({
          // Guest info
          userId: guestUser?.id ?? null,
          guestName: input.guestName,
          guestEmail: input.guestEmail.toLowerCase(),
          guestPhone: input.guestPhone ?? null,
          guestCountry: input.guestCountry ?? null,
          numberOfGuests: input.numberOfGuests,
          // Booking details
          collectionId: input.collectionId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          // Pricing
          nightlyRate: input.nightlyRate,
          totalNights: input.totalNights,
          subtotal,
          cleaningFee: input.cleaningFee,
          serviceFee: input.serviceFee,
          totalPrice: input.totalPrice,
          currency: input.currency,
          // Status - Admin creates as CONFIRMED directly
          status: "CONFIRMED",
          source: "OTHER", // Admin manual entry
          // Notes
          guestNotes: input.guestNotes ?? null,
          internalNotes: input.internalNotes ?? null,
          // Track who created it
          createdByUserId: adminUserId,
          // Auto-approved
          approvalStatus: "APPROVED",
          approvedByUserId: adminUserId,
          approvedAt: new Date(),
          confirmedAt: new Date(),
        })
        .returning();

      if (!booking) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create booking",
        });
      }

      // Sync to Smoobu (assigns unit and creates reservation)
      const smoobuResult = await syncBookingToSmoobu(booking.id);

      if (smoobuResult.error && !smoobuResult.unitId) {
        console.warn(`⚠️ Admin booking ${booking.id} created but Smoobu sync had issues: ${smoobuResult.error}`);
      }

      return {
        booking,
        unitName: smoobuResult.unitName,
        smoobuSynced: !!smoobuResult.smoobuReservationId,
        message: smoobuResult.smoobuReservationId
          ? "Booking created, confirmed, and synced to Smoobu"
          : "Booking created and confirmed (Smoobu sync pending)",
      };
    }),

  /**
   * Get Smoobu apartments for linking
   */
  getSmoobuApartments: adminProcedure.query(async () => {
    try {
      const apartments = await smoobuClient.getApartments();
      return apartments.map((apt) => ({
        id: apt.id,
        name: apt.name,
        location: apt.location,
        maxOccupancy: apt.rooms?.maxOccupancy ?? 0,
      }));
    } catch (error) {
      console.error("Failed to fetch Smoobu apartments:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to connect to Smoobu",
      });
    }
  }),

  /**
   * Get units for linking (with their current Smoobu link status)
   */
  getUnitsForLinking: adminProcedure
    .input(
      z
        .object({
          collectionId: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [];

      if (input?.collectionId) {
        filters.push(eq(units.collectionId, input.collectionId));
      }

      const allUnits = await ctx.db.query.units.findMany({
        where: filters.length > 0 ? and(...filters) : undefined,
        orderBy: [asc(units.name)],
        with: {
          collection: {
            columns: { id: true, name: true },
          },
        },
      });

      return allUnits.map((unit) => ({
        id: unit.id,
        name: unit.name,
        collection: unit.collection,
        smoobuApartmentId: unit.smoobuApartmentId,
        isLinked: unit.smoobuApartmentId !== null,
      }));
    }),

  /**
   * Link a unit to a Smoobu apartment
   */
  linkUnitToSmoobu: adminProcedure
    .input(
      z.object({
        unitId: z.number().int().positive(),
        smoobuApartmentId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the apartment is already linked to another unit
      const existingLink = await ctx.db.query.units.findFirst({
        where: eq(units.smoobuApartmentId, input.smoobuApartmentId),
      });

      if (existingLink && existingLink.id !== input.unitId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Smoobu apartment is already linked to unit ${existingLink.name}`,
        });
      }

      // Update the unit
      await ctx.db
        .update(units)
        .set({
          smoobuApartmentId: input.smoobuApartmentId,
        })
        .where(eq(units.id, input.unitId));

      return { success: true };
    }),

  /**
   * Unlink a unit from Smoobu
   */
  unlinkUnitFromSmoobu: adminProcedure
    .input(
      z.object({
        unitId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(units)
        .set({
          smoobuApartmentId: null,
        })
        .where(eq(units.id, input.unitId));

      return { success: true };
    }),

  /**
   * Test Smoobu connection
   */
  testSmoobuConnection: adminProcedure.mutation(async () => {
    try {
      const isConnected = await smoobuClient.testConnection();
      return { connected: isConnected };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }),

  /**
   * Get booking revenue from CACHE (fast)
   * Reads pre-computed data from database
   * Use refreshBookingRevenue to update cache from Smoobu
   */
  getBookingRevenue: adminProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2100),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 1. Get linked units with their info
      const linkedUnits = await ctx.db.query.units.findMany({
        where: isNotNull(units.smoobuApartmentId),
        with: {
          collection: true,
        },
      });

      if (linkedUnits.length === 0) {
        return {
          year: input.year,
          units: [],
          monthlyTotals: {} as Record<number, number>,
          yearTotal: 0,
          bookingCount: 0,
          currency: "PHP",
          lastRefreshedAt: null,
          error: null,
        };
      }

      // 2. Get cache meta (when was it last refreshed?)
      const cacheMeta = await ctx.db.query.bookingRevenueCacheMeta.findFirst({
        where: eq(bookingRevenueCacheMeta.year, input.year),
      });

      // 3. Get cached revenue data
      const cachedData = await ctx.db.query.bookingRevenueCache.findMany({
        where: eq(bookingRevenueCache.year, input.year),
      });

      // 4. Build unit revenue map from cache
      const unitRevenueMap = new Map<
        number,
        {
          unitId: number;
          unitName: string;
          collectionName: string;
          smoobuApartmentId: number;
          monthlyRevenue: Record<number, number>;
          yearTotal: number;
          bookingCount: number;
        }
      >();

      // Initialize all units with zero
      for (const unit of linkedUnits) {
        unitRevenueMap.set(unit.id, {
          unitId: unit.id,
          unitName: unit.name,
          collectionName: unit.collection.name,
          smoobuApartmentId: unit.smoobuApartmentId!,
          monthlyRevenue: {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
            7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
          },
          yearTotal: 0,
          bookingCount: 0,
        });
      }

      // Fill in cached data
      for (const row of cachedData) {
        const unitData = unitRevenueMap.get(row.unitId);
        if (unitData) {
          const revenue = parseFloat(row.revenue);
          unitData.monthlyRevenue[row.month] = revenue;
          unitData.yearTotal += revenue;
          unitData.bookingCount += row.bookingCount;
        }
      }

      // 5. Calculate totals
      const monthlyTotals: Record<number, number> = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
        7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
      };
      let yearTotal = 0;
      let totalBookingCount = 0;

      for (const data of unitRevenueMap.values()) {
        for (let m = 1; m <= 12; m++) {
          monthlyTotals[m] = (monthlyTotals[m] ?? 0) + (data.monthlyRevenue[m] ?? 0);
        }
        yearTotal += data.yearTotal;
        totalBookingCount += data.bookingCount;
      }

      return {
        year: input.year,
        units: Array.from(unitRevenueMap.values()).sort((a, b) =>
          a.unitName.localeCompare(b.unitName),
        ),
        monthlyTotals,
        yearTotal,
        bookingCount: totalBookingCount,
        currency: "PHP",
        lastRefreshedAt: cacheMeta?.lastRefreshedAt ?? null,
        error: cacheMeta?.error ?? null,
      };
    }),

  /**
   * Refresh booking revenue cache from Smoobu
   * Fetches all reservations for the year and updates cache
   */
  refreshBookingRevenue: adminProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const adminUserId = ctx.session.user.id;

      // 1. Get linked units
      const linkedUnits = await ctx.db.query.units.findMany({
        where: isNotNull(units.smoobuApartmentId),
      });

      if (linkedUnits.length === 0) {
        return {
          success: true,
          message: "No linked units to refresh",
          bookingCount: 0,
        };
      }

      // 2. Build apartment to unit mapping
      const apartmentToUnit = new Map<number, (typeof linkedUnits)[number]>();
      for (const unit of linkedUnits) {
        if (unit.smoobuApartmentId) {
          apartmentToUnit.set(unit.smoobuApartmentId, unit);
        }
      }

      // 3. Fetch reservations from Smoobu
      const startDate = `${input.year}-01-01`;
      const endDate = `${input.year}-12-31`;

      let smoobuReservations: SmoobuReservation[] = [];
      let apiError: string | null = null;

      try {
        smoobuReservations = await smoobuClient.getAllReservations({
          from: startDate,
          to: endDate,
        });
      } catch (error) {
        apiError = error instanceof Error ? error.message : "Failed to fetch from Smoobu";

        // Update meta with error
        await ctx.db
          .insert(bookingRevenueCacheMeta)
          .values({
            year: input.year,
            lastRefreshedAt: new Date(),
            refreshedByUserId: adminUserId,
            error: apiError,
          })
          .onConflictDoUpdate({
            target: bookingRevenueCacheMeta.year,
            set: {
              lastRefreshedAt: new Date(),
              refreshedByUserId: adminUserId,
              error: apiError,
            },
          });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: apiError,
        });
      }

      // 4. Filter to relevant reservations
      // Debug: Log what we're filtering out
      // We now include "reservation" AND "modification of booking" types
      // Only exclude "cancellation" type
      const excludedByType = smoobuReservations.filter(r => r.type === "cancellation");
      const includedTypes = smoobuReservations.filter(r => r.type === "reservation" || r.type === "modification of booking");
      const excludedByNoApartment = includedTypes.filter(r => r.apartment === null);
      const excludedByNotLinked = includedTypes.filter(
        r => r.apartment !== null && !apartmentToUnit.has(r.apartment.id)
      );

      console.log(`📊 Smoobu Revenue Debug for ${input.year}:`);
      console.log(`   Total reservations from API: ${smoobuReservations.length}`);
      console.log(`   Excluded cancellations: ${excludedByType.length}`);
      console.log(`   Included types (reservation + modification): ${includedTypes.length}`);
      console.log(`   Excluded by no apartment: ${excludedByNoApartment.length}`);
      console.log(`   Excluded by apartment not linked: ${excludedByNotLinked.length}`);

      // Log unlinked apartment IDs
      const unlinkedApartmentIds = new Set<number>();
      for (const r of excludedByNotLinked) {
        if (r.apartment?.id) unlinkedApartmentIds.add(r.apartment.id);
      }
      if (unlinkedApartmentIds.size > 0) {
        console.log(`   Unlinked apartment IDs: ${Array.from(unlinkedApartmentIds).join(", ")}`);
      }

      // DETAILED DEBUG: Log type breakdown
      const typeCount = new Map<string, number>();
      for (const r of smoobuReservations) {
        const t = r.type ?? "unknown";
        typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
      }
      console.log(`   Type breakdown: ${JSON.stringify(Object.fromEntries(typeCount))}`);
      console.log(`   (Including: reservation, modification of booking | Excluding: cancellation)`);

      // DETAILED DEBUG: Log December entries for linked apartment
      const linkedApartmentIds = Array.from(apartmentToUnit.keys());
      console.log(`   Linked apartment IDs: ${linkedApartmentIds.join(", ")}`);

      // December entries being COUNTED (reservations + modifications)
      const decemberCounted = smoobuReservations.filter(
        r => (r.type === "reservation" || r.type === "modification of booking") &&
             r.apartment !== null &&
             apartmentToUnit.has(r.apartment.id) &&
             r.arrival.startsWith(`${input.year}-12`)
      );
      console.log(`\n   📅 DECEMBER ENTRIES COUNTED (${decemberCounted.length}):`);
      for (const r of decemberCounted) {
        console.log(`      - ID: ${r.id}, Type: ${r.type}, Guest: ${r["guest-name"]}, Arrival: ${r.arrival}, Price: ${r.price}, Channel: ${r.channel?.name ?? "direct"}`);
      }

      // December cancellations (excluded)
      const decemberCancellations = smoobuReservations.filter(
        r => r.type === "cancellation" &&
             r.apartment !== null &&
             apartmentToUnit.has(r.apartment.id) &&
             r.arrival.startsWith(`${input.year}-12`)
      );
      if (decemberCancellations.length > 0) {
        console.log(`\n   ❌ DECEMBER CANCELLATIONS EXCLUDED (${decemberCancellations.length}):`);
        for (const r of decemberCancellations) {
          console.log(`      - ID: ${r.id}, Guest: ${r["guest-name"]}, Arrival: ${r.arrival}, Price: ${r.price}, Channel: ${r.channel?.name ?? "direct"}`);
        }
      }

      // Include both "reservation" and "modification of booking" types
      // Exclude "cancellation" type - those are cancelled bookings
      const relevantReservations = smoobuReservations.filter(
        (res) =>
          (res.type === "reservation" || res.type === "modification of booking") &&
          res.apartment !== null &&
          apartmentToUnit.has(res.apartment.id),
      );

      console.log(`   Relevant reservations after filter: ${relevantReservations.length}`);

      // 5. Aggregate revenue by unit and month
      const revenueData = new Map<string, { revenue: number; bookingCount: number }>();
      let totalRevenue = 0;
      const monthlyDebug: Record<number, { count: number; revenue: number }> = {};

      for (const res of relevantReservations) {
        const unit = apartmentToUnit.get(res.apartment!.id);
        if (!unit) continue;

        const [year, monthStr] = res.arrival.split("-");
        const month = parseInt(monthStr ?? "1", 10);

        if (parseInt(year ?? "0", 10) === input.year) {
          const key = `${unit.id}-${month}`;
          const existing = revenueData.get(key) ?? { revenue: 0, bookingCount: 0 };
          existing.revenue += res.price;
          existing.bookingCount += 1;
          revenueData.set(key, existing);

          totalRevenue += res.price;
          monthlyDebug[month] = monthlyDebug[month] ?? { count: 0, revenue: 0 };
          monthlyDebug[month].count += 1;
          monthlyDebug[month].revenue += res.price;
        }
      }

      console.log(`   Total revenue computed: ${totalRevenue}`);
      console.log(`   December: ${monthlyDebug[12]?.count ?? 0} bookings, ${monthlyDebug[12]?.revenue ?? 0} revenue`);

      // 6. Delete old cache for this year
      await ctx.db
        .delete(bookingRevenueCache)
        .where(eq(bookingRevenueCache.year, input.year));

      // 7. Insert new cache data
      const cacheRows: Array<{
        year: number;
        unitId: number;
        month: number;
        revenue: string;
        bookingCount: number;
      }> = [];

      for (const unit of linkedUnits) {
        for (let month = 1; month <= 12; month++) {
          const key = `${unit.id}-${month}`;
          const data = revenueData.get(key) ?? { revenue: 0, bookingCount: 0 };
          cacheRows.push({
            year: input.year,
            unitId: unit.id,
            month,
            revenue: data.revenue.toFixed(2),
            bookingCount: data.bookingCount,
          });
        }
      }

      if (cacheRows.length > 0) {
        await ctx.db.insert(bookingRevenueCache).values(cacheRows);
      }

      // 8. Update cache meta
      await ctx.db
        .insert(bookingRevenueCacheMeta)
        .values({
          year: input.year,
          lastRefreshedAt: new Date(),
          refreshedByUserId: adminUserId,
          error: null,
        })
        .onConflictDoUpdate({
          target: bookingRevenueCacheMeta.year,
          set: {
            lastRefreshedAt: new Date(),
            refreshedByUserId: adminUserId,
            error: null,
          },
        });

      console.log(`✅ Booking revenue cache refreshed for ${input.year}: ${relevantReservations.length} bookings`);

      return {
        success: true,
        message: `Cache refreshed with ${relevantReservations.length} bookings`,
        bookingCount: relevantReservations.length,
      };
    }),
});
