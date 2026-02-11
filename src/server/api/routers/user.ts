import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { affiliateLinks, affiliateProfiles, bookings, investorProfiles, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const userRouter = createTRPCRouter({
  /**
   * Get current user's profiles
   * Returns which profiles (affiliate, investor) the user has
   * Used for multi-role dashboard navigation
   */
  getMyProfiles: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [affiliateProfile, investorProfile, firstBooking] = await Promise.all([
      ctx.db.query.affiliateProfiles.findFirst({
        where: eq(affiliateProfiles.userId, userId),
      }),
      ctx.db.query.investorProfiles.findFirst({
        where: eq(investorProfiles.userId, userId),
      }),
      ctx.db.query.bookings.findFirst({
        where: eq(bookings.userId, userId),
        columns: { id: true },
      }),
    ]);

    return {
      hasAffiliateProfile: !!affiliateProfile,
      hasInvestorProfile: !!investorProfile,
      hasBookings: !!firstBooking,
      isAdmin: ctx.session.user.role === "ADMIN",
      isStaff: ctx.session.user.role === "STAFF",
    };
  }),

  /**
   * Update current user's name
   * Allows users to set their display name
   */
  updateName: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(255, "Name is too long"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({ name: input.name })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  /**
   * Get current user's affiliate code
   * Returns the affiliate link code if the user is an affiliate
   * Used for staff entry forms to auto-fill affiliate code
   */
  getMyAffiliateCode: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.affiliateUserId, userId),
      columns: { code: true },
    });

    return {
      affiliateCode: affiliateLink?.code ?? null,
      isAffiliate: !!affiliateLink,
    };
  }),
});
