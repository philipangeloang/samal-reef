import { redirect } from "next/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { investorProfiles } from "@/server/db/schema";
import {
  DollarSign,
  Home,
  PieChart,
  ShoppingCart,
} from "lucide-react";
import { ManualPaymentSubmissions } from "./_components/manual-payment-submissions";
import { OwnershipsTable } from "./_components/ownerships-table";
import { QuarterlyEarnings } from "./_components/quarterly-earnings";
import { formatCurrency } from "@/lib/currency";

export default async function InvestorDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Profile-based protection: Check if user has investor profile
  const investorProfile = await db.query.investorProfiles.findFirst({
    where: eq(investorProfiles.userId, session.user.id),
  });

  if (!investorProfile && session.user.role !== "ADMIN") {
    redirect("/dashboard"); // Redirect to smart router
  }

  const [summary, ownerships, manualPaymentSubmissions] = await Promise.all([
    api.purchase.getMySummary(),
    api.purchase.getMyOwnerships(),
    api.manualPayment.getMySubmissions(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Investor Dashboard
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Welcome back, {session.user.name ?? session.user.email}
        </p>
      </div>

        {/* Summary Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Invested */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl transition-all group-hover:bg-cyan-400/20" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-cyan-100/60">
                  Total Invested
                </CardDescription>
                <div className="rounded-full bg-cyan-400/10 p-2">
                  <DollarSign className="h-5 w-5 text-cyan-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                {formatCurrency(summary.totalInvested)}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Properties Owned */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-green-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-400/10 blur-2xl transition-all group-hover:bg-green-400/20" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-cyan-100/60">
                  Properties Owned
                </CardDescription>
                <div className="rounded-full bg-green-400/10 p-2">
                  <Home className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                {summary.totalUnitsOwned}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Total Ownership */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-purple-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-400/10 blur-2xl transition-all group-hover:bg-purple-400/20" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-cyan-100/60">
                  Total Ownership
                </CardDescription>
                <div className="rounded-full bg-purple-400/10 p-2">
                  <PieChart className="h-5 w-5 text-purple-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                {summary.totalPercentageOwned}%
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Total Purchases */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl transition-all group-hover:bg-blue-400/20" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-cyan-100/60">
                  Total Purchases
                </CardDescription>
                <div className="rounded-full bg-blue-400/10 p-2">
                  <ShoppingCart className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                {summary.purchaseCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Ownerships Table with Co-Owners */}
        <OwnershipsTable initialOwnerships={ownerships} />

        {/* TODO: Re-enable when revenue/payout features are ready for production */}
        {/* <QuarterlyEarnings /> */}

        {/* Manual Payment Submissions */}
        <ManualPaymentSubmissions initialSubmissions={manualPaymentSubmissions} />
    </div>
  );
}
