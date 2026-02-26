import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  users,
  affiliateTransactions,
  ownerships,
  payments,
  affiliateProfiles,
  units,
  investorProfiles,
  affiliateLinks,
  pricingTiers,
} from "@/server/db/schema";
import { eq, sql, desc, and, or, like, gte, lte } from "drizzle-orm";
import { emailService } from "@/server/email";
import { formatCurrency, currencyCode } from "@/lib/currency";

export const adminRouter = createTRPCRouter({
  /**
   * Get dashboard statistics
   * Overall platform metrics for admin dashboard
   * Optimized: runs all queries in parallel for faster performance
   */
  getDashboardStats: adminProcedure.query(async ({ ctx }) => {
    // Run all queries in parallel for better performance
    const [
      salesResult,
      affiliatesResult,
      commissionsResult,
      investorsResult,
      unitsResult,
    ] = await Promise.all([
      // Total sales revenue
      ctx.db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${ownerships.purchasePrice} AS NUMERIC)), 0)`,
          totalSales: sql<number>`COUNT(*)`,
        })
        .from(ownerships),

      // Active affiliates count
      ctx.db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(affiliateProfiles)
        .where(eq(affiliateProfiles.status, "ACTIVE")),

      // Pending commissions (unpaid)
      ctx.db
        .select({
          totalPending: sql<number>`COALESCE(SUM(CAST(${affiliateTransactions.commissionAmount} AS NUMERIC)), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(affiliateTransactions)
        .where(eq(affiliateTransactions.isPaid, false)),

      // Total investors
      ctx.db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(users)
        .where(eq(users.role, "INVESTOR")),

      // Units stats (total and available)
      ctx.db
        .select({
          total: sql<number>`COUNT(*)`,
          available: sql<number>`COUNT(*) FILTER (WHERE ${units.status} = 'AVAILABLE')`,
        })
        .from(units),
    ]);

    return {
      totalRevenue: Number(salesResult[0]?.totalRevenue ?? 0).toFixed(2),
      totalSales: Number(salesResult[0]?.totalSales ?? 0),
      activeAffiliates: Number(affiliatesResult[0]?.count ?? 0),
      pendingCommissions: Number(
        commissionsResult[0]?.totalPending ?? 0,
      ).toFixed(2),
      pendingCommissionsCount: Number(commissionsResult[0]?.count ?? 0),
      totalInvestors: Number(investorsResult[0]?.count ?? 0),
      totalUnits: Number(unitsResult[0]?.total ?? 0),
      availableUnits: Number(unitsResult[0]?.available ?? 0),
    };
  }),

  /**
   * Get all pending commissions
   * For commission management dashboard
   */
  getPendingCommissions: adminProcedure.query(async ({ ctx }) => {
    const pendingCommissions =
      await ctx.db.query.affiliateTransactions.findMany({
        where: (transactions, { eq }) => eq(transactions.isPaid, false),
        with: {
          affiliateLink: {
            with: {
              affiliate: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          ownership: {
            with: {
              unit: true,
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [desc(affiliateTransactions.createdAt)],
      });

    return pendingCommissions;
  }),

  /**
   * Mark commission as paid
   * Records payment and updates affiliate totalPaid
   */
  markCommissionPaid: adminProcedure
    .input(
      z.object({
        transactionId: z.number().int().positive(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get transaction
      const transaction = await ctx.db.query.affiliateTransactions.findFirst({
        where: (transactions, { eq }) =>
          eq(transactions.id, input.transactionId),
        with: {
          affiliateLink: true,
        },
      });

      if (!transaction) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found",
        });
      }

      if (transaction.isPaid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Commission already marked as paid",
        });
      }

      // Update transaction
      const [updatedTransaction] = await ctx.db
        .update(affiliateTransactions)
        .set({
          isPaid: true,
          paidAt: new Date(),
          paidBy: ctx.session.user.id,
          notes: input.notes,
        })
        .where(eq(affiliateTransactions.id, input.transactionId))
        .returning();

      // Update affiliate totalPaid
      const commissionAmount = Number(transaction.commissionAmount);
      await ctx.db
        .update(affiliateProfiles)
        .set({
          totalPaid: sql`${affiliateProfiles.totalPaid} + ${commissionAmount}`,
        })
        .where(
          eq(
            affiliateProfiles.userId,
            transaction.affiliateLink.affiliateUserId,
          ),
        );

      return updatedTransaction;
    }),

  /**
   * Mark all unpaid commissions as paid in bulk
   */
  markAllCommissionsPaid: adminProcedure
    .input(
      z.object({
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get all unpaid transactions
      const unpaidTransactions =
        await ctx.db.query.affiliateTransactions.findMany({
          where: (transactions, { eq }) => eq(transactions.isPaid, false),
          with: {
            affiliateLink: true,
          },
        });

      if (unpaidTransactions.length === 0) {
        return { count: 0, message: "No unpaid commissions to process" };
      }

      // Update all unpaid transactions
      await ctx.db
        .update(affiliateTransactions)
        .set({
          isPaid: true,
          paidAt: new Date(),
          paidBy: ctx.session.user.id,
          notes: input.notes,
        })
        .where(eq(affiliateTransactions.isPaid, false));

      // Update affiliate totalPaid for each affected affiliate
      const affiliateAmounts = new Map<string, number>();

      for (const transaction of unpaidTransactions) {
        const affiliateUserId = transaction.affiliateLink.affiliateUserId;
        const currentAmount = affiliateAmounts.get(affiliateUserId) ?? 0;
        affiliateAmounts.set(
          affiliateUserId,
          currentAmount + Number(transaction.commissionAmount),
        );
      }

      // Batch update all affiliate profiles
      for (const [affiliateUserId, totalAmount] of affiliateAmounts) {
        await ctx.db
          .update(affiliateProfiles)
          .set({
            totalPaid: sql`${affiliateProfiles.totalPaid} + ${totalAmount}`,
          })
          .where(eq(affiliateProfiles.userId, affiliateUserId));
      }

      return {
        count: unpaidTransactions.length,
        message: `Successfully marked ${unpaidTransactions.length} ${unpaidTransactions.length === 1 ? "commission" : "commissions"} as paid`,
      };
    }),

  /**
   * Get all users with filters
   * For user management dashboard
   */
  getAllUsers: adminProcedure
    .input(
      z
        .object({
          role: z
            .enum(["ADMIN", "STAFF", "AFFILIATE", "INVESTOR", "VISITOR"])
            .optional(),
          status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const allUsers = await ctx.db.query.users.findMany({
        where: (users, { eq, and }) => {
          const conditions = [];
          if (input?.role) {
            conditions.push(eq(users.role, input.role));
          }
          if (input?.status) {
            conditions.push(eq(users.status, input.status));
          }
          return conditions.length > 0 ? and(...conditions) : undefined;
        },
        orderBy: (users, { desc }) => [desc(users.createdAt)],
      });

      return allUsers;
    }),

  /**
   * Update user role
   * Changes user role (e.g., promote VISITOR to INVESTOR)
   */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.enum(["ADMIN", "STAFF", "AFFILIATE", "INVESTOR", "VISITOR"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  /**
   * Suspend user
   * Sets user status to SUSPENDED
   */
  suspendUser: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [suspendedUser] = await ctx.db
        .update(users)
        .set({ status: "SUSPENDED" })
        .where(eq(users.id, input.userId))
        .returning();

      if (!suspendedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // TODO: Send suspension notification email
      // await emailService.sendSuspensionNotice({ ... });

      return suspendedUser;
    }),

  /**
   * Reactivate user
   * Sets user status back to ACTIVE
   */
  reactivateUser: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [reactivatedUser] = await ctx.db
        .update(users)
        .set({ status: "ACTIVE" })
        .where(eq(users.id, input.userId))
        .returning();

      if (!reactivatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return reactivatedUser;
    }),

  /**
   * Get recent transactions
   * For admin overview dashboard
   */
  getRecentTransactions: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Only fetch approved ownerships with valid user and unit
      const recentOwnerships = await ctx.db.query.ownerships.findMany({
        limit: input.limit,
        where: (ownerships, { and, isNotNull, or, eq, isNull }) =>
          and(
            isNotNull(ownerships.userId),
            isNotNull(ownerships.unitId),
            // Either not a staff entry (no approvalStatus) or approved
            or(
              isNull(ownerships.approvalStatus),
              eq(ownerships.approvalStatus, "APPROVED"),
            ),
          ),
        with: {
          unit: true,
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          pricingTier: true,
        },
        orderBy: [desc(ownerships.createdAt)],
      });

      return recentOwnerships;
    }),

  /**
   * Get all transactions with pagination and filters
   * For transactions management page
   */
  getAllTransactions: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        collectionId: z.number().int().positive().optional(),
        year: z.number().int().optional(),
        month: z.number().int().min(1).max(12).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      // Build where conditions
      const conditions = [];

      // Search by user name or email
      if (input.search) {
        const searchPattern = `%${input.search}%`;
        conditions.push(
          or(
            sql`${users.name} ILIKE ${searchPattern}`,
            sql`${users.email} ILIKE ${searchPattern}`,
          ),
        );
      }

      // Filter by collection
      if (input.collectionId) {
        conditions.push(eq(units.collectionId, input.collectionId));
      }

      // Filter by date (year/month)
      if (input.year && input.month) {
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
        conditions.push(gte(ownerships.createdAt, startDate));
        conditions.push(lte(ownerships.createdAt, endDate));
      } else if (input.year) {
        const startDate = new Date(input.year, 0, 1);
        const endDate = new Date(input.year, 11, 31, 23, 59, 59);
        conditions.push(gte(ownerships.createdAt, startDate));
        conditions.push(lte(ownerships.createdAt, endDate));
      }

      // Get transactions with filters - use leftJoin to include pending ownerships
      const transactions = await ctx.db
        .select({
          id: ownerships.id,
          userId: ownerships.userId,
          unitId: ownerships.unitId,
          percentageOwned: ownerships.percentageOwned,
          purchasePrice: ownerships.purchasePrice,
          paymentMethod: ownerships.paymentMethod,
          createdAt: ownerships.createdAt,
          isSigned: ownerships.isSigned,
          approvalStatus: ownerships.approvalStatus,
          pendingInvestorEmail: ownerships.pendingInvestorEmail,
          pendingInvestorName: ownerships.pendingInvestorName,
          pricingTierId: ownerships.pricingTierId,
          userName: users.name,
          userEmail: users.email,
          unitName: units.name,
        })
        .from(ownerships)
        .leftJoin(users, eq(ownerships.userId, users.id))
        .leftJoin(units, eq(ownerships.unitId, units.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ownerships.createdAt))
        .limit(input.limit)
        .offset(offset);

      // Get total count for pagination
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(ownerships)
        .leftJoin(users, eq(ownerships.userId, users.id))
        .leftJoin(units, eq(ownerships.unitId, units.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = Number(countResult?.count ?? 0);
      const totalPages = Math.ceil(total / input.limit);

      return {
        transactions,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages,
        },
      };
    }),

  /**
   * Create ownership directly (admin only)
   * Single-step creation - creates user if needed, links ownership, handles affiliate commission
   * Same result as staff createOwnership + approveOwnership, but direct
   */
  adminCreateOwnership: adminProcedure
    .input(
      z.object({
        // Investor info
        investorEmail: z.string().email(),
        investorName: z.string().min(1).optional(),
        // Purchase details
        collectionId: z.number().int().positive(),
        pricingTierId: z.number().int().positive(),
        unitId: z.number().int().positive(),
        purchasePrice: z.string().regex(/^\d+\.?\d*$/),
        currency: z.string().default(currencyCode),
        paymentMethod: z.enum(["FIAT", "CRYPTO", "MANUAL"]),
        // Optional
        affiliateCode: z.string().optional(),
        internalNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const adminUserId = ctx.session.user.id;

      // 1. Verify pricing tier exists and matches collection
      const tier = await ctx.db.query.pricingTiers.findFirst({
        where: eq(pricingTiers.id, input.pricingTierId),
        with: {
          collection: true,
        },
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

      // 2. Verify unit exists and belongs to collection
      const unit = await ctx.db.query.units.findFirst({
        where: eq(units.id, input.unitId),
      });

      if (!unit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit not found",
        });
      }

      if (unit.collectionId !== input.collectionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unit does not belong to selected collection",
        });
      }

      // 3. Find or create investor user
      let investor = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.investorEmail.toLowerCase()),
      });

      if (!investor) {
        // Create new user with INVESTOR role
        const [newUser] = await ctx.db
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            email: input.investorEmail.toLowerCase(),
            name: input.investorName ?? null,
            role: "INVESTOR",
            emailVerified: new Date(), // Pre-verify for admin-created entry
          })
          .returning();
        investor = newUser!;
      } else if (investor.role === "VISITOR") {
        // Upgrade VISITOR to INVESTOR
        const [updatedUser] = await ctx.db
          .update(users)
          .set({ role: "INVESTOR" })
          .where(eq(users.id, investor.id))
          .returning();
        investor = updatedUser!;
      }

      // 4. Ensure investor profile exists
      const existingProfile = await ctx.db.query.investorProfiles.findFirst({
        where: eq(investorProfiles.userId, investor.id),
      });

      if (!existingProfile) {
        await ctx.db.insert(investorProfiles).values({
          userId: investor.id,
        });
      }

      // 5. Look up affiliate link if code provided
      let affiliateLinkId: number | null = null;
      if (input.affiliateCode) {
        const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
          where: eq(affiliateLinks.code, input.affiliateCode),
        });
        affiliateLinkId = affiliateLink?.id ?? null;
      }

      // 6. Create ownership directly as APPROVED
      const [ownership] = await ctx.db
        .insert(ownerships)
        .values({
          unitId: input.unitId,
          userId: investor.id,
          pricingTierId: input.pricingTierId,
          percentageOwned: tier.percentage,
          purchasePrice: input.purchasePrice,
          currency: input.currency,
          paymentMethod: input.paymentMethod,
          affiliateLinkId,
          // Directly approved by admin
          approvalStatus: "APPROVED",
          createdByUserId: adminUserId,
          approvedByUserId: adminUserId,
          approvedAt: new Date(),
          // No pending fields needed since we're creating directly
          pendingInvestorEmail: null,
          pendingInvestorName: null,
        })
        .returning();

      // 7. Handle affiliate commission if applicable
      if (affiliateLinkId) {
        const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
          where: eq(affiliateLinks.id, affiliateLinkId),
        });

        if (affiliateLink) {
          // Commission is ALWAYS calculated from fiatPrice
          const commissionAmount =
            (parseFloat(tier.fiatPrice) *
              parseFloat(affiliateLink.commissionRate)) /
            100;

          // Create affiliate transaction
          await ctx.db.insert(affiliateTransactions).values({
            affiliateLinkId,
            ownershipId: ownership!.id,
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
            .where(eq(affiliateLinks.id, affiliateLinkId));

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
                unitName: tier.collection?.name ?? "Unknown Collection",
                percentage: `${(tier.percentage / 100).toFixed(2)}%`,
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

      return {
        ownership,
        investor,
        message: "Ownership created successfully",
      };
    }),

  /**
   * Get all commissions with filters
   * For commissions management page
   */
  getAllCommissions: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        year: z.number().int().optional(),
        month: z.number().int().min(1).max(12).optional(),
        isPaid: z.boolean().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const commissions = await ctx.db.query.affiliateTransactions.findMany({
        where: (transactions, { eq, and }) => {
          const conditions = [];

          // Filter by paid status
          if (input?.isPaid !== undefined) {
            conditions.push(eq(transactions.isPaid, input.isPaid));
          }

          // Filter by date (year/month)
          if (input?.year && input?.month) {
            const startDate = new Date(input.year, input.month - 1, 1);
            const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
            conditions.push(gte(transactions.createdAt, startDate));
            conditions.push(lte(transactions.createdAt, endDate));
          } else if (input?.year) {
            const startDate = new Date(input.year, 0, 1);
            const endDate = new Date(input.year, 11, 31, 23, 59, 59);
            conditions.push(gte(transactions.createdAt, startDate));
            conditions.push(lte(transactions.createdAt, endDate));
          }

          return conditions.length > 0 ? and(...conditions) : undefined;
        },
        with: {
          affiliateLink: {
            with: {
              affiliate: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          ownership: {
            with: {
              unit: true,
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          booking: {
            with: {
              collection: true,
            },
          },
        },
        orderBy: [desc(affiliateTransactions.createdAt)],
      });

      // Client-side filter by affiliate name if search provided
      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        return commissions.filter((commission) => {
          const name = commission.affiliateLink.affiliate.name?.toLowerCase() ?? "";
          const email = commission.affiliateLink.affiliate.email?.toLowerCase() ?? "";
          return name.includes(searchLower) || email.includes(searchLower);
        });
      }

      return commissions;
    }),

  /**
   * Get payment history
   * All payment records from Stripe and Depay
   */
  getPaymentHistory: adminProcedure
    .input(
      z
        .object({
          provider: z.enum(["STRIPE", "DEPAY"]).optional(),
          status: z
            .enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"])
            .optional(),
          limit: z.number().int().min(1).max(100).optional().default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const paymentHistory = await ctx.db.query.payments.findMany({
        where: (payments, { eq, and }) => {
          const conditions = [];
          if (input?.provider) {
            conditions.push(eq(payments.provider, input.provider));
          }
          if (input?.status) {
            conditions.push(eq(payments.status, input.status));
          }
          return conditions.length > 0 ? and(...conditions) : undefined;
        },
        limit: input?.limit ?? 50,
        orderBy: [desc(payments.createdAt)],
      });

      return paymentHistory;
    }),

  /**
   * Get all MOA statuses across all investors
   * For MOA management dashboard with filtering
   */
  getAllMoaStatuses: adminProcedure
    .input(
      z
        .object({
          isSigned: z.boolean().optional(), // Filter by signed status
          userId: z.string().optional(), // Filter by specific investor
          limit: z.number().int().min(1).max(100).optional().default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const moaStatuses = await ctx.db.query.ownerships.findMany({
        where: (ownerships, { eq, and }) => {
          const conditions = [];
          if (input?.isSigned !== undefined) {
            conditions.push(eq(ownerships.isSigned, input.isSigned));
          }
          if (input?.userId) {
            conditions.push(eq(ownerships.userId, input.userId));
          }
          return conditions.length > 0 ? and(...conditions) : undefined;
        },
        with: {
          unit: {
            columns: {
              id: true,
              name: true,
              collectionId: true,
            },
            with: {
              collection: {
                columns: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        limit: input?.limit ?? 50,
        orderBy: [desc(ownerships.createdAt)],
      });

      // Filter out pending ownerships (no user or unit assigned yet)
      return moaStatuses
        .filter((ownership) => ownership.user && ownership.unit)
        .map((ownership) => ({
          ownershipId: ownership.id,
          investor: {
            id: ownership.user!.id,
            name: ownership.user!.name,
            email: ownership.user!.email,
          },
          unit: {
            id: ownership.unit!.id,
            name: ownership.unit!.name,
            collectionId: ownership.unit!.collectionId,
            collection: ownership.unit!.collection,
          },
        percentageOwned: (ownership.percentageOwned / 100).toFixed(2),
        purchasePrice: formatCurrency(ownership.purchasePrice),
        purchaseDate: ownership.createdAt.toISOString(),
        isSigned: ownership.isSigned,
        moaUrl: ownership.moaUrl,
        moaSignedAt: ownership.moaSignedAt?.toISOString(),
        signerName: ownership.signerName,
        certificateUrl: ownership.certificateUrl,
        certificateGeneratedAt: ownership.certificateGeneratedAt?.toISOString(),
      }));
    }),

  /**
   * Download MOA for any ownership (admin access)
   * Allows admin to view any investor's MOA
   */
  downloadMoa: adminProcedure
    .input(
      z.object({
        ownershipId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const ownership = await ctx.db.query.ownerships.findFirst({
        where: eq(ownerships.id, input.ownershipId),
        with: {
          unit: {
            columns: {
              id: true,
              name: true,
            },
          },
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!ownership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ownership not found",
        });
      }

      if (!ownership.isSigned || !ownership.moaUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MOA has not been signed yet",
        });
      }

      if (!ownership.user || !ownership.unit) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ownership is pending approval",
        });
      }

      return {
        ownershipId: ownership.id,
        moaUrl: ownership.moaUrl,
        investor: {
          name: ownership.user.name,
          email: ownership.user.email,
        },
        unitName: ownership.unit.name,
        signedAt: ownership.moaSignedAt?.toISOString(),
        signerName: ownership.signerName,
      };
    }),

  /**
   * Get all RMA statuses for admin management
   */
  getAllRmaStatuses: adminProcedure
    .input(
      z
        .object({
          isRmaSigned: z.boolean().optional(),
          userId: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional().default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const rmaStatuses = await ctx.db.query.ownerships.findMany({
        where: (ownerships, { eq, and }) => {
          const conditions = [];
          if (input?.isRmaSigned !== undefined) {
            conditions.push(eq(ownerships.isRmaSigned, input.isRmaSigned));
          }
          if (input?.userId) {
            conditions.push(eq(ownerships.userId, input.userId));
          }
          return conditions.length > 0 ? and(...conditions) : undefined;
        },
        with: {
          unit: {
            columns: {
              id: true,
              name: true,
              collectionId: true,
            },
            with: {
              collection: {
                columns: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        limit: input?.limit ?? 50,
        orderBy: [desc(ownerships.createdAt)],
      });

      return rmaStatuses
        .filter((ownership) => ownership.user && ownership.unit)
        .map((ownership) => ({
          ownershipId: ownership.id,
          owner: {
            id: ownership.user!.id,
            name: ownership.user!.name,
            email: ownership.user!.email,
          },
          unit: {
            id: ownership.unit!.id,
            name: ownership.unit!.name,
            collectionId: ownership.unit!.collectionId,
            collection: ownership.unit!.collection,
          },
          percentageOwned: (ownership.percentageOwned / 100).toFixed(2),
          purchasePrice: formatCurrency(ownership.purchasePrice),
          purchaseDate: ownership.createdAt.toISOString(),
          isRmaSigned: ownership.isRmaSigned,
          rmaUrl: ownership.rmaUrl,
          rmaSignedAt: ownership.rmaSignedAt?.toISOString(),
          rmaSignerName: ownership.rmaSignerName,
        }));
    }),

  /**
   * Get detailed user information
   * Shows comprehensive user data including investor and/or affiliate profiles
   * Used for admin user detail page
   */
  getUserDetail: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Fetch user basic info
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check for investor profile
      const investorProfile = await ctx.db.query.investorProfiles.findFirst({
        where: eq(investorProfiles.userId, input.userId),
      });

      // Check for affiliate profile
      const affiliateProfile = await ctx.db.query.affiliateProfiles.findFirst({
        where: eq(affiliateProfiles.userId, input.userId),
      });

      // Fetch investor data if profile exists
      let investorData = null;
      if (investorProfile) {
        // Get all ownerships
        const userOwnerships = await ctx.db.query.ownerships.findMany({
          where: eq(ownerships.userId, input.userId),
          with: {
            unit: {
              columns: {
                id: true,
                name: true,
                status: true,
              },
            },
            pricingTier: {
              columns: {
                id: true,
                percentage: true,
              },
            },
          },
          orderBy: [desc(ownerships.createdAt)],
        });

        // Calculate totals
        const totalInvested = userOwnerships.reduce(
          (sum, ownership) => sum + Number(ownership.purchasePrice),
          0,
        );

        const totalPercentage = userOwnerships.reduce(
          (sum, ownership) => sum + Number(ownership.percentageOwned),
          0,
        );

        // Get unique units
        const uniqueUnitIds = new Set(userOwnerships.map((o) => o.unitId));

        investorData = {
          profile: investorProfile,
          totalInvested: totalInvested.toFixed(2),
          totalPercentage: (totalPercentage / 100).toFixed(2), // Convert from basis points
          totalUnitsOwned: uniqueUnitIds.size,
          ownerships: userOwnerships
            .filter((ownership) => ownership.unit)
            .map((ownership) => ({
              id: ownership.id,
              unitId: ownership.unitId,
              unitName: ownership.unit!.name,
              unitStatus: ownership.unit!.status,
              percentageOwned: (ownership.percentageOwned / 100).toFixed(2),
              purchasePrice: ownership.purchasePrice,
              purchaseDate: ownership.createdAt.toISOString(),
              isSigned: ownership.isSigned,
              moaUrl: ownership.moaUrl,
              moaSignedAt: ownership.moaSignedAt?.toISOString() ?? null,
              signerName: ownership.signerName,
            })),
        };
      }

      // Fetch affiliate data if profile exists
      let affiliateData = null;
      if (affiliateProfile) {
        // Get affiliate link
        const affiliateLink = await ctx.db.query.affiliateLinks.findFirst({
          where: eq(affiliateLinks.affiliateUserId, input.userId),
        });

        // Get all commissions
        const commissions = affiliateLink
          ? await ctx.db.query.affiliateTransactions.findMany({
              where: eq(
                affiliateTransactions.affiliateLinkId,
                affiliateLink.id,
              ),
              with: {
                ownership: {
                  with: {
                    unit: {
                      columns: {
                        id: true,
                        name: true,
                      },
                    },
                    user: {
                      columns: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
              orderBy: [desc(affiliateTransactions.createdAt)],
            })
          : [];

        // Calculate totals
        const totalEarned = Number(affiliateProfile.totalEarned ?? 0);
        const totalPaid = Number(affiliateProfile.totalPaid ?? 0);
        const totalPending = commissions
          .filter((c) => !c.isPaid)
          .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

        affiliateData = {
          profile: affiliateProfile,
          link: affiliateLink
            ? {
                id: affiliateLink.id,
                code: affiliateLink.code,
                commissionRate: affiliateLink.commissionRate,
                status: affiliateLink.status,
                clickCount: affiliateLink.clickCount,
                conversionCount: affiliateLink.conversionCount,
                createdAt: affiliateLink.createdAt.toISOString(),
              }
            : null,
          totalEarned: totalEarned.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
          totalPending: totalPending.toFixed(2),
          totalConversions: affiliateLink?.conversionCount ?? 0,
          commissions: commissions
            .filter((c) => c.ownership?.user && c.ownership?.unit)
            .map((commission) => {
              const user = commission.ownership.user!;
              const unit = commission.ownership.unit!;
              return {
                id: commission.id,
                amount: commission.commissionAmount,
                rate: commission.commissionRate,
                isPaid: commission.isPaid,
                paidAt: commission.paidAt?.toISOString(),
                createdAt: commission.createdAt.toISOString(),
                ownership: {
                  id: commission.ownership.id,
                  unitName: unit.name,
                  purchasePrice: commission.ownership.purchasePrice,
                  investor: {
                    name: user.name,
                    email: user.email,
                  },
                },
              };
            }),
        };
      }

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          image: user.image,
        },
        hasInvestorProfile: !!investorProfile,
        hasAffiliateProfile: !!affiliateProfile,
        investorData,
        affiliateData,
      };
    }),
});
