"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Search } from "lucide-react";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { MarkAllPaidDialog } from "./mark-all-paid-dialog";

type Commission = RouterOutputs["admin"]["getAllCommissions"][number];

interface CommissionsManagementClientProps {
  initialCommissions: Commission[];
}

export function CommissionsManagementClient({
  initialCommissions,
}: CommissionsManagementClientProps) {
  const [markingPaid, setMarkingPaid] = useState<Commission | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Only use initialData when no filters are applied
  const hasFilters = searchTerm !== "" || yearFilter !== "all" || monthFilter !== "all" || statusFilter !== "all";

  const { data: commissions = initialCommissions } =
    api.admin.getAllCommissions.useQuery(
      {
        search: searchTerm || undefined,
        year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
        month: monthFilter !== "all" ? parseInt(monthFilter) : undefined,
        isPaid: statusFilter === "all" ? undefined : statusFilter === "paid",
      },
      {
        initialData: !hasFilters ? initialCommissions : undefined,
        refetchOnMount: false,
      },
    );

  // Generate year options (current year and past years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Month names
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const totalPending = commissions
    .filter((c) => !c.isPaid)
    .reduce((sum, commission) => sum + parseFloat(commission.commissionAmount), 0);

  const totalPaid = commissions
    .filter((c) => c.isPaid)
    .reduce((sum, commission) => sum + parseFloat(commission.commissionAmount), 0);

  const pendingCount = commissions.filter((c) => !c.isPaid).length;
  const paidCount = commissions.filter((c) => c.isPaid).length;

  return (
    <>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Pending Commissions</CardTitle>
            <CardDescription className="text-cyan-100/60">
              Total unpaid commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              ₱{totalPending.toFixed(2)}
            </div>
            <p className="text-sm text-cyan-100/60">
              {pendingCount} pending{" "}
              {pendingCount === 1 ? "transaction" : "transactions"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Paid Commissions</CardTitle>
            <CardDescription className="text-cyan-100/60">
              Total commissions paid out
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ₱{totalPaid.toFixed(2)}
            </div>
            <p className="text-sm text-cyan-100/60">
              {paidCount} paid{" "}
              {paidCount === 1 ? "transaction" : "transactions"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {pendingCount > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowBulkDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Mark All Paid ({pendingCount} {pendingCount === 1 ? "commission" : "commissions"})
          </Button>
        </div>
      )}

      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">
                Commission History
              </CardTitle>
              <CardDescription className="text-cyan-100/60">
                View and manage all affiliate commission transactions
              </CardDescription>
            </div>
            <div className="flex gap-4">
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[140px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              {/* Year Filter */}
              <Select
                value={yearFilter}
                onValueChange={(value) => {
                  setYearFilter(value);
                  if (value === "all") setMonthFilter("all");
                }}
              >
                <SelectTrigger className="w-[120px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Month Filter */}
              <Select
                value={monthFilter}
                onValueChange={setMonthFilter}
                disabled={yearFilter === "all"}
              >
                <SelectTrigger className="w-[140px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
            <Input
              type="text"
              placeholder="Search by affiliate name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-cyan-400/30 bg-[#0a1929]/50 pl-10 text-cyan-100 placeholder:text-cyan-100/40"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200"
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-cyan-400/20">
            <Table>
              <TableHeader>
                <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                  <TableHead className="text-cyan-100">Affiliate</TableHead>
                  <TableHead className="text-cyan-100">Type</TableHead>
                  <TableHead className="text-cyan-100">Customer</TableHead>
                  <TableHead className="text-cyan-100">Property</TableHead>
                  <TableHead className="text-cyan-100">Code</TableHead>
                  <TableHead className="text-cyan-100">Rate</TableHead>
                  <TableHead className="text-cyan-100">Amount</TableHead>
                  <TableHead className="text-cyan-100">Status</TableHead>
                  <TableHead className="text-cyan-100">Date</TableHead>
                  <TableHead className="text-right text-cyan-100">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-cyan-100/60">
                      No commissions found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map((commission) => {
                    const isBooking = !!commission.booking;
                    const customerName = isBooking
                      ? commission.booking?.guestName ?? "Guest"
                      : commission.ownership?.user?.name ?? "No name";
                    const customerEmail = isBooking
                      ? commission.booking?.guestEmail ?? "N/A"
                      : commission.ownership?.user?.email ?? "N/A";
                    const propertyName = isBooking
                      ? commission.booking?.collection?.name ?? "Booking"
                      : commission.ownership?.unit?.name ?? "N/A";

                    return (
                      <TableRow
                        key={commission.id}
                        className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">
                              {commission.affiliateLink.affiliate.name ?? "No name"}
                            </div>
                            <div className="text-sm text-cyan-100/60">
                              {commission.affiliateLink.affiliate.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isBooking ? (
                            <Badge className="border-purple-400/30 bg-purple-400/20 text-purple-300">
                              Booking
                            </Badge>
                          ) : (
                            <Badge className="border-blue-400/30 bg-blue-400/20 text-blue-300">
                              Ownership
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">
                              {customerName}
                            </div>
                            <div className="text-sm text-cyan-100/60">
                              {customerEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-cyan-100/70">
                          {propertyName}
                        </TableCell>
                      <TableCell>
                        <Badge className="border-cyan-400/30 bg-cyan-400/20 text-cyan-300">
                          {commission.affiliateLink.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {parseFloat(commission.commissionRate).toFixed(2)}%
                      </TableCell>
                      <TableCell className="font-semibold text-green-400">
                        ₱{parseFloat(commission.commissionAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {commission.isPaid ? (
                          <Badge className="border-green-400/30 bg-green-400/20 text-green-300">
                            Paid
                          </Badge>
                        ) : (
                          <Badge className="border-yellow-400/30 bg-yellow-400/20 text-yellow-300">
                            Unpaid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {commission.isPaid ? (
                          <span className="flex items-center justify-end text-sm text-green-400">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Completed
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMarkingPaid(commission)}
                            className="text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {markingPaid && (
        <MarkPaidDialog
          commission={markingPaid}
          open={!!markingPaid}
          onOpenChange={(open) => !open && setMarkingPaid(null)}
        />
      )}

      <MarkAllPaidDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        unpaidCount={pendingCount}
        totalAmount={totalPending}
      />
    </>
  );
}
