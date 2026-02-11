import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

/**
 * Approvals page - now redirects to Bookings
 *
 * Pending approvals are now handled directly in:
 * - Bookings tab: for booking approvals (with "Needs Approval" badge)
 * - Transactions tab: for ownership approvals (with "Pending" status)
 */
export default async function ApprovalsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Redirect to bookings - approvals are now inline
  redirect("/dashboard/admin/bookings");
}
