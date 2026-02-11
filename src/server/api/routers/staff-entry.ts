import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  staffProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import {
  ownerships,
  bookings,
  users,
  investorProfiles,
  pricingTiers,
  affiliateLinks,
  affiliateTransactions,
  affiliateProfiles,
  units,
} from "@/server/db/schema";
import { eq, and, desc, isNotNull, sql } from "drizzle-orm";
import { emailService } from "@/server/email";
import { syncBookingToSmoobu } from "@/server/services/booking-processor";

export const staffEntryRouter = createTRPCRouter({
  /**
   * Create a pending ownership entry
   * Staff creates entry -> Admin approves -> Ownership becomes active
   */
  createOwnership: staffProcedure
    .input(
      z.object({
        // Investor info
        investorEmail: z.string().email(),
        investorName: z.string().min(1).optional(),
        // Purchase details
        collectionId: z.number().int().positive(),
        pricingTierId: z.number().int().positive(),
        purchasePrice: z.string().regex(/^\d+\.?\d*$/), // Amount paid
        currency: z.string().default("PHP"),
        paymentMethod: z.enum(["FIAT", "CRYPTO", "MANUAL"]),
        // Optional
        affiliateCode: z.string().optional(),
        internalNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const staffUserId = ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "ADMIN";

      // 1. Verify pricing tier exists and matches collection
      const tier = await ctx.db.query.pricingTiers.findFirst({
        where: eq(pricingTiers.id, input.pricingTierId),
      });

      if (!tier) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing tier not found",
        });
      }

      if (tier.collectionId !== input.collectionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pricing tier does not belong to selected collection",
        });
      }

      // 2. For staff submissions, DO NOT create user - just store email
      // User creation/upgrade happens on admin approval only
      // This prevents orphan investors with no actual ownership

      // 3. Look up affiliate link if code provided
      let affiliateLinkId: number | null = null;
      if (input.affiliateCode) {
        const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
          where: eq(affiliateLinks.code, input.affiliateCode),
        });
        affiliateLinkId = affiliateLink?.id ?? null;
      }

      // If admin is creating directly, we still need approval flow for user creation
      // Force PENDING_APPROVAL for all staff entries
      const [ownership] = await ctx.db
        .insert(ownerships)
        .values({
          // Unit and user will be allocated/linked on admin approval
          unitId: null,
          userId: null,
          // Store pending investor info
          pendingInvestorEmail: input.investorEmail.toLowerCase(),
          pendingInvestorName: input.investorName ?? null,
          pricingTierId: input.pricingTierId,
          percentageOwned: tier.percentage,
          purchasePrice: input.purchasePrice,
          currency: input.currency,
          paymentMethod: input.paymentMethod,
          // Store affiliate link for commission on approval
          affiliateLinkId,
          // Approval tracking - always requires approval for user safety
          approvalStatus: "PENDING_APPROVAL",
          createdByUserId: staffUserId,
        })
        .returning();

      return {
        ownership,
        approvalStatus: "PENDING_APPROVAL",
        message: "Ownership submitted for admin approval",
      };
    }),

  /**
   * Create a pending booking entry
   * Staff creates entry -> Admin approves -> Booking becomes confirmed
   */
  createBooking: staffProcedure
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
        affiliateCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const staffUserId = ctx.session.user.id;
      const isAdmin = ctx.session.user.role === "ADMIN";

      // 1. Check if guest user exists
      let guestUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.guestEmail.toLowerCase()),
      });

      const subtotal = (parseFloat(input.nightlyRate) * input.totalNights).toFixed(2);

      // 2. Look up affiliate link if code provided (5% discount)
      let affiliateLinkId: number | null = null;
      let affiliateDiscount: string | null = null;
      if (input.affiliateCode) {
        const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
          where: eq(affiliateLinks.code, input.affiliateCode),
        });
        if (affiliateLink && affiliateLink.status === "ACTIVE") {
          affiliateLinkId = affiliateLink.id;
          const totalPrice = parseFloat(input.totalPrice);
          affiliateDiscount = (Math.round(totalPrice * 0.05 * 100) / 100).toFixed(2);
        }
      }

      // 3. Create booking with PENDING_APPROVAL status (or APPROVED if admin)
      const approvalStatus = isAdmin ? "APPROVED" : "PENDING_APPROVAL";
      const bookingStatus = isAdmin ? "CONFIRMED" : "PENDING_PAYMENT";

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
          // Status
          status: bookingStatus,
          source: "OTHER", // Staff entry
          // Notes
          guestNotes: input.guestNotes ?? null,
          internalNotes: input.internalNotes ?? null,
          // Affiliate tracking
          affiliateLinkId,
          affiliateDiscount,
          // Approval tracking
          approvalStatus,
          createdByUserId: staffUserId,
          ...(isAdmin && {
            approvedByUserId: staffUserId,
            approvedAt: new Date(),
            confirmedAt: new Date(),
          }),
        })
        .returning();

      if (!booking) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create booking",
        });
      }

      // If admin created directly, sync to Smoobu immediately
      let smoobuResult: { unitName?: string; smoobuReservationId?: number } = {};
      if (isAdmin) {
        const syncResult = await syncBookingToSmoobu(booking.id);
        smoobuResult = {
          unitName: syncResult.unitName,
          smoobuReservationId: syncResult.smoobuReservationId,
        };
        if (syncResult.error && !syncResult.unitId) {
          console.warn(`⚠️ Staff-entry admin booking ${booking.id} Smoobu sync issue: ${syncResult.error}`);
        }
      }

      return {
        booking,
        approvalStatus,
        unitName: smoobuResult.unitName,
        smoobuSynced: !!smoobuResult.smoobuReservationId,
        message: isAdmin
          ? smoobuResult.smoobuReservationId
            ? "Booking created, confirmed, and synced to Smoobu"
            : "Booking created and confirmed (Smoobu sync pending)"
          : "Booking submitted for admin approval",
      };
    }),

  /**
   * Get my pending submissions (for staff dashboard)
   */
  getMySubmissions: staffProcedure.query(async ({ ctx }) => {
    const staffUserId = ctx.session.user.id;

    // Get ownerships created by this staff member
    const pendingOwnerships = await ctx.db.query.ownerships.findMany({
      where: and(
        eq(ownerships.createdByUserId, staffUserId),
        isNotNull(ownerships.approvalStatus),
      ),
      with: {
        user: true,
        pricingTier: {
          with: {
            collection: true,
          },
        },
      },
      orderBy: [desc(ownerships.createdAt)],
    });

    // Get bookings created by this staff member
    const pendingBookings = await ctx.db.query.bookings.findMany({
      where: and(
        eq(bookings.createdByUserId, staffUserId),
        isNotNull(bookings.approvalStatus),
      ),
      with: {
        collection: true,
      },
      orderBy: [desc(bookings.createdAt)],
    });

    return {
      ownerships: pendingOwnerships,
      bookings: pendingBookings,
    };
  }),

  /**
   * Get all pending entries for admin approval
   */
  getPendingApprovals: adminProcedure.query(async ({ ctx }) => {
    // Get pending ownerships
    const pendingOwnerships = await ctx.db.query.ownerships.findMany({
      where: eq(ownerships.approvalStatus, "PENDING_APPROVAL"),
      with: {
        user: true,
        pricingTier: {
          with: {
            collection: true,
          },
        },
      },
      orderBy: [desc(ownerships.createdAt)],
    });

    // Get pending bookings
    const pendingBookings = await ctx.db.query.bookings.findMany({
      where: eq(bookings.approvalStatus, "PENDING_APPROVAL"),
      with: {
        collection: true,
      },
      orderBy: [desc(bookings.createdAt)],
    });

    // Get staff user names for display
    const staffUserIds = [
      ...new Set([
        ...pendingOwnerships.map((o) => o.createdByUserId).filter(Boolean),
        ...pendingBookings.map((b) => b.createdByUserId).filter(Boolean),
      ]),
    ] as string[];

    const staffUsers =
      staffUserIds.length > 0
        ? await ctx.db.query.users.findMany({
            where: (users, { inArray }) => inArray(users.id, staffUserIds),
            columns: { id: true, name: true, email: true },
          })
        : [];

    const staffMap = new Map(staffUsers.map((u) => [u.id, u]));

    return {
      ownerships: pendingOwnerships.map((o) => ({
        ...o,
        createdBy: o.createdByUserId ? staffMap.get(o.createdByUserId) : null,
      })),
      bookings: pendingBookings.map((b) => ({
        ...b,
        createdBy: b.createdByUserId ? staffMap.get(b.createdByUserId) : null,
      })),
    };
  }),

  /**
   * Approve an ownership entry
   * Admin only - this triggers the full ownership creation flow
   * Creates/upgrades user account and links ownership
   */
  approveOwnership: adminProcedure
    .input(
      z.object({
        ownershipId: z.number().int().positive(),
        unitId: z.number().int().positive().optional(), // Optional - will auto-select if not provided
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const adminUserId = ctx.session.user.id;

      // Get the pending ownership with pricing tier to know the collection
      const ownership = await ctx.db.query.ownerships.findFirst({
        where: and(
          eq(ownerships.id, input.ownershipId),
          eq(ownerships.approvalStatus, "PENDING_APPROVAL"),
        ),
        with: {
          pricingTier: true,
        },
      });

      if (!ownership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending ownership not found",
        });
      }

      if (!ownership.pendingInvestorEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ownership has no pending investor email",
        });
      }

      // If unitId not provided, auto-select a unit from the collection
      let unitId = input.unitId;
      if (!unitId) {
        if (!ownership.pricingTier) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ownership has no pricing tier - cannot auto-select unit",
          });
        }

        // Find first available unit in the collection
        const availableUnit = await ctx.db.query.units.findFirst({
          where: eq(units.collectionId, ownership.pricingTier.collectionId),
          orderBy: (units, { asc }) => [asc(units.name)],
        });

        if (!availableUnit) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No available units in collection",
          });
        }

        unitId = availableUnit.id;
      }

      // 1. Find or create investor user (NOW on approval, not on submission)
      let investor = await ctx.db.query.users.findFirst({
        where: eq(users.email, ownership.pendingInvestorEmail),
      });

      if (!investor) {
        // Create new user with INVESTOR role
        const [newUser] = await ctx.db
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            email: ownership.pendingInvestorEmail,
            name: ownership.pendingInvestorName ?? null,
            role: "INVESTOR",
            emailVerified: new Date(), // Pre-verify for admin-approved entry
          })
          .returning();
        investor = newUser!;
      } else if (investor.role === "VISITOR") {
        // Upgrade VISITOR to INVESTOR on approval
        const [updatedUser] = await ctx.db
          .update(users)
          .set({ role: "INVESTOR" })
          .where(eq(users.id, investor.id))
          .returning();
        investor = updatedUser!;
      }

      // 2. Ensure investor profile exists
      const existingProfile = await ctx.db.query.investorProfiles.findFirst({
        where: eq(investorProfiles.userId, investor.id),
      });

      if (!existingProfile) {
        await ctx.db.insert(investorProfiles).values({
          userId: investor.id,
        });
      }

      // 3. Update ownership with approval and link to user
      const [updated] = await ctx.db
        .update(ownerships)
        .set({
          unitId, // Use local variable (auto-selected or from input)
          userId: investor.id,
          approvalStatus: "APPROVED",
          approvedByUserId: adminUserId,
          approvedAt: new Date(),
          // Clear pending fields now that user is linked
          pendingInvestorEmail: null,
          pendingInvestorName: null,
        })
        .where(eq(ownerships.id, input.ownershipId))
        .returning();

      // 4. Handle affiliate commission if applicable
      if (ownership.affiliateLinkId) {
        const pricingTier = await ctx.db.query.pricingTiers.findFirst({
          where: eq(pricingTiers.id, ownership.pricingTierId),
          with: {
            collection: true,
          },
        });

        if (pricingTier) {
          const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
            where: eq(affiliateLinks.id, ownership.affiliateLinkId),
          });

          if (affiliateLink) {
            // Commission is ALWAYS calculated from fiatPrice
            const commissionAmount =
              (parseFloat(pricingTier.fiatPrice) *
                parseFloat(affiliateLink.commissionRate)) /
              100;

            // Create affiliate transaction
            await ctx.db.insert(affiliateTransactions).values({
              affiliateLinkId: ownership.affiliateLinkId,
              ownershipId: ownership.id,
              commissionAmount: commissionAmount.toFixed(2),
              commissionRate: affiliateLink.commissionRate,
              isPaid: false,
            });

            // Update affiliate total earned
            await ctx.db
              .update(affiliateProfiles)
              .set({
                totalEarned: sql`${affiliateProfiles.totalEarned} + ${commissionAmount}`,
              })
              .where(eq(affiliateProfiles.userId, affiliateLink.affiliateUserId));

            // Update affiliate link conversion count
            await ctx.db
              .update(affiliateLinks)
              .set({
                conversionCount: sql`${affiliateLinks.conversionCount} + 1`,
              })
              .where(eq(affiliateLinks.id, ownership.affiliateLinkId));

            // Send commission earned email to affiliate
            const affiliateUser = await ctx.db.query.users.findFirst({
              where: eq(users.id, affiliateLink.affiliateUserId),
            });

            if (affiliateUser?.email) {
              try {
                await emailService.sendCommissionEarned({
                  to: affiliateUser.email,
                  userName:
                    affiliateUser.name ??
                    affiliateUser.email.split("@")[0] ??
                    "Affiliate",
                  commissionAmount: commissionAmount.toFixed(2),
                  unitName: pricingTier.collection?.name ?? "Unknown Collection",
                  percentage: `${(pricingTier.percentage / 100).toFixed(2)}%`,
                });
              } catch (emailError) {
                console.error(
                  "Failed to send commission earned email:",
                  emailError,
                );
              }
            }
          }
        }
      }

      // TODO: Send MOA email to the new investor

      return {
        ownership: updated,
        investor,
        message: "Ownership approved successfully",
      };
    }),

  /**
   * Reject an ownership entry
   */
  rejectOwnership: adminProcedure
    .input(
      z.object({
        ownershipId: z.number().int().positive(),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const adminUserId = ctx.session.user.id;

      const [updated] = await ctx.db
        .update(ownerships)
        .set({
          approvalStatus: "REJECTED",
          approvedByUserId: adminUserId,
          approvedAt: new Date(),
          rejectionReason: input.reason,
        })
        .where(
          and(
            eq(ownerships.id, input.ownershipId),
            eq(ownerships.approvalStatus, "PENDING_APPROVAL"),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending ownership not found",
        });
      }

      return {
        ownership: updated,
        message: "Ownership rejected",
      };
    }),

  /**
   * Approve a booking entry
   */
  approveBooking: adminProcedure
    .input(
      z.object({
        bookingId: z.number().int().positive(),
        unitId: z.number().int().positive().optional(), // Optional unit assignment (overrides auto-assignment)
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const adminUserId = ctx.session.user.id;

      const booking = await ctx.db.query.bookings.findFirst({
        where: and(
          eq(bookings.id, input.bookingId),
          eq(bookings.approvalStatus, "PENDING_APPROVAL"),
        ),
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending booking not found",
        });
      }

      const [updated] = await ctx.db
        .update(bookings)
        .set({
          ...(input.unitId && { unitId: input.unitId }),
          status: "CONFIRMED",
          approvalStatus: "APPROVED",
          approvedByUserId: adminUserId,
          approvedAt: new Date(),
          confirmedAt: new Date(),
        })
        .where(eq(bookings.id, input.bookingId))
        .returning();

      // Sync to Smoobu (assigns unit if not provided, creates reservation)
      const smoobuResult = await syncBookingToSmoobu(input.bookingId);

      if (smoobuResult.error && !smoobuResult.unitId) {
        console.warn(`⚠️ Approved booking ${input.bookingId} Smoobu sync issue: ${smoobuResult.error}`);
      }

      return {
        booking: updated,
        unitName: smoobuResult.unitName,
        smoobuSynced: !!smoobuResult.smoobuReservationId,
        message: smoobuResult.smoobuReservationId
          ? "Booking approved, confirmed, and synced to Smoobu"
          : "Booking approved and confirmed (Smoobu sync pending)",
      };
    }),

  /**
   * Reject a booking entry
   */
  rejectBooking: adminProcedure
    .input(
      z.object({
        bookingId: z.number().int().positive(),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const adminUserId = ctx.session.user.id;

      const [updated] = await ctx.db
        .update(bookings)
        .set({
          status: "CANCELLED",
          approvalStatus: "REJECTED",
          approvedByUserId: adminUserId,
          approvedAt: new Date(),
          cancellationReason: input.reason,
          cancelledAt: new Date(),
          cancelledBy: adminUserId,
        })
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.approvalStatus, "PENDING_APPROVAL"),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending booking not found",
        });
      }

      return {
        booking: updated,
        message: "Booking rejected",
      };
    }),
});
