import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
  affiliateProcedure,
} from "@/server/api/trpc";
import {
  affiliateInvitations,
  affiliateProfiles,
  affiliateLinks,
  users,
} from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { emailService } from "@/server/email";
import { env } from "@/env";

export const affiliateRouter = createTRPCRouter({
  /**
   * Admin: Create affiliate invitation
   * Generates unique token and sends invitation email
   */
  createInvitation: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        commissionRate: z.string().regex(/^\d+\.\d{2}$/), // Format: "1.00" for 1%
        affiliateCode: z.string().min(3).max(20).optional(), // Custom code (optional)
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if email already has an active invitation
      const existingInvitation =
        await ctx.db.query.affiliateInvitations.findFirst({
          where: (invitations, { eq, and, isNull, gt }) =>
            and(
              eq(invitations.email, input.email),
              isNull(invitations.usedAt),
              gt(invitations.expiresAt, new Date()),
            ),
        });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This email already has an active invitation",
        });
      }

      // If custom code provided, validate it doesn't already exist
      if (input.affiliateCode) {
        const finalCode = input.affiliateCode.toUpperCase();
        const existingCode = await ctx.db.query.affiliateLinks.findFirst({
          where: (links, { eq }) => eq(links.code, finalCode),
        });

        if (existingCode) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Code "${finalCode}" is already taken. Please choose another.`,
          });
        }
      }

      // Generate unique token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation
      const [invitation] = await ctx.db
        .insert(affiliateInvitations)
        .values({
          email: input.email,
          token,
          commissionRate: input.commissionRate,
          affiliateCode: input.affiliateCode,
          expiresAt,
          createdBy: ctx.session.user.id,
        })
        .returning();

      // Send invitation email
      const inviteLink = `${env.NEXT_PUBLIC_APP_URL}/affiliate/join/${token}`;
      await emailService.sendAffiliateInvitation({
        to: input.email,
        inviteLink,
        commissionRate: input.commissionRate,
      });

      return invitation;
    }),

  /**
   * Public: Accept affiliate invitation
   * Creates affiliate profile and first affiliate link
   */
  acceptInvitation: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Validate invitation
      const invitation = await ctx.db.query.affiliateInvitations.findFirst({
        where: (invitations, { eq }) => eq(invitations.token, input.token),
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation already used",
        });
      }

      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation expired",
        });
      }

      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in to accept an invitation",
        });
      }

      const userId = ctx.session.user.id;

      // SECURITY: Validate that logged-in user's email matches invited email
      const userEmail = ctx.session.user.email?.toLowerCase();
      const invitedEmail = invitation.email.toLowerCase();

      if (userEmail !== invitedEmail) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `This invitation was sent to ${invitation.email}. Please sign in with that email address to accept this invitation.`,
        });
      }

      // Check if user already has affiliate profile
      const existingProfile = await ctx.db.query.affiliateProfiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.userId, userId),
      });

      if (existingProfile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have an affiliate account",
        });
      }

      // Update user role to AFFILIATE (only if lower priority role)
      // Priority: ADMIN > STAFF > AFFILIATE > INVESTOR > VISITOR
      const currentUser = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId),
        columns: { role: true },
      });

      if (currentUser?.role !== "ADMIN" && currentUser?.role !== "STAFF") {
        await ctx.db
          .update(users)
          .set({ role: "AFFILIATE" })
          .where(eq(users.id, userId));
      }

      // Create affiliate profile
      const [profile] = await ctx.db
        .insert(affiliateProfiles)
        .values({
          userId,
          defaultCommissionRate: invitation.commissionRate,
        })
        .returning();

      // Generate first affiliate link
      // Use custom code from invitation if provided, otherwise generate random
      const code = invitation.affiliateCode
        ? invitation.affiliateCode.toUpperCase()
        : `REEF-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

      const [link] = await ctx.db
        .insert(affiliateLinks)
        .values({
          code,
          affiliateUserId: userId,
          commissionRate: invitation.commissionRate,
          createdBy: userId,
        })
        .returning();

      // Mark invitation as used
      await ctx.db
        .update(affiliateInvitations)
        .set({
          usedAt: new Date(),
          usedBy: userId,
        })
        .where(eq(affiliateInvitations.id, invitation.id));

      // Send welcome email
      await emailService.sendAffiliateWelcome({
        to: ctx.session.user.email!,
        userName: ctx.session.user.name ?? "Affiliate",
        affiliateCode: code,
        commissionRate: invitation.commissionRate,
      });

      return { profile, link };
    }),

  /**
   * Affiliate: Get my profile with stats
   */
  getMyProfile: affiliateProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.affiliateProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.userId, ctx.session.user.id),
      with: {
        user: true,
      },
    });

    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Affiliate profile not found",
      });
    }

    return profile;
  }),

  /**
   * Affiliate: Get my affiliate links
   */
  getMyLinks: affiliateProcedure.query(async ({ ctx }) => {
    const links = await ctx.db.query.affiliateLinks.findMany({
      where: (links, { eq }) => eq(links.affiliateUserId, ctx.session.user.id),
      orderBy: (links, { desc }) => [desc(links.createdAt)],
    });

    return links;
  }),

  /**
   * Admin: Generate affiliate link for an affiliate
   * Only admins can create links - one link per affiliate
   */
  generateLink: adminProcedure
    .input(
      z.object({
        affiliateUserId: z.string(),
        customCode: z.string().min(3).max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get affiliate profile for commission rate
      const profile = await ctx.db.query.affiliateProfiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.userId, input.affiliateUserId),
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Affiliate profile not found",
        });
      }

      // Check if affiliate already has a link (one link per affiliate)
      const existingLink = await ctx.db.query.affiliateLinks.findFirst({
        where: (links, { eq }) =>
          eq(links.affiliateUserId, input.affiliateUserId),
      });

      if (existingLink) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This affiliate already has a link",
        });
      }

      // Generate code
      const code = input.customCode
        ? `REEF-${input.customCode.toUpperCase()}`
        : `REEF-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

      // Check if code already exists
      const existingCode = await ctx.db.query.affiliateLinks.findFirst({
        where: (links, { eq }) => eq(links.code, code),
      });

      if (existingCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This code already exists. Please choose another.",
        });
      }

      // Create link
      const [link] = await ctx.db
        .insert(affiliateLinks)
        .values({
          code,
          affiliateUserId: input.affiliateUserId,
          commissionRate: profile.defaultCommissionRate,
          createdBy: ctx.session.user.id,
        })
        .returning();

      return link;
    }),

  /**
   * Affiliate: Get my transaction history
   */
  getMyTransactions: affiliateProcedure.query(async ({ ctx }) => {
    // Get all my affiliate links
    const myLinks = await ctx.db.query.affiliateLinks.findMany({
      where: (links, { eq }) => eq(links.affiliateUserId, ctx.session.user.id),
    });

    const linkIds = myLinks.map((link) => link.id);

    if (linkIds.length === 0) {
      return [];
    }

    // Get all transactions for my links (both ownership and booking commissions)
    const transactions = await ctx.db.query.affiliateTransactions.findMany({
      where: (transactions, { inArray }) =>
        inArray(transactions.affiliateLinkId, linkIds),
      with: {
        affiliateLink: true,
        ownership: {
          with: {
            unit: true,
            pricingTier: true,
          },
        },
        booking: {
          with: {
            collection: true,
          },
        },
      },
      orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
    });

    return transactions;
  }),

  /**
   * Public: Validate affiliate code
   * Used on frontend to check if code exists before checkout
   */
  validateCode: publicProcedure
    .input(z.object({ code: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const link = await ctx.db.query.affiliateLinks.findFirst({
        where: (links, { eq, and }) =>
          and(eq(links.code, input.code), eq(links.status, "ACTIVE")),
      });

      return {
        isValid: !!link,
        commissionRate: link?.commissionRate,
      };
    }),

  /**
   * Public: Track affiliate link click
   * Increments clickCount when someone visits with ?ref= parameter
   */
  trackClick: publicProcedure
    .input(z.object({ affiliateCode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Find the affiliate link
      const link = await ctx.db.query.affiliateLinks.findFirst({
        where: (links, { eq }) => eq(links.code, input.affiliateCode),
      });

      // Only increment if link exists and is active
      if (link?.status === "ACTIVE") {
        await ctx.db
          .update(affiliateLinks)
          .set({
            clickCount: sql`${affiliateLinks.clickCount} + 1`,
          })
          .where(eq(affiliateLinks.id, link.id));

        return { success: true, clickCount: link.clickCount + 1 };
      }

      return { success: false };
    }),

  /**
   * Admin: Get all affiliates with stats
   */
  getAllAffiliates: adminProcedure.query(async ({ ctx }) => {
    const affiliates = await ctx.db.query.affiliateProfiles.findMany({
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: (profiles, { desc }) => [desc(profiles.totalEarned)],
    });

    // Fetch affiliate links to get link-level commission rates and IDs
    const links = await ctx.db.query.affiliateLinks.findMany({
      columns: {
        id: true,
        affiliateUserId: true,
        commissionRate: true,
      },
    });
    const linkByUser = new Map(links.map((l) => [l.affiliateUserId, l]));

    return affiliates.map((a) => ({
      ...a,
      link: linkByUser.get(a.userId) ?? null,
    }));
  }),

  /**
   * Admin: Update affiliate commission rate
   */
  updateCommissionRate: adminProcedure
    .input(
      z.object({
        affiliateLinkId: z.number().int().positive(),
        newRate: z.string().regex(/^\d+\.\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedLink] = await ctx.db
        .update(affiliateLinks)
        .set({ commissionRate: input.newRate })
        .where(eq(affiliateLinks.id, input.affiliateLinkId))
        .returning();

      if (!updatedLink) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Affiliate link not found",
        });
      }

      // Keep profile default in sync
      await ctx.db
        .update(affiliateProfiles)
        .set({ defaultCommissionRate: input.newRate })
        .where(eq(affiliateProfiles.userId, updatedLink.affiliateUserId));

      return updatedLink;
    }),
});
