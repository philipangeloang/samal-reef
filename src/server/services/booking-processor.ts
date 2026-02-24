/**
 * Booking Processing Service
 *
 * This module handles the lifecycle of booking confirmations after payment.
 * Used by:
 * - Stripe webhook (after booking payment confirmed)
 * - DePay callback (after blockchain confirmation for booking)
 * - Admin approval (after manual booking payment approved)
 *
 * The flow is:
 * 1. Find available unit with Smoobu linked
 * 2. Create reservation in Smoobu as "paid"
 * 3. Update local booking (unitId, smoobuReservationId, status)
 * 4. Send confirmation email
 */

import "server-only";
import { db } from "@/server/db";
import {
  bookings,
  bookingUnits,
  units,
  propertyCollections,
  collectionDiscounts,
  affiliateLinks,
  affiliateTransactions,
  affiliateProfiles,
  users,
} from "@/server/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { smoobuClient } from "./smoobu-client";
import { emailService } from "@/server/email";


export interface ProcessBookingInput {
  bookingId: number;
  paymentId?: number;
}

export interface ProcessBookingResult {
  success: boolean;
  bookingId?: number;
  unitId?: number;
  unitName?: string;
  smoobuReservationId?: number;
  error?: string;
}

/**
 * Process a booking after payment confirmation
 * - Finds an available unit
 * - Creates reservation in Smoobu
 * - Updates local booking record
 * - Sends confirmation email
 *
 * This function is idempotent - if booking is already confirmed, returns existing data
 */
export async function processBookingPayment(
  input: ProcessBookingInput,
): Promise<ProcessBookingResult> {
  try {
    // 1. Get the booking and verify status
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, input.bookingId),
      with: {
        collection: true,
        assignedUnits: {
          with: { unit: true },
        },
        user: true,
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // Idempotency check - if already confirmed, return existing data
    if (booking.status === "CONFIRMED" || booking.status === "COMPLETED") {
      const firstAssigned = booking.assignedUnits[0];
      return {
        success: true,
        bookingId: booking.id,
        unitId: firstAssigned?.unitId,
        unitName: booking.assignedUnits.map((bu) => bu.unit.name).join(", ") || undefined,
        smoobuReservationId: firstAssigned?.smoobuReservationId ?? undefined,
      };
    }

    // Booking should be in PENDING_PAYMENT or PAYMENT_RECEIVED status
    if (booking.status !== "PENDING_PAYMENT" && booking.status !== "PAYMENT_RECEIVED") {
      return {
        success: false,
        error: `Invalid booking status: ${booking.status}`,
      };
    }

    // 2. Update to PAYMENT_RECEIVED if coming from PENDING_PAYMENT
    if (booking.status === "PENDING_PAYMENT") {
      await db
        .update(bookings)
        .set({
          status: "PAYMENT_RECEIVED",
          paymentId: input.paymentId,
        })
        .where(eq(bookings.id, input.bookingId));
    }

    // 3. Find available units (multi-unit support)
    const unitsNeeded = booking.unitsRequired ?? 1;
    const availableUnits = await findAvailableUnitsForBooking(
      booking.collectionId,
      booking.checkIn,
      booking.checkOut,
      unitsNeeded,
    );

    if (!availableUnits || availableUnits.length === 0) {
      return {
        success: false,
        error: `No available units with Smoobu linked for the selected dates (need ${unitsNeeded})`,
      };
    }

    // 4. Create Smoobu reservations for each assigned unit
    const nameParts = booking.guestName.split(" ");
    const firstName = nameParts[0] ?? booking.guestName;
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const totalPrice = parseFloat(booking.totalPrice);
    const pricePerUnit = Math.round((totalPrice / unitsNeeded) * 100) / 100;
    const guestsPerUnit = Math.ceil(booking.numberOfGuests / unitsNeeded);

    let primarySmoobuReservationId: number | null = null;

    for (let i = 0; i < availableUnits.length; i++) {
      const unit = availableUnits[i]!;
      let smoobuResId: number | null = null;

      if (unit.smoobuApartmentId) {
        try {
          const smoobuReservation = await smoobuClient.createReservation({
            apartmentId: unit.smoobuApartmentId,
            arrival: booking.checkIn,
            departure: booking.checkOut,
            firstName,
            lastName,
            email: booking.guestEmail,
            phone: booking.guestPhone ?? undefined,
            adults: guestsPerUnit,
            children: 0,
            notice: booking.guestNotes ?? undefined,
            price: pricePerUnit,
            priceStatus: 1,
          });
          smoobuResId = smoobuReservation.id;
          if (i === 0) primarySmoobuReservationId = smoobuResId;
        } catch (smoobuError) {
          console.error(`Failed to create Smoobu reservation for unit ${unit.name}:`, smoobuError);
        }
      }

      // Insert into bookingUnits junction table
      await db.insert(bookingUnits).values({
        bookingId: booking.id,
        unitId: unit.id,
        smoobuReservationId: smoobuResId,
      });
    }

    const primaryUnit = availableUnits[0]!;

    // 5. Update local booking status
    await db
      .update(bookings)
      .set({
        status: "CONFIRMED",
        confirmedAt: new Date(),
      })
      .where(eq(bookings.id, input.bookingId));

    // 6. Handle affiliate commission if booking has affiliate link
    if (booking.affiliateLinkId) {
      try {
        await createBookingAffiliateCommission(booking);
      } catch (commissionError) {
        console.error("Failed to create affiliate commission:", commissionError);
        // Don't fail the booking process for commission errors
      }
    }

    // 7. Send confirmation email
    const unitNames = availableUnits.map((u) => u.name).join(", ");
    try {
      await sendBookingConfirmationEmail({
        bookingId: booking.id,
        guestEmail: booking.guestEmail,
        guestName: booking.guestName,
        unitName: unitNames,
        collectionName: booking.collection.name,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalPrice: booking.totalPrice,
        numberOfGuests: booking.numberOfGuests,
      });
    } catch (emailError) {
      console.error("Failed to send booking confirmation email:", emailError);
    }

    return {
      success: true,
      bookingId: booking.id,
      unitId: primaryUnit.id,
      unitName: unitNames,
      smoobuReservationId: primarySmoobuReservationId ?? undefined,
    };
  } catch (error) {
    console.error("Booking processing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Find available units for a booking
 * Requirements:
 * - Unit must have Smoobu linked (smoobuApartmentId is not null)
 * - Unit must not have overlapping bookings (local or in Smoobu)
 * - Unit must be in the specified collection
 *
 * This checks Smoobu's real-time availability to ensure we don't
 * assign a unit that's been booked through Airbnb/Booking.com.
 *
 * @param count - Number of units needed (defaults to 1)
 * @returns Array of available units, or null if not enough available
 */
async function findAvailableUnitsForBooking(
  collectionId: number,
  checkIn: string,
  checkOut: string,
  count: number = 1,
): Promise<{ id: number; name: string; smoobuApartmentId: number | null }[] | null> {
  // Find units in the collection with Smoobu linked
  const collectionUnits = await db.query.units.findMany({
    where: and(
      eq(units.collectionId, collectionId),
      eq(units.status, "AVAILABLE"),
      isNotNull(units.smoobuApartmentId),
    ),
    columns: {
      id: true,
      name: true,
      smoobuApartmentId: true,
    },
  });

  if (collectionUnits.length === 0) {
    return null;
  }

  // Find units that already have local bookings overlapping with the requested dates
  const bookedUnitRows = await db
    .select({ unitId: bookingUnits.unitId })
    .from(bookingUnits)
    .innerJoin(bookings, eq(bookingUnits.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.collectionId, collectionId),
        sql`${bookings.status} IN ('CONFIRMED', 'COMPLETED')`,
        sql`${bookings.checkIn} < ${checkOut}`,
        sql`${bookings.checkOut} > ${checkIn}`,
      ),
    );

  const locallyBookedIds = new Set(bookedUnitRows.map((b) => b.unitId));

  // Check Smoobu for real-time availability to find blocked units
  const smoobuBlockedApartmentIds = new Set<number>();

  const smoobuApartmentIds = collectionUnits
    .map((u) => u.smoobuApartmentId)
    .filter((id): id is number => id !== null);

  if (smoobuApartmentIds.length > 0) {
    try {
      const smoobuRates = await smoobuClient.getRatesForApartments(
        smoobuApartmentIds,
        checkIn,
        checkOut,
      );

      for (const apartmentId of smoobuApartmentIds) {
        const rates = smoobuRates.get(apartmentId);
        if (rates) {
          const hasBlockedDate = rates.some((r) => r.available === 0);
          if (hasBlockedDate) {
            smoobuBlockedApartmentIds.add(apartmentId);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to check Smoobu availability for unit selection:", error);
    }
  }

  // Collect available units up to the required count
  const availableUnits: { id: number; name: string; smoobuApartmentId: number | null }[] = [];

  for (const unit of collectionUnits) {
    if (locallyBookedIds.has(unit.id)) continue;
    if (unit.smoobuApartmentId && smoobuBlockedApartmentIds.has(unit.smoobuApartmentId)) continue;

    availableUnits.push(unit);
    if (availableUnits.length >= count) break;
  }

  return availableUnits.length >= count ? availableUnits : null;
}

/**
 * Cancel a booking
 * - Updates local booking status
 * - Cancels reservation in Smoobu if exists
 */
export async function cancelBooking(
  bookingId: number,
  cancelledBy: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: {
        collection: true,
        assignedUnits: true,
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.status === "CANCELLED") {
      return { success: true }; // Already cancelled
    }

    // Cancel all Smoobu reservations for assigned units
    for (const bu of booking.assignedUnits) {
      if (bu.smoobuReservationId) {
        try {
          await smoobuClient.cancelReservation(bu.smoobuReservationId);
        } catch (smoobuError) {
          console.error(`Failed to cancel Smoobu reservation ${bu.smoobuReservationId}:`, smoobuError);
          // Continue with local cancellation
        }
      }
    }

    // Update local booking
    await db
      .update(bookings)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: reason,
      })
      .where(eq(bookings.id, bookingId));

    // Send cancellation email
    try {
      await emailService.sendBookingCancellation({
        to: booking.guestEmail,
        guestName: booking.guestName,
        collectionName: booking.collection?.name ?? "Resort Booking",
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        reason,
      });
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }

    return { success: true };
  } catch (error) {
    console.error("Booking cancellation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check availability for a collection on specific dates
 * Returns the number of available units
 *
 * This checks both Smoobu's real-time availability (for Airbnb, Booking.com, etc.)
 * and local bookings to ensure accurate availability.
 */
export async function checkCollectionAvailability(
  collectionId: number,
  checkIn: string,
  checkOut: string,
): Promise<{
  available: boolean;
  availableUnits: number;
  totalUnits: number;
}> {
  // Get all units with Smoobu linked in this collection
  const collectionUnits = await db.query.units.findMany({
    where: and(
      eq(units.collectionId, collectionId),
      eq(units.status, "AVAILABLE"),
      isNotNull(units.smoobuApartmentId),
    ),
    columns: { id: true, smoobuApartmentId: true },
  });

  const totalUnits = collectionUnits.length;

  if (totalUnits === 0) {
    return { available: false, availableUnits: 0, totalUnits: 0 };
  }

  // Get Smoobu apartment IDs
  const smoobuApartmentIds = collectionUnits
    .map((u) => u.smoobuApartmentId)
    .filter((id): id is number => id !== null);

  // Check Smoobu for real-time availability from all channels
  let smoobuBlockedUnits = 0;

  if (smoobuApartmentIds.length > 0) {
    try {
      const smoobuRates = await smoobuClient.getRatesForApartments(
        smoobuApartmentIds,
        checkIn,
        checkOut,
      );

      // A unit is blocked if ANY date in the range is unavailable
      for (const apartmentId of smoobuApartmentIds) {
        const rates = smoobuRates.get(apartmentId);
        if (rates) {
          const hasBlockedDate = rates.some((r) => r.available === 0);
          if (hasBlockedDate) {
            smoobuBlockedUnits++;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to check Smoobu availability, falling back to local data:", error);
      // Continue with local check only
    }
  }

  // Also count local bookings (for bookings not yet synced to Smoobu)
  const bookedUnitRows = await db
    .select({ unitId: bookingUnits.unitId })
    .from(bookingUnits)
    .innerJoin(bookings, eq(bookingUnits.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.collectionId, collectionId),
        sql`${bookings.status} IN ('CONFIRMED', 'COMPLETED')`,
        sql`${bookings.checkIn} < ${checkOut}`,
        sql`${bookings.checkOut} > ${checkIn}`,
      ),
    );

  const uniqueLocalBookedIds = new Set(bookedUnitRows.map((b) => b.unitId));

  // Use the higher of the two counts (Smoobu or local) to be safe
  // This ensures we don't overbook even if there's sync delay
  const blockedUnits = Math.max(smoobuBlockedUnits, uniqueLocalBookedIds.size);
  const availableUnits = totalUnits - blockedUnits;

  return {
    available: availableUnits > 0,
    availableUnits,
    totalUnits,
  };
}

/**
 * Get pricing for a booking
 * Uses local pricing from collection (not Smoobu rates)
 * If guests exceeds maxGuests per unit, pricing is multiplied by units needed
 */
export async function getBookingPricing(
  collectionId: number,
  checkIn: string,
  checkOut: string,
  guests?: number,
): Promise<{
  available: boolean;
  nightlyRate?: number;
  originalNightlyRate?: number; // Before discount (for strikethrough display)
  totalNights?: number;
  subtotal?: number;
  originalSubtotal?: number; // Before discount
  cleaningFee?: number;
  serviceFee?: number;
  totalPrice?: number;
  originalTotalPrice?: number; // Before discount
  minStay?: number;
  maxGuests?: number;
  unitsRequired?: number;
  discountPercent?: number;
  discountLabel?: string;
  discounts?: Array<{ percent: number; label: string; conditionType: string }>;
  error?: string;
}> {
  // Get collection with pricing info
  const collection = await db.query.propertyCollections.findFirst({
    where: eq(propertyCollections.id, collectionId),
  });

  if (!collection) {
    return { available: false, error: "Collection not found" };
  }

  // Check if booking pricing is configured
  if (!collection.bookingPricePerNight) {
    return { available: false, error: "Booking pricing not configured for this property" };
  }

  // Calculate nights
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const totalNights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (totalNights <= 0) {
    return { available: false, error: "Invalid date range" };
  }

  // Check minimum nights
  const minNights = collection.bookingMinNights ?? 1;
  if (totalNights < minNights) {
    return {
      available: false,
      minStay: minNights,
      error: `Minimum stay is ${minNights} night${minNights > 1 ? "s" : ""}`,
    };
  }

  // Parse pricing from collection
  const baseNightlyRate = parseFloat(collection.bookingPricePerNight);
  const cleaningFee = parseFloat(collection.bookingCleaningFee ?? "50.00");
  const serviceFeePercent = parseFloat(collection.bookingServiceFeePercent ?? "10.00");
  const maxGuests = collection.bookingMaxGuests ?? 6;

  // Calculate how many units are needed based on guest count
  const guestCount = guests ?? 1;
  const unitsRequired = Math.ceil(guestCount / maxGuests);

  // Check availability - ensure enough units are available
  const availability = await checkCollectionAvailability(collectionId, checkIn, checkOut);
  if (!availability.available || availability.availableUnits < unitsRequired) {
    return {
      available: false,
      error: unitsRequired > 1
        ? `Need ${unitsRequired} units for ${guestCount} guests but only ${availability.availableUnits} available`
        : "No units available for selected dates",
    };
  }

  // Evaluate conditional discounts
  const allDiscounts = await db.query.collectionDiscounts.findMany({
    where: and(
      eq(collectionDiscounts.collectionId, collectionId),
      eq(collectionDiscounts.isActive, true),
    ),
  });

  const checkInDay = checkInDate.getDay(); // 0=Sun, 5=Fri, 6=Sat

  // Filter to matching discounts
  const matchingDiscounts = allDiscounts.filter((d) => {
    switch (d.conditionType) {
      case "ALWAYS":
        return true;
      case "MIN_NIGHTS": {
        const val = d.conditionValue ? JSON.parse(d.conditionValue) as { minNights: number } : null;
        return val ? totalNights >= val.minNights : false;
      }
      case "DATE_RANGE": {
        const val = d.conditionValue ? JSON.parse(d.conditionValue) as { startDate: string; endDate: string } : null;
        if (!val) return false;
        // Booking overlaps range if checkIn < rangeEnd and checkOut > rangeStart
        return checkIn < val.endDate && checkOut > val.startDate;
      }
      case "WEEKEND":
        return checkInDay === 5 || checkInDay === 6; // Friday or Saturday
      case "WEEKDAY":
        return checkInDay >= 1 && checkInDay <= 4; // Monday through Thursday
      default:
        return false;
    }
  });

  // Group by conditionType, pick highest percent per group, then sum across groups
  const bestByType = new Map<string, { percent: number; label: string; conditionType: string }>();
  for (const d of matchingDiscounts) {
    const pct = parseFloat(d.percent);
    const existing = bestByType.get(d.conditionType);
    if (!existing || pct > existing.percent) {
      bestByType.set(d.conditionType, { percent: pct, label: d.label, conditionType: d.conditionType });
    }
  }

  const activeDiscounts = Array.from(bestByType.values());
  const discountPercent = activeDiscounts.reduce((sum, d) => sum + d.percent, 0);
  const discountLabel = activeDiscounts.length === 1 ? activeDiscounts[0]!.label : undefined;

  // Calculate prices (per unit, then multiply by units needed)
  const originalNightlyRate = baseNightlyRate;
  const discountedNightlyRate = discountPercent > 0
    ? baseNightlyRate * (1 - discountPercent / 100)
    : baseNightlyRate;

  const originalSubtotal = originalNightlyRate * totalNights * unitsRequired;
  const subtotal = discountedNightlyRate * totalNights * unitsRequired;

  const totalCleaningFee = cleaningFee * unitsRequired;

  const serviceFee = Math.round(subtotal * (serviceFeePercent / 100) * 100) / 100;
  const originalServiceFee = Math.round(originalSubtotal * (serviceFeePercent / 100) * 100) / 100;

  const totalPrice = Math.round((subtotal + totalCleaningFee + serviceFee) * 100) / 100;
  const originalTotalPrice = Math.round((originalSubtotal + totalCleaningFee + originalServiceFee) * 100) / 100;

  return {
    available: true,
    nightlyRate: Math.round(discountedNightlyRate * 100) / 100,
    originalNightlyRate: discountPercent > 0 ? originalNightlyRate : undefined,
    totalNights,
    subtotal: Math.round(subtotal * 100) / 100,
    originalSubtotal: discountPercent > 0 ? originalSubtotal : undefined,
    cleaningFee: totalCleaningFee,
    serviceFee,
    totalPrice,
    originalTotalPrice: discountPercent > 0 ? originalTotalPrice : undefined,
    minStay: minNights,
    maxGuests,
    unitsRequired,
    discountPercent: discountPercent > 0 ? discountPercent : undefined,
    discountLabel,
    discounts: activeDiscounts.length > 0 ? activeDiscounts : undefined,
  };
}

/**
 * Send booking confirmation email
 */
async function sendBookingConfirmationEmail(params: {
  bookingId: number;
  guestEmail: string;
  guestName: string;
  unitName: string;
  collectionName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  numberOfGuests: number;
}): Promise<void> {
  await emailService.sendBookingConfirmation({
    to: params.guestEmail,
    guestName: params.guestName,
    collectionName: params.collectionName,
    unitName: params.unitName,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: params.numberOfGuests,
    totalPrice: params.totalPrice,
    bookingId: params.bookingId,
  });
}

/**
 * Sync a confirmed booking to Smoobu
 * Used by admin/staff direct booking creation and approval flows
 *
 * This function:
 * 1. Finds an available unit with Smoobu linked
 * 2. Creates a reservation in Smoobu
 * 3. Updates the local booking with unitId and smoobuReservationId
 *
 * @param bookingId - The booking ID to sync
 * @returns Object with success status, unitId, unitName, and smoobuReservationId
 */
export async function syncBookingToSmoobu(
  bookingId: number,
): Promise<{
  success: boolean;
  unitId?: number;
  unitName?: string;
  smoobuReservationId?: number;
  error?: string;
}> {
  try {
    // 1. Get the booking
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: {
        collection: true,
        assignedUnits: {
          with: { unit: true },
        },
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // If already has assigned units with Smoobu reservations, return existing data (idempotent)
    if (booking.assignedUnits.length > 0) {
      const firstAssigned = booking.assignedUnits[0]!;
      return {
        success: true,
        unitId: firstAssigned.unitId,
        unitName: booking.assignedUnits.map((bu) => bu.unit.name).join(", "),
        smoobuReservationId: firstAssigned.smoobuReservationId ?? undefined,
      };
    }

    // 2. Find available units (multi-unit support)
    const unitsNeeded = booking.unitsRequired ?? 1;
    const availableUnits = await findAvailableUnitsForBooking(
      booking.collectionId,
      booking.checkIn,
      booking.checkOut,
      unitsNeeded,
    );

    if (!availableUnits || availableUnits.length === 0) {
      console.warn(`No available Smoobu-linked units for booking ${bookingId}`);
      return {
        success: true,
        error: "No available units with Smoobu linked - booking saved locally only",
      };
    }

    // 3. Create Smoobu reservations for each unit
    const nameParts = booking.guestName.split(" ");
    const firstName = nameParts[0] ?? booking.guestName;
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const totalPrice = parseFloat(booking.totalPrice);
    const pricePerUnit = Math.round((totalPrice / unitsNeeded) * 100) / 100;
    const guestsPerUnit = Math.ceil(booking.numberOfGuests / unitsNeeded);

    let primarySmoobuReservationId: number | null = null;

    for (let i = 0; i < availableUnits.length; i++) {
      const unit = availableUnits[i]!;
      let smoobuResId: number | null = null;

      if (unit.smoobuApartmentId) {
        try {
          const smoobuReservation = await smoobuClient.createReservation({
            apartmentId: unit.smoobuApartmentId,
            arrival: booking.checkIn,
            departure: booking.checkOut,
            firstName,
            lastName,
            email: booking.guestEmail,
            phone: booking.guestPhone ?? undefined,
            adults: guestsPerUnit,
            children: 0,
            notice: booking.guestNotes ?? undefined,
            price: pricePerUnit,
            priceStatus: 1,
          });
          smoobuResId = smoobuReservation.id;
          if (i === 0) primarySmoobuReservationId = smoobuResId;
        } catch (smoobuError) {
          console.error(`Failed to create Smoobu reservation for unit ${unit.name}:`, smoobuError);
        }
      }

      await db.insert(bookingUnits).values({
        bookingId: booking.id,
        unitId: unit.id,
        smoobuReservationId: smoobuResId,
      });
    }

    const primaryUnit = availableUnits[0]!;
    const unitNames = availableUnits.map((u) => u.name).join(", ");

    // 4. Update local booking status
    await db
      .update(bookings)
      .set({
        status: "CONFIRMED",
        confirmedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    // 5. Handle affiliate commission if booking has affiliate link
    if (booking.affiliateLinkId) {
      try {
        await createBookingAffiliateCommission(booking);
      } catch (commissionError) {
        console.error("Failed to create affiliate commission:", commissionError);
      }
    }

    // 6. Send confirmation email
    try {
      await sendBookingConfirmationEmail({
        bookingId: booking.id,
        guestEmail: booking.guestEmail,
        guestName: booking.guestName,
        unitName: unitNames,
        collectionName: booking.collection?.name ?? "Property",
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalPrice: booking.totalPrice,
        numberOfGuests: booking.numberOfGuests,
      });
    } catch (emailError) {
      console.error("Failed to send booking confirmation email:", emailError);
    }

    return {
      success: true,
      unitId: primaryUnit.id,
      unitName: unitNames,
      smoobuReservationId: primarySmoobuReservationId ?? undefined,
    };
  } catch (error) {
    console.error("Smoobu sync error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create affiliate commission for a booking
 * Called after booking is confirmed and has an affiliateLinkId
 *
 * Commission is calculated based on:
 * - The booking's total price BEFORE the affiliate discount was applied
 * - The affiliate link's commission rate
 *
 * @param booking - The booking object with affiliateLinkId, totalPrice, affiliateDiscount, collectionId
 */
async function createBookingAffiliateCommission(booking: {
  id: number;
  affiliateLinkId: number | null;
  totalPrice: string;
  affiliateDiscount: string | null;
  collectionId: number;
}): Promise<void> {
  if (!booking.affiliateLinkId) {
    return;
  }

  // Get the affiliate link with commission rate
  const affiliateLink = await db.query.affiliateLinks.findFirst({
    where: eq(affiliateLinks.id, booking.affiliateLinkId),
  });

  if (!affiliateLink) {
    console.warn(`Affiliate link ${booking.affiliateLinkId} not found for booking ${booking.id}`);
    return;
  }

  // Calculate commission base price (totalPrice + affiliateDiscount to get original price)
  // The booking totalPrice already has the 5% referral discount applied, so we add it back
  const affiliateDiscountAmount = booking.affiliateDiscount ? parseFloat(booking.affiliateDiscount) : 0;
  const commissionBasePrice = parseFloat(booking.totalPrice) + affiliateDiscountAmount;

  // Calculate commission amount — use booking-specific rate if set, otherwise fall back to ownership rate
  const effectiveRate = affiliateLink.bookingCommissionRate ?? affiliateLink.commissionRate;
  const commissionRate = parseFloat(effectiveRate);
  const commissionAmount = (commissionBasePrice * commissionRate) / 100;

  // Create affiliate transaction for the booking
  await db.insert(affiliateTransactions).values({
    affiliateLinkId: booking.affiliateLinkId,
    bookingId: booking.id,
    commissionAmount: commissionAmount.toFixed(2),
    commissionRate: effectiveRate,
    isPaid: false,
  });

  // Update affiliate's total earned
  await db
    .update(affiliateProfiles)
    .set({
      totalEarned: sql`${affiliateProfiles.totalEarned} + ${commissionAmount}`,
    })
    .where(eq(affiliateProfiles.userId, affiliateLink.affiliateUserId));

  // Update affiliate link conversion count
  await db
    .update(affiliateLinks)
    .set({
      conversionCount: sql`${affiliateLinks.conversionCount} + 1`,
    })
    .where(eq(affiliateLinks.id, booking.affiliateLinkId));

  // Send commission earned email to affiliate
  const affiliateUser = await db.query.users.findFirst({
    where: eq(users.id, affiliateLink.affiliateUserId),
  });

  // Get collection name for the email
  const collection = await db.query.propertyCollections.findFirst({
    where: eq(propertyCollections.id, booking.collectionId),
  });

  if (affiliateUser?.email) {
    try {
      await emailService.sendCommissionEarned({
        to: affiliateUser.email,
        userName: affiliateUser.name ?? affiliateUser.email.split("@")[0] ?? "Affiliate",
        commissionAmount: commissionAmount.toFixed(2),
        unitName: `${collection?.name ?? "Resort"} Booking`,
        percentage: "booking",
      });
      console.log(`✅ Commission earned email sent to ${affiliateUser.email} for booking ${booking.id}`);
    } catch (emailError) {
      console.error("Failed to send commission earned email:", emailError);
      // Don't fail the commission creation for email errors
    }
  }

  console.log(`✅ Affiliate commission created: $${commissionAmount.toFixed(2)} for booking ${booking.id}`);
}
