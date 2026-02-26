import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { TrendingUp, Users, DollarSign, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Only allow ADMIN role
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [stats, recentTransactions, pendingCommissions] = await Promise.all([
    api.admin.getDashboardStats(),
    api.admin.getRecentTransactions({ limit: 10 }),
    api.admin.getPendingCommissions(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Dashboard Overview
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Monitor your platform&apos;s performance and activity
        </p>
      </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Revenue */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-green-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-400/10 blur-2xl transition-all group-hover:bg-green-400/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-cyan-100/60">
                Total Revenue
              </CardDescription>
              <div className="rounded-full bg-green-400/10 p-2">
                <DollarSign className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="mt-1 text-xs text-cyan-100/60">
                {stats.totalSales} total sales
              </p>
            </CardContent>
          </Card>

          {/* Pending Commissions */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-orange-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-400/10 blur-2xl transition-all group-hover:bg-orange-400/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-cyan-100/60">
                Pending Commissions
              </CardDescription>
              <div className="rounded-full bg-orange-400/10 p-2">
                <TrendingUp className="h-4 w-4 text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(stats.pendingCommissions)}
              </div>
              <p className="mt-1 text-xs text-cyan-100/60">
                {stats.pendingCommissionsCount} unpaid
              </p>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl transition-all group-hover:bg-blue-400/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-cyan-100/60">
                Active Users
              </CardDescription>
              <div className="rounded-full bg-blue-400/10 p-2">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">
                {stats.activeAffiliates + stats.totalInvestors}
              </div>
              <p className="mt-1 text-xs text-cyan-100/60">
                {stats.activeAffiliates} affiliates, {stats.totalInvestors}{" "}
                owners
              </p>
            </CardContent>
          </Card>

          {/* Total Units */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-purple-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-400/10 blur-2xl transition-all group-hover:bg-purple-400/20" />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-cyan-100/60">
                Total Units
              </CardDescription>
              <div className="rounded-full bg-purple-400/10 p-2">
                <Building2 className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">
                {stats.totalUnits ?? 0}
              </div>
              <p className="mt-1 text-xs text-cyan-100/60">
                {stats.availableUnits ?? 0} available
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Recent Transactions</CardTitle>
            <CardDescription className="text-cyan-100/60">
              Latest ownership purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="py-8 text-center text-cyan-100/60">
                No transactions yet
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                      <TableHead className="text-cyan-100">Date</TableHead>
                      <TableHead className="text-cyan-100">Owner</TableHead>
                      <TableHead className="text-cyan-100">Property</TableHead>
                      <TableHead className="text-cyan-100">Ownership</TableHead>
                      <TableHead className="text-cyan-100">Amount</TableHead>
                      <TableHead className="text-cyan-100">Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((transaction) => (
                      <TableRow
                        key={transaction.id}
                        className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                      >
                        <TableCell className="text-cyan-100/70">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-white">
                          {transaction.user?.name ?? transaction.user?.email ?? "Unknown"}
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          {transaction.unit?.name ?? "Pending"}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-400/20 text-blue-300">
                            {(transaction.percentageOwned / 100).toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-400">
                          {formatCurrency(transaction.purchasePrice)}
                        </TableCell>
                        <TableCell>
                          <Badge className="border-purple-400/30 bg-purple-400/20 text-purple-300">
                            {transaction.paymentMethod}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Commissions */}
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Pending Commissions</CardTitle>
            <CardDescription className="text-cyan-100/60">
              Commissions awaiting payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingCommissions.length === 0 ? (
              <p className="py-8 text-center text-cyan-100/60">
                No pending commissions
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                      <TableHead className="text-cyan-100">Date</TableHead>
                      <TableHead className="text-cyan-100">Affiliate</TableHead>
                      <TableHead className="text-cyan-100">Property</TableHead>
                      <TableHead className="text-cyan-100">Amount</TableHead>
                      <TableHead className="text-cyan-100">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCommissions.slice(0, 10).map((commission) => (
                      <TableRow
                        key={commission.id}
                        className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                      >
                        <TableCell className="text-cyan-100/70">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-white">
                          {commission.affiliateLink.affiliate.name ??
                            commission.affiliateLink.affiliate.email}
                        </TableCell>
                        <TableCell className="text-white">
                          {commission.ownership?.unit?.name ?? "Unknown"}
                        </TableCell>
                        <TableCell className="font-semibold text-green-400">
                          {formatCurrency(commission.commissionAmount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
                          >
                            Mark Paid
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
