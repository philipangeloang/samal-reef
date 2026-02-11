import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { affiliateProfiles, bookings, investorProfiles } from "@/server/db/schema";
import { DashboardLoadingUI } from "./_components/dashboard-loading-ui";

/**
 * Smart Dashboard Router
 *
 * Redirects to appropriate dashboard based on user role and profiles:
 * 1. Admin dashboard (if user is admin)
 * 2. Staff dashboard (if user is staff)
 * 3. Affiliate dashboard (priority if profile exists)
 * 4. Investor dashboard (if no affiliate profile)
 * 5. Collections page (if no profiles)
 *
 * Attribution Model: Profile-based (not role-based) for non-admins/staff
 * - Checks actual profile existence in database
 * - Supports multi-role users (affiliate who bought property)
 */
export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Priority 1: Admin users go to admin dashboard
  if (session.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  // Priority 2: Staff users go to staff dashboard
  if (session.user.role === "STAFF") {
    redirect("/dashboard/staff");
  }

  // Check which profiles exist
  const [affiliateProfile, investorProfile, firstBooking] = await Promise.all([
    db.query.affiliateProfiles.findFirst({
      where: eq(affiliateProfiles.userId, session.user.id),
    }),
    db.query.investorProfiles.findFirst({
      where: eq(investorProfiles.userId, session.user.id),
    }),
    db.query.bookings.findFirst({
      where: eq(bookings.userId, session.user.id),
      columns: { id: true },
    }),
  ]);

  // Priority 2: Affiliate > Investor > Bookings > Collections
  if (affiliateProfile) {
    redirect("/dashboard/affiliate");
  }

  if (investorProfile) {
    redirect("/dashboard/investor");
  }

  if (firstBooking) {
    redirect("/dashboard/bookings");
  }

  // No profiles and no bookings - send to browse properties
  redirect("/collections");
}

// Loading UI shown during redirect
export function Loading() {
  return <DashboardLoadingUI />;
}
