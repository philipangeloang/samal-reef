import { redirect } from "next/navigation";
import Link from "next/link";
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
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { investorProfiles } from "@/server/db/schema";
import {
  DollarSign,
  Home,
  PieChart,
  ShoppingCart,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { ManualPaymentSubmissions } from "./_components/manual-payment-submissions";
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

        {/* Ownerships Table */}
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-cyan-400/10 p-2">
                  <Building2 className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-white">My Ownerships</CardTitle>
                  <CardDescription className="text-cyan-100/60">
                    View all your fractional ownership investments
                  </CardDescription>
                </div>
              </div>
              <Button
                asChild
                className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
              >
                <Link href="/collections">Browse More Properties</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {ownerships.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-cyan-400/20 bg-[#0a1929]/30 py-12">
                <Home className="mb-3 h-12 w-12 text-cyan-400/50" />
                <p className="mb-4 text-center text-cyan-100/60">
                  You haven&apos;t made any investments yet.
                </p>
                <Button
                  asChild
                  className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
                >
                  <Link href="/collections">Start Investing</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                      <TableHead className="text-cyan-100">Property</TableHead>
                      <TableHead className="text-cyan-100">Ownership</TableHead>
                      <TableHead className="text-cyan-100">
                        Purchase Price
                      </TableHead>
                      <TableHead className="text-cyan-100">
                        Payment Method
                      </TableHead>
                      <TableHead className="text-cyan-100">Date</TableHead>
                      <TableHead className="text-cyan-100">MOA Status</TableHead>
                      <TableHead className="text-cyan-100">Certificate</TableHead>
                      <TableHead className="text-cyan-100">Referred By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ownerships.map((ownership) => (
                      <TableRow
                        key={ownership.id}
                        className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                      >
                        <TableCell>
                          <span className="font-medium text-white">
                            {ownership.unit.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-400/20 text-blue-300">
                            {(ownership.percentageOwned / 100).toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-400">
                          {formatCurrency(ownership.purchasePrice)}
                        </TableCell>
                        <TableCell>
                          <Badge className="border-purple-400/30 bg-purple-400/20 text-purple-300">
                            {ownership.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-cyan-100/70">
                          {new Date(ownership.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {ownership.isSigned ? (
                            <div className="flex items-center gap-2">
                              <Badge className="border-green-400/30 bg-green-400/20 text-green-300">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Signed
                              </Badge>
                              {ownership.moaUrl && (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-cyan-400 hover:text-cyan-300"
                                >
                                  <a
                                    href={ownership.moaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Download MOA"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge className="border-amber-400/30 bg-amber-400/20 text-amber-300">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                Pending
                              </Badge>
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-cyan-400 hover:text-cyan-300"
                              >
                                <Link href={`/moa/sign/${ownership.id}`}>
                                  <FileText className="mr-1 h-3 w-3" />
                                  Sign
                                </Link>
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {ownership.certificateUrl ? (
                            <div className="flex items-center gap-2">
                              <Badge className="border-green-400/30 bg-green-400/20 text-green-300">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Sent
                              </Badge>
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-cyan-400 hover:text-cyan-300"
                              >
                                <a
                                  href={ownership.certificateUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Download Certificate"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-cyan-100/40">
                              {ownership.isSigned ? "Generating..." : "Not Available"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-cyan-100/70">
                          <div className="flex min-h-[40px] flex-col justify-center gap-0.5">
                            {ownership.affiliateLink ? (
                              <>
                                <span className="text-sm">
                                  {ownership.affiliateLink.affiliate?.email ?? "Unknown"}
                                </span>
                                <span className="text-xs text-cyan-100/50">
                                  {ownership.affiliateLink.code}
                                </span>
                              </>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Payment Submissions */}
        <ManualPaymentSubmissions initialSubmissions={manualPaymentSubmissions} />
    </div>
  );
}
