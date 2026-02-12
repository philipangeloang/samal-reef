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
import { Input } from "@/components/ui/input";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { env } from "@/env";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { affiliateProfiles } from "@/server/db/schema";
import { CopyLinkButton } from "./_components/copy-link-button";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  Link as LinkIcon,
  Calendar
} from "lucide-react";
import { currencySymbol } from "@/lib/currency";

export default async function AffiliateDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Profile-based protection: Check if user has affiliate profile
  const affiliateProfile = await db.query.affiliateProfiles.findFirst({
    where: eq(affiliateProfiles.userId, session.user.id),
  });

  if (!affiliateProfile && session.user.role !== "ADMIN") {
    redirect("/dashboard"); // Redirect to smart router
  }

  const [profile, links, transactions] = await Promise.all([
    api.affiliate.getMyProfile(),
    api.affiliate.getMyLinks(),
    api.affiliate.getMyTransactions(),
  ]);

  // Calculate stats
  const totalEarned = parseFloat(profile.totalEarned);
  const totalPaid = parseFloat(profile.totalPaid);
  const pendingAmount = totalEarned - totalPaid;
  const conversionCount = transactions.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Affiliate Dashboard
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Welcome back, {session.user.name ?? session.user.email}
        </p>
      </div>

        {/* Summary Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Earned */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl transition-all group-hover:bg-cyan-400/20" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-cyan-100/60">
                  Total Earned
                </CardDescription>
                <div className="rounded-full bg-cyan-400/10 p-2">
                  <DollarSign className="h-5 w-5 text-cyan-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                {currencySymbol}{totalEarned.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Paid Out */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-400/10 blur-2xl transition-all group-hover:bg-green-400/20" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-cyan-100/60">
                  Paid Out
                </CardDescription>
                <div className="rounded-full bg-green-400/10 p-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                {currencySymbol}{totalPaid.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Pending */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-400/10 blur-2xl transition-all group-hover:bg-orange-400/20" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-cyan-100/60">
                  Pending
                </CardDescription>
                <div className="rounded-full bg-orange-400/10 p-2">
                  <Clock className="h-5 w-5 text-orange-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                {currencySymbol}{pendingAmount.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Conversions */}
          <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl transition-all group-hover:bg-blue-400/20" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-cyan-100/60">
                  Conversions
                </CardDescription>
                <div className="rounded-full bg-blue-400/10 p-2">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                {conversionCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Affiliate Links */}
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-400/10 p-2">
                <LinkIcon className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-white">My Affiliate Links</CardTitle>
                <CardDescription className="text-cyan-100/60">
                  Share these links to earn commissions on referred sales
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {links.map((link) => {
              const referralUrl = `${env.NEXT_PUBLIC_APP_URL}?ref=${link.code}`;
              return (
                <div
                  key={link.id}
                  className="group rounded-lg border border-cyan-400/20 bg-[#0a1929]/50 p-4 transition-all hover:border-cyan-400/40 hover:bg-[#0a1929]/70"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge className="bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30">
                          {link.code}
                        </Badge>
                        <span className="text-sm text-cyan-100/70">
                          {link.commissionRate}% commission
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={referralUrl}
                          readOnly
                          className="border-cyan-400/30 bg-[#0d1f31]/50 font-mono text-sm text-cyan-50"
                        />
                        <CopyLinkButton url={referralUrl} />
                      </div>
                    </div>
                    <div className="text-right text-sm text-cyan-100/70">
                      <div className="font-medium text-white">
                        {link.clickCount} clicks
                      </div>
                      <div>{link.conversionCount} conversions</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Commission History */}
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-400/10 p-2">
                <Calendar className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-white">Commission History</CardTitle>
                <CardDescription className="text-cyan-100/60">
                  Track all your earned commissions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-cyan-400/20 bg-[#0a1929]/30 py-12">
                <DollarSign className="mb-3 h-12 w-12 text-cyan-400/50" />
                <p className="text-center text-cyan-100/60">
                  No commissions earned yet. Start sharing your affiliate links!
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                      <TableHead className="text-cyan-100">Date</TableHead>
                      <TableHead className="text-cyan-100">Property</TableHead>
                      <TableHead className="text-cyan-100">Type</TableHead>
                      <TableHead className="text-cyan-100">Details</TableHead>
                      <TableHead className="text-cyan-100">Commission</TableHead>
                      <TableHead className="text-cyan-100">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const isBooking = !!transaction.booking;
                      const propertyName = isBooking
                        ? transaction.booking?.collection?.name ?? "Booking"
                        : transaction.ownership?.unit?.name ?? "Unknown";

                      return (
                        <TableRow
                          key={transaction.id}
                          className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                        >
                          <TableCell className="text-cyan-100/70">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium text-white">
                            {propertyName}
                          </TableCell>
                          <TableCell className="text-sm text-cyan-100/70">
                            {isBooking ? "Booking" : "Ownership"}
                          </TableCell>
                          <TableCell>
                            {isBooking ? (
                              <Badge className="bg-purple-400/20 text-purple-300">
                                Booking
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-400/20 text-blue-300">
                                {transaction.ownership?.percentageOwned
                                  ? `${(transaction.ownership.percentageOwned / 100).toFixed(2)}%`
                                  : "N/A"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-green-400">
                            {currencySymbol}{transaction.commissionAmount}
                          </TableCell>
                          <TableCell>
                            {transaction.isPaid ? (
                              <Badge className="bg-green-400/20 text-green-300">
                                Paid
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-400/20 text-orange-300">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
