"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, DollarSign, Calendar, Building2, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const QUARTERS = [
  { label: "Q1", months: [1, 2, 3], name: "Jan - Mar" },
  { label: "Q2", months: [4, 5, 6], name: "Apr - Jun" },
  { label: "Q3", months: [7, 8, 9], name: "Jul - Sep" },
  { label: "Q4", months: [10, 11, 12], name: "Oct - Dec" },
];

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function BookingRevenueClient() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const utils = api.useUtils();

  const {
    data: revenue,
    isLoading,
  } = api.booking.getBookingRevenue.useQuery(
    { year: selectedYear },
    { staleTime: Infinity }, // Cache never auto-refreshes - we control it manually
  );

  const refreshMutation = api.booking.refreshBookingRevenue.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.booking.getBookingRevenue.invalidate({ year: selectedYear });
    },
    onError: (error) => {
      toast.error(`Failed to refresh: ${error.message}`);
    },
  });

  // Generate year options (current year + 2 years back)
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const handleRefresh = () => {
    refreshMutation.mutate({ year: selectedYear });
  };

  const lastRefreshed = revenue?.lastRefreshedAt
    ? new Date(revenue.lastRefreshedAt)
    : null;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-cyan-100">Year:</span>
          </div>
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
          >
            <SelectTrigger className="w-32 border-cyan-500/30 bg-gray-800/50 text-cyan-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-cyan-500/30 bg-gray-900">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          {/* Last refreshed indicator */}
          {lastRefreshed && (
            <div className="flex items-center gap-2 text-xs text-cyan-100/50">
              <Clock className="h-3 w-3" />
              <span>Updated {formatRelativeTime(lastRefreshed)}</span>
            </div>
          )}

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshMutation.isPending}
            className="border-cyan-500/30 bg-transparent text-cyan-300 hover:bg-cyan-500/10"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh from Smoobu
          </Button>
        </div>
      </div>

      {/* Never refreshed warning */}
      {!isLoading && !lastRefreshed && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-300">
            Cache is empty for {selectedYear}. Click "Refresh from Smoobu" to load revenue data.
          </p>
        </div>
      )}

      {/* Error Display */}
      {revenue?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-300">API Error: {revenue.error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : revenue ? (
        <>
          {/* QUARTERLY REVENUE - Primary Header View */}
          <div className="rounded-2xl border-2 border-cyan-500/30 bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Quarterly Revenue {selectedYear}</h2>
                <p className="text-sm text-cyan-100/60">Revenue breakdown by quarter</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-cyan-100/60">Year Total</p>
                <p className="text-3xl font-bold text-green-400">
                  {formatCurrency(revenue.yearTotal, 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {QUARTERS.map((quarter) => {
                const totals = revenue.monthlyTotals as Record<number, number>;
                const quarterTotal = quarter.months.reduce(
                  (sum, month) => sum + (totals[month] ?? 0),
                  0
                );
                const percentage = revenue.yearTotal > 0
                  ? ((quarterTotal / revenue.yearTotal) * 100).toFixed(0)
                  : "0";
                return (
                  <div
                    key={quarter.label}
                    className="rounded-xl border border-cyan-500/30 bg-gray-800/60 p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-cyan-300">{quarter.label}</span>
                      <span className="text-xs text-cyan-100/50 bg-cyan-500/10 px-2 py-1 rounded">
                        {percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-cyan-100/50 mb-3">{quarter.name}</p>
                    <p
                      className={`text-3xl font-bold ${
                        quarterTotal > 0 ? "text-green-400" : "text-gray-500"
                      }`}
                    >
                      {formatCurrency(quarterTotal, 0)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-cyan-100/60">
                  <DollarSign className="h-4 w-4" />
                  Total Bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-cyan-300">
                  {revenue.bookingCount ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-cyan-100/60">
                  <Building2 className="h-4 w-4" />
                  Linked Units
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-cyan-300">
                  {revenue.units.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Totals */}
          <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
            <CardHeader>
              <CardTitle className="text-white">Monthly Totals</CardTitle>
              <CardDescription>
                Combined revenue across all units per month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 md:grid-cols-6 lg:grid-cols-12">
                {MONTHS.map((month, idx) => {
                  const monthNum = idx + 1;
                  const totals = revenue.monthlyTotals as Record<number, number>;
                  const amount = totals[monthNum] ?? 0;
                  return (
                    <div
                      key={month}
                      className="rounded-lg bg-gray-800/50 p-3 text-center"
                    >
                      <p className="text-xs text-cyan-100/60">{month}</p>
                      <p
                        className={`text-sm font-semibold ${
                          amount > 0 ? "text-green-400" : "text-gray-500"
                        }`}
                      >
                        {formatCurrency(amount, 0)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Unit */}
          <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
            <CardHeader>
              <CardTitle className="text-white">Revenue by Unit</CardTitle>
              <CardDescription>
                Monthly breakdown per unit (for owner payouts)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revenue.units.length === 0 ? (
                <p className="py-8 text-center text-cyan-100/60">
                  No linked units found. Link units to Smoobu apartments in the
                  Smoobu settings page.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-cyan-500/20">
                        <TableHead className="text-cyan-100">Unit</TableHead>
                        <TableHead className="text-cyan-100">Collection</TableHead>
                        {MONTHS.map((month) => (
                          <TableHead
                            key={month}
                            className="text-right text-cyan-100 text-xs"
                          >
                            {month}
                          </TableHead>
                        ))}
                        <TableHead className="text-right text-cyan-100 font-bold">
                          Total
                        </TableHead>
                        <TableHead className="text-right text-cyan-100">
                          Bookings
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenue.units.map((unit) => (
                        <TableRow
                          key={unit.unitId}
                          className="border-cyan-500/10"
                        >
                          <TableCell className="font-medium text-cyan-100">
                            {unit.unitName}
                          </TableCell>
                          <TableCell className="text-cyan-100/60 text-sm">
                            {unit.collectionName}
                          </TableCell>
                          {MONTHS.map((_, idx) => {
                            const monthNum = idx + 1;
                            const amount = unit.monthlyRevenue[monthNum] ?? 0;
                            return (
                              <TableCell
                                key={monthNum}
                                className={`text-right text-xs ${
                                  amount > 0 ? "text-green-400" : "text-gray-600"
                                }`}
                              >
                                {amount > 0
                                  ? formatCurrency(amount, 0)
                                  : "-"}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-bold text-green-400">
                            {formatCurrency(unit.yearTotal, 0)}
                          </TableCell>
                          <TableCell className="text-right text-cyan-100/60">
                            {unit.bookingCount}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow className="border-cyan-500/30 bg-cyan-500/5">
                        <TableCell
                          colSpan={2}
                          className="font-bold text-cyan-100"
                        >
                          TOTAL
                        </TableCell>
                        {MONTHS.map((_, idx) => {
                          const monthNum = idx + 1;
                          const totals = revenue.monthlyTotals as Record<number, number>;
                          const amount = totals[monthNum] ?? 0;
                          return (
                            <TableCell
                              key={monthNum}
                              className="text-right text-xs font-semibold text-green-400"
                            >
                              {amount > 0
                                ? formatCurrency(amount, 0)
                                : "-"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-bold text-green-400">
                          {formatCurrency(revenue.yearTotal, 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-cyan-100">
                          {revenue.bookingCount}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Note */}
          <p className="text-center text-xs text-cyan-100/40">
            Revenue is shown in {revenue.currency} (Smoobu account currency).
            Check-in date determines which month revenue is counted.
            Data is cached - click "Refresh from Smoobu" to get latest data.
          </p>
        </>
      ) : null}
    </div>
  );
}
