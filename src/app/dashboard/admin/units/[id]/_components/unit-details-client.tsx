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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  PieChart,
  CalendarDays,
  Loader2,
  Info,
  CheckCircle,
  Trash2,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

type UnitDetails = RouterOutputs["units"]["getById"];

interface UnitDetailsClientProps {
  initialData: UnitDetails;
}

export function UnitDetailsClient({ initialData }: UnitDetailsClientProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const { data: unitDetails = initialData } = api.units.getById.useQuery(
    { id: initialData.id },
    {
      initialData,
      refetchOnMount: false,
    },
  );

  const { data: earnings, isLoading: earningsLoading } =
    api.units.getUnitQuarterlyEarnings.useQuery({
      unitId: initialData.id,
      year: selectedYear,
    });

  // Convert basis points to percentage
  const totalOwnedPercent = (unitDetails.totalOwned / 100).toFixed(2);
  const availablePercent = (unitDetails.availablePercentage / 100).toFixed(2);

  const getStatusBadge = (status: "AVAILABLE" | "SOLD_OUT" | "DRAFT") => {
    const statusStyles = {
      AVAILABLE: "bg-green-400/20 text-green-300 border-green-400/30",
      SOLD_OUT: "bg-red-400/20 text-red-300 border-red-400/30",
      DRAFT: "bg-gray-400/20 text-gray-300 border-gray-400/30",
    };
    return (
      <Badge className={statusStyles[status]}>{status.replace("_", " ")}</Badge>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="animate-fade-in">
        <Link href="/dashboard/admin/units">
          <Button
            variant="ghost"
            className="mb-4 text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Units
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-4xl font-bold text-transparent">
              {unitDetails.name}
            </h1>
            <p className="mt-2 text-cyan-100/60">
              Collection: {unitDetails.collection.name} (
              {unitDetails.collection.slug})
            </p>
          </div>
          {getStatusBadge(unitDetails.status)}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100">
              Total Owned
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {totalOwnedPercent}%
            </div>
            <p className="text-xs text-cyan-100/60">
              {unitDetails.ownerships.length} investor(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100">
              Available
            </CardTitle>
            <PieChart className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {availablePercent}%
            </div>
            <p className="text-xs text-cyan-100/60">
              {unitDetails.isSoldOut ? "Sold out" : "Ready to sell"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100">
              Total Investors
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {unitDetails.ownerships.length}
            </div>
            <p className="text-xs text-cyan-100/60">Active owners</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Ownership Bar */}
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Ownership Distribution</CardTitle>
          <CardDescription className="text-cyan-100/60">
            Visual representation of owned vs available percentage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative h-8 w-full overflow-hidden rounded-lg bg-gray-700/50">
              {/* Owned portion */}
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${totalOwnedPercent}%` }}
              />
              {/* Available portion */}
              <div
                className="absolute top-0 right-0 h-full bg-gradient-to-r from-green-500/50 to-green-600/50"
                style={{ width: `${availablePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                <span className="text-cyan-100">
                  Owned: {totalOwnedPercent}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-green-500 to-green-600" />
                <span className="text-cyan-100">
                  Available: {availablePercent}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Details */}
      {unitDetails.description && (
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-cyan-100/80">{unitDetails.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Ownership Table */}
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Ownership Breakdown</CardTitle>
          <CardDescription className="text-cyan-100/60">
            Detailed list of all investors and their ownership percentages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unitDetails.ownerships.length === 0 ? (
            <div className="py-8 text-center text-cyan-100/60">
              No owners yet. This unit is fully available for purchase.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-cyan-400/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                    <TableHead className="text-cyan-100">Investor</TableHead>
                    <TableHead className="text-cyan-100">Email</TableHead>
                    <TableHead className="text-right text-cyan-100">
                      Ownership %
                    </TableHead>
                    <TableHead className="text-right text-cyan-100">
                      Visual Share
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitDetails.ownerships.map((ownership) => {
                    const ownershipPercent = (
                      ownership.percentageOwned / 100
                    ).toFixed(2);
                    return (
                      <TableRow
                        key={ownership.id}
                        className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                      >
                        <TableCell className="font-medium text-white">
                          {ownership.user?.name ?? "Pending Approval"}
                        </TableCell>
                        <TableCell className="text-cyan-100/70">
                          {ownership.user?.email ?? "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="border-cyan-400/30 bg-cyan-400/20 text-cyan-300">
                            {ownershipPercent}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="relative h-2 w-24 overflow-hidden rounded-full bg-gray-700/50">
                              <div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                style={{ width: `${ownershipPercent}%` }}
                              />
                            </div>
                          </div>
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

      {/* Quarterly Earnings & Settlements */}
      <Card className="hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-white">
                Quarterly Earnings & Payouts
              </CardTitle>
              <CardDescription className="text-cyan-100/60">
                Revenue breakdown, settlements, and payout tracking
              </CardDescription>
            </div>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-[140px] border-cyan-400/20 bg-[#0a1929]/50 text-white">
                <CalendarDays className="mr-2 h-4 w-4 text-cyan-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-cyan-400/20 bg-[#0d1f31]">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-white">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {earningsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : !earnings ? (
            <div className="py-8 text-center text-cyan-100/60">
              No earnings data available.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Last refreshed */}
              {earnings.lastRefreshedAt && (
                <p className="text-xs text-cyan-100/40">
                  Revenue last synced:{" "}
                  {new Date(earnings.lastRefreshedAt).toLocaleString()}
                </p>
              )}

              {/* Deduction summary table */}
              <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                      <TableHead className="text-cyan-100">Quarter</TableHead>
                      <TableHead className="text-right text-cyan-100">
                        Gross Revenue
                      </TableHead>
                      <TableHead className="text-right text-cyan-100">
                        Fixed Expense
                      </TableHead>
                      <TableHead className="text-right text-cyan-100">
                        Addtl Expense
                      </TableHead>
                      <TableHead className="text-right text-cyan-100">
                        Mgmt Fee (8%)
                      </TableHead>
                      <TableHead className="text-right text-cyan-100">
                        Net Pool
                      </TableHead>
                      <TableHead className="text-center text-cyan-100">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.quarters.map((q) => (
                      <TableRow
                        key={q.quarter}
                        className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                      >
                        <TableCell className="font-medium text-white">
                          <div className="flex items-center gap-2">
                            {q.label}
                            {q.isSettled && (
                              <Badge className="bg-green-400/20 text-xs text-green-300">
                                <Lock className="mr-1 h-3 w-3" />
                                Settled
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-cyan-100/70">
                          {formatCurrency(q.grossRevenue)}
                        </TableCell>
                        <TableCell className="text-right text-red-300/70">
                          -{formatCurrency(q.fixedExpense)}
                        </TableCell>
                        <TableCell className="text-right text-red-300/70">
                          {q.additionalExpense > 0
                            ? `-${formatCurrency(q.additionalExpense)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-red-300/70">
                          -{formatCurrency(q.managementFee)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-400">
                          {formatCurrency(q.netPool)}
                        </TableCell>
                        <TableCell className="text-center">
                          {q.isSettled ? (
                            <SettlementActions
                              quarter={q}
                              unitId={initialData.id}
                            />
                          ) : (
                            <SettleQuarterDialog
                              quarter={q}
                              unitId={initialData.id}
                              year={selectedYear}
                              config={earnings.config}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-cyan-400/30 bg-[#0a1929]/40">
                      <TableCell
                        colSpan={5}
                        className="font-semibold text-white"
                      >
                        Year Total Net Pool
                      </TableCell>
                      <TableCell className="text-right text-lg font-bold text-green-400">
                        {formatCurrency(earnings.yearTotalNetPool)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Owner shares / payout table */}
              {earnings.owners.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                  <div className="flex items-center justify-between border-b border-cyan-400/20 bg-[#0a1929]/50 px-4 py-3">
                    <h4 className="font-semibold text-white">
                      Owner Shares & Payouts
                    </h4>
                    <div className="flex gap-2">
                      {earnings.quarters.map(
                        (q) =>
                          q.isSettled &&
                          q.settlement && (
                            <PayAllButton
                              key={q.quarter}
                              quarter={q.quarter}
                              settlementId={q.settlement.id}
                              payouts={q.settlement.payouts}
                              unitId={initialData.id}
                            />
                          ),
                      )}
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-cyan-400/20 bg-[#0a1929]/30 hover:bg-[#0a1929]/50">
                        <TableHead className="text-cyan-100">Owner</TableHead>
                        <TableHead className="text-cyan-100">Email</TableHead>
                        <TableHead className="text-right text-cyan-100">
                          Ownership
                        </TableHead>
                        {earnings.quarters.map((q) => (
                          <TableHead
                            key={q.quarter}
                            className="text-right text-cyan-100"
                          >
                            Q{q.quarter}
                          </TableHead>
                        ))}
                        <TableHead className="text-right text-cyan-100">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.owners.map((owner, i) => (
                        <TableRow
                          key={i}
                          className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                        >
                          <TableCell className="font-medium text-white">
                            {owner.name}
                          </TableCell>
                          <TableCell className="text-cyan-100/70">
                            {owner.email}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-blue-400/20 text-blue-300">
                              {owner.percentageDisplay}
                            </Badge>
                          </TableCell>
                          {owner.quarterShares.map((share, qi) => {
                            const q = earnings.quarters[qi]!;
                            const payout =
                              q.isSettled && q.settlement
                                ? q.settlement.payouts.find(
                                    (p) => p.email === owner.email,
                                  )
                                : null;

                            return (
                              <TableCell key={qi} className="text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-cyan-100/70">
                                    {formatCurrency(share)}
                                  </span>
                                  {payout ? (
                                    payout.isPaid ? (
                                      <Badge className="bg-green-400/20 text-[10px] text-green-300">
                                        <CheckCircle className="mr-0.5 h-2.5 w-2.5" />
                                        Paid
                                      </Badge>
                                    ) : (
                                      <PayOwnerButton
                                        payoutId={payout.id}
                                        unitId={initialData.id}
                                      />
                                    )
                                  ) : null}
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-semibold text-green-400">
                            {formatCurrency(owner.yearTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Info note */}
              <div className="flex items-start gap-2 rounded-lg border border-cyan-400/10 bg-[#0a1929]/30 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400/60" />
                <p className="text-xs leading-relaxed text-cyan-100/50">
                  Expenses:{" "}
                  {formatCurrency(earnings.config.fixedExpensePerQuarter)}
                  /quarter fixed +{" "}
                  {(earnings.config.managementFeePercent * 100).toFixed(0)}%
                  management fee. Settle a quarter to lock in numbers with
                  additional expenses, then mark owners as paid.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ──────────────────────────────────────────────────
// Settlement Dialog — settle an unsettled quarter
// ──────────────────────────────────────────────────
function SettleQuarterDialog({
  quarter,
  unitId,
  year,
  config,
}: {
  quarter: { quarter: number; label: string; grossRevenue: number };
  unitId: number;
  year: number;
  config: { fixedExpensePerQuarter: number; managementFeePercent: number };
}) {
  const [open, setOpen] = useState(false);
  const [additionalExpense, setAdditionalExpense] = useState(0);
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();
  const settleMutation = api.units.createSettlement.useMutation({
    onSuccess: () => {
      toast.success(`Q${quarter.quarter} settled successfully`);
      void utils.units.getUnitQuarterlyEarnings.invalidate();
      setOpen(false);
      setAdditionalExpense(0);
      setNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const afterExpense = Math.max(
    0,
    quarter.grossRevenue - config.fixedExpensePerQuarter - additionalExpense,
  );
  const mgmtFee =
    Math.round(afterExpense * config.managementFeePercent * 100) / 100;
  const netPool = Math.round((afterExpense - mgmtFee) * 100) / 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
        >
          Settle
        </Button>
      </DialogTrigger>
      <DialogContent className="border-cyan-400/20 bg-[#0d1f31] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            Settle {quarter.label}
          </DialogTitle>
          <DialogDescription className="text-cyan-100/60">
            Lock in this quarter&apos;s financials and create payout records for
            each owner.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pre-calculated values */}
          <div className="space-y-2 rounded-lg border border-cyan-400/10 bg-[#0a1929]/30 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-cyan-100/60">Gross Revenue</span>
              <span className="text-white">
                {formatCurrency(quarter.grossRevenue)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cyan-100/60">Fixed Expense</span>
              <span className="text-red-300/70">
                -{formatCurrency(config.fixedExpensePerQuarter)}
              </span>
            </div>
          </div>

          {/* Additional expense input */}
          <div className="space-y-2">
            <Label className="text-cyan-100" htmlFor="additionalExpense">
              Additional Expense
            </Label>
            <Input
              id="additionalExpense"
              type="number"
              min={0}
              step={0.01}
              value={additionalExpense}
              onChange={(e) =>
                setAdditionalExpense(Math.max(0, Number(e.target.value)))
              }
              className="border-cyan-400/20 bg-[#0a1929]/50 text-white"
              placeholder="0.00"
            />
          </div>

          <Separator className="bg-cyan-400/10" />

          {/* Live preview */}
          <div className="space-y-2 rounded-lg border border-green-400/20 bg-green-400/5 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-cyan-100/60">After Expenses</span>
              <span className="text-white">{formatCurrency(afterExpense)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cyan-100/60">Management Fee (8%)</span>
              <span className="text-red-300/70">
                -{formatCurrency(mgmtFee)}
              </span>
            </div>
            <Separator className="bg-green-400/10" />
            <div className="flex justify-between font-semibold">
              <span className="text-white">Net Pool</span>
              <span className="text-green-400">{formatCurrency(netPool)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-cyan-100" htmlFor="notes">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-cyan-400/20 bg-[#0a1929]/50 text-white"
              placeholder="e.g. Pool repairs, utilities..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-cyan-400/20 text-cyan-300"
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              settleMutation.mutate({
                unitId,
                year,
                quarter: quarter.quarter,
                additionalExpense,
                notes: notes || undefined,
              })
            }
            disabled={settleMutation.isPending}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {settleMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Confirm Settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────
// Settlement Actions — delete button for settled quarter
// ──────────────────────────────────────────────────
function SettlementActions({
  quarter,
  unitId,
}: {
  quarter: {
    isSettled: true;
    settlement: {
      id: number;
      payouts: Array<{ isPaid: boolean }>;
    };
  };
  unitId: number;
}) {
  const utils = api.useUtils();
  const deleteMutation = api.units.deleteSettlement.useMutation({
    onSuccess: () => {
      toast.success("Settlement deleted");
      void utils.units.getUnitQuarterlyEarnings.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const hasPaid = quarter.settlement.payouts.some((p) => p.isPaid);

  if (hasPaid) return null;

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-red-400 hover:bg-red-400/10 hover:text-red-300"
      onClick={() =>
        deleteMutation.mutate({ settlementId: quarter.settlement.id })
      }
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}

// ──────────────────────────────────────────────────
// Pay single owner button
// ──────────────────────────────────────────────────
function PayOwnerButton({
  payoutId,
  unitId,
}: {
  payoutId: number;
  unitId: number;
}) {
  const utils = api.useUtils();
  const payMutation = api.units.markPayoutPaid.useMutation({
    onSuccess: () => {
      toast.success("Payout marked as paid");
      void utils.units.getUnitQuarterlyEarnings.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-5 border-yellow-400/30 px-1.5 text-[10px] text-yellow-300 hover:bg-yellow-400/10"
      onClick={() => payMutation.mutate({ payoutId })}
      disabled={payMutation.isPending}
    >
      {payMutation.isPending ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        "Pay"
      )}
    </Button>
  );
}

// ──────────────────────────────────────────────────
// Pay All button for a settled quarter
// ──────────────────────────────────────────────────
function PayAllButton({
  quarter,
  settlementId,
  payouts,
  unitId,
}: {
  quarter: number;
  settlementId: number;
  payouts: Array<{ isPaid: boolean }>;
  unitId: number;
}) {
  const utils = api.useUtils();
  const payAllMutation = api.units.markAllPayoutsPaid.useMutation({
    onSuccess: () => {
      toast.success(`All Q${quarter} payouts marked as paid`);
      void utils.units.getUnitQuarterlyEarnings.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const hasUnpaid = payouts.some((p) => !p.isPaid);
  if (!hasUnpaid) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-green-400/30 text-xs text-green-300 hover:bg-green-400/10"
      onClick={() => payAllMutation.mutate({ settlementId })}
      disabled={payAllMutation.isPending}
    >
      {payAllMutation.isPending ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <CheckCircle className="mr-1 h-3 w-3" />
      )}
      Pay All Q{quarter}
    </Button>
  );
}
