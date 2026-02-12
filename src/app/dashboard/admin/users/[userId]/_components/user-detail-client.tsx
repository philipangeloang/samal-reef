"use client";

import { useState } from "react";
import Link from "next/link";
import { type RouterOutputs } from "@/trpc/react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Calendar,
  TrendingUp,
  Building2,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Users,
  BarChart3,
  Link2,
  ArrowLeft,
} from "lucide-react";
import { currencySymbol } from "@/lib/currency";

type UserData = RouterOutputs["admin"]["getUserDetail"];

interface UserDetailClientProps {
  userData: UserData;
}

export function UserDetailClient({ userData }: UserDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"investor" | "affiliate">(
    userData.hasInvestorProfile ? "investor" : "affiliate",
  );

  const { user, hasInvestorProfile, hasAffiliateProfile, investorData, affiliateData } = userData;

  const userInitials =
    user.name?.substring(0, 2).toUpperCase() ??
    user.email.substring(0, 2).toUpperCase();

  const hasBothProfiles = hasInvestorProfile && hasAffiliateProfile;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button asChild variant="ghost" className="text-cyan-400 hover:text-cyan-300">
        <Link href="/dashboard/admin/users">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Link>
      </Button>

      {/* User Basic Info Card */}
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-cyan-400">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-blue-400 text-lg text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl text-white">{user.name ?? "Unknown"}</CardTitle>
              <CardDescription className="text-cyan-100/60">{user.email}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                className={
                  user.role === "ADMIN"
                    ? "bg-purple-400/20 text-purple-300 border-purple-400/30"
                    : user.role === "STAFF"
                      ? "bg-orange-400/20 text-orange-300 border-orange-400/30"
                      : user.role === "INVESTOR"
                        ? "bg-green-400/20 text-green-300 border-green-400/30"
                        : user.role === "AFFILIATE"
                          ? "bg-blue-400/20 text-blue-300 border-blue-400/30"
                          : "bg-gray-400/20 text-gray-300 border-gray-400/30"
                }
              >
                {user.role}
              </Badge>
              <Badge
                className={
                  user.status === "ACTIVE"
                    ? "bg-green-400/20 text-green-300 border-green-400/30"
                    : "bg-red-400/20 text-red-300 border-red-400/30"
                }
              >
                {user.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-400/10 p-2">
                <User className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-cyan-100/60">User ID</p>
                <p className="font-mono text-sm text-white">{user.id.substring(0, 8)}...</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-400/10 p-2">
                <Mail className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-cyan-100/60">Email</p>
                <p className="text-sm text-white">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-400/10 p-2">
                <Calendar className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-cyan-100/60">Joined</p>
                <p className="text-sm text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs (if user has multiple profiles) */}
      {hasBothProfiles && (
        <div className="flex gap-2">
          <Button
            variant={activeTab === "investor" ? "default" : "outline"}
            onClick={() => setActiveTab("investor")}
            className={
              activeTab === "investor"
                ? "bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30 border-cyan-400/30"
                : "text-cyan-100/60 hover:bg-cyan-400/10 hover:text-cyan-100 border-cyan-400/20"
            }
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Investor Profile
          </Button>
          <Button
            variant={activeTab === "affiliate" ? "default" : "outline"}
            onClick={() => setActiveTab("affiliate")}
            className={
              activeTab === "affiliate"
                ? "bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30 border-cyan-400/30"
                : "text-cyan-100/60 hover:bg-cyan-400/10 hover:text-cyan-100 border-cyan-400/20"
            }
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Affiliate Profile
          </Button>
        </div>
      )}

      {/* Investor Profile */}
      {hasInvestorProfile && (!hasBothProfiles || activeTab === "investor") && investorData && (
        <div className="space-y-6">
          {/* Investor Summary Stats */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Total Invested */}
            <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-green-500/10">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-400/10 blur-2xl transition-all group-hover:bg-green-400/20" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-cyan-100/60">Total Invested</CardDescription>
                  <div className="rounded-full bg-green-400/10 p-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-white">
                  {currencySymbol}{parseFloat(investorData.totalInvested).toLocaleString("en-US")}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Total Percentage */}
            <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl transition-all group-hover:bg-cyan-400/20" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-cyan-100/60">Total Ownership</CardDescription>
                  <div className="rounded-full bg-cyan-400/10 p-2">
                    <TrendingUp className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-white">
                  {investorData.totalPercentage}%
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Units Owned */}
            <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl transition-all group-hover:bg-blue-400/20" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-cyan-100/60">Units Owned</CardDescription>
                  <div className="rounded-full bg-blue-400/10 p-2">
                    <Building2 className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-white">
                  {investorData.totalUnitsOwned}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Ownerships Table */}
          <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-cyan-400/10 p-2">
                  <FileText className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Ownership History</CardTitle>
                  <CardDescription className="text-cyan-100/60">
                    All property investments and MOA status
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {investorData.ownerships.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-cyan-400/20 bg-[#0a1929]/30 py-12">
                  <Building2 className="mb-3 h-12 w-12 text-cyan-400/50" />
                  <p className="text-center text-cyan-100/60">No ownership records found.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                          <TableHead className="text-cyan-100">Unit</TableHead>
                          <TableHead className="text-cyan-100">Ownership %</TableHead>
                          <TableHead className="text-cyan-100">Purchase Price</TableHead>
                          <TableHead className="text-cyan-100">Purchase Date</TableHead>
                          <TableHead className="text-cyan-100">MOA Status</TableHead>
                          <TableHead className="text-cyan-100 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {investorData.ownerships.map((ownership) => (
                          <TableRow
                            key={ownership.id}
                            className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                          >
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-white">{ownership.unitName}</span>
                                <span className="text-xs text-cyan-100/50">
                                  #{ownership.unitId}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-400/20 text-blue-300">
                                {ownership.percentageOwned}%
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-green-400">
                              {currencySymbol}{parseFloat(ownership.purchasePrice).toLocaleString("en-US")}
                            </TableCell>
                            <TableCell className="text-cyan-100/70">
                              {new Date(ownership.purchaseDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {ownership.isSigned ? (
                                <Badge className="border-green-400/30 bg-green-400/20 text-green-300">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Signed
                                </Badge>
                              ) : (
                                <Badge className="border-amber-400/30 bg-amber-400/20 text-amber-300">
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {ownership.isSigned && ownership.moaUrl ? (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-cyan-400 hover:text-cyan-300"
                                >
                                  <a
                                    href={ownership.moaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Download MOA"
                                  >
                                    <Download className="mr-1 h-4 w-4" />
                                    Download
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-xs text-cyan-100/40">Not available</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Affiliate Profile */}
      {hasAffiliateProfile && (!hasBothProfiles || activeTab === "affiliate") && affiliateData && (
        <div className="space-y-6">
          {/* Affiliate Summary Stats */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Earned */}
            <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-green-500/10">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-400/10 blur-2xl transition-all group-hover:bg-green-400/20" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-cyan-100/60">Total Earned</CardDescription>
                  <div className="rounded-full bg-green-400/10 p-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                  {currencySymbol}{parseFloat(affiliateData.totalEarned).toLocaleString("en-US")}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Total Paid */}
            <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl transition-all group-hover:bg-cyan-400/20" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-cyan-100/60">Total Paid</CardDescription>
                  <div className="rounded-full bg-cyan-400/10 p-2">
                    <CheckCircle className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                  {currencySymbol}{parseFloat(affiliateData.totalPaid).toLocaleString("en-US")}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Pending */}
            <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-amber-500/10">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl transition-all group-hover:bg-amber-400/20" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-cyan-100/60">Pending</CardDescription>
                  <div className="rounded-full bg-amber-400/10 p-2">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                  {currencySymbol}{parseFloat(affiliateData.totalPending).toLocaleString("en-US")}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Conversions */}
            <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl transition-all group-hover:bg-blue-400/20" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-cyan-100/60">Conversions</CardDescription>
                  <div className="rounded-full bg-blue-400/10 p-2">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                  {affiliateData.totalConversions}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Affiliate Link Info */}
          {affiliateData.link && (
            <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-cyan-400/10 p-2">
                    <Link2 className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Affiliate Link</CardTitle>
                    <CardDescription className="text-cyan-100/60">
                      Performance metrics and link details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-cyan-100/60">Link Code</p>
                    <p className="font-mono text-lg font-bold text-cyan-300">
                      {affiliateData.link.code}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cyan-100/60">Commission Rate</p>
                    <p className="text-lg font-bold text-white">
                      {affiliateData.link.commissionRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cyan-100/60">Status</p>
                    <Badge
                      className={
                        affiliateData.link.status === "ACTIVE"
                          ? "bg-green-400/20 text-green-300 border-green-400/30"
                          : "bg-gray-400/20 text-gray-300 border-gray-400/30"
                      }
                    >
                      {affiliateData.link.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Commissions Table */}
          <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-cyan-400/10 p-2">
                  <DollarSign className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Commission History</CardTitle>
                  <CardDescription className="text-cyan-100/60">
                    All earned commissions and payment status
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {affiliateData.commissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-cyan-400/20 bg-[#0a1929]/30 py-12">
                  <DollarSign className="mb-3 h-12 w-12 text-cyan-400/50" />
                  <p className="text-center text-cyan-100/60">No commission records found.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                          <TableHead className="text-cyan-100">Date</TableHead>
                          <TableHead className="text-cyan-100">Investor</TableHead>
                          <TableHead className="text-cyan-100">Unit</TableHead>
                          <TableHead className="text-cyan-100">Sale Amount</TableHead>
                          <TableHead className="text-cyan-100">Rate</TableHead>
                          <TableHead className="text-cyan-100">Commission</TableHead>
                          <TableHead className="text-cyan-100">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {affiliateData.commissions.map((commission) => (
                          <TableRow
                            key={commission.id}
                            className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                          >
                            <TableCell className="text-cyan-100/70">
                              {new Date(commission.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-white">
                                  {commission.ownership.investor.name ?? "Unknown"}
                                </span>
                                <span className="text-xs text-cyan-100/50">
                                  {commission.ownership.investor.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-white">
                              {commission.ownership.unitName}
                            </TableCell>
                            <TableCell className="text-cyan-100/70">
                              {currencySymbol}
                              {parseFloat(commission.ownership.purchasePrice).toLocaleString(
                                "en-US",
                              )}
                            </TableCell>
                            <TableCell className="text-cyan-100/70">
                              {commission.rate}%
                            </TableCell>
                            <TableCell className="font-semibold text-green-400">
                              {currencySymbol}{parseFloat(commission.amount).toLocaleString("en-US")}
                            </TableCell>
                            <TableCell>
                              {commission.isPaid ? (
                                <Badge className="border-green-400/30 bg-green-400/20 text-green-300">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Paid
                                </Badge>
                              ) : (
                                <Badge className="border-amber-400/30 bg-amber-400/20 text-amber-300">
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Profiles Message */}
      {!hasInvestorProfile && !hasAffiliateProfile && (
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <Users className="mb-3 h-12 w-12 text-cyan-400/50" />
              <p className="text-center text-cyan-100/60">
                This user has no investor or affiliate profile yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
