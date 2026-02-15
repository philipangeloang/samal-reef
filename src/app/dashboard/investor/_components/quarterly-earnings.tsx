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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export function QuarterlyEarnings() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const { data, isLoading } = api.purchase.getMyQuarterlyEarnings.useQuery({
    year: selectedYear,
  });

  return (
    <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-400/10 p-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-white">Quarterly Earnings</CardTitle>
              <CardDescription className="text-cyan-100/60">
                Your net earnings from booking revenue
              </CardDescription>
            </div>
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
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : !data || data.units.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-cyan-400/20 bg-[#0a1929]/30 py-10">
            <TrendingUp className="mb-3 h-10 w-10 text-cyan-400/50" />
            <p className="text-center text-cyan-100/60">
              No earnings data available for {selectedYear}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Per-unit earnings */}
            {data.units.map((unit) => (
              <div
                key={unit.unitId}
                className="overflow-hidden rounded-lg border border-cyan-400/20"
              >
                {/* Unit header */}
                <div className="flex items-center justify-between bg-[#0a1929]/50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {unit.unitName}
                    </span>
                    <span className="text-xs text-cyan-100/40">
                      {unit.collectionName}
                    </span>
                  </div>
                  <Badge className="bg-blue-400/20 text-xs text-blue-300">
                    {unit.ownerPercentageDisplay}
                  </Badge>
                </div>

                {/* Quarterly grid */}
                <div className="grid grid-cols-4 divide-x divide-cyan-400/10">
                  {unit.quarters.map((q) => (
                    <div key={q.quarter} className="px-4 py-3 text-center">
                      <p className="text-xs text-cyan-100/50">
                        Q{q.quarter}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-green-400">
                        {formatCurrency(q.ownerShare)}
                      </p>
                      <div className="mt-1">
                        {q.status === "PAID" && (
                          <Badge className="bg-green-400/20 text-[10px] text-green-300">
                            Paid
                          </Badge>
                        )}
                        {q.status === "PENDING" && (
                          <Badge className="bg-yellow-400/20 text-[10px] text-yellow-300">
                            Pending
                          </Badge>
                        )}
                        {q.status === "ESTIMATE" && (
                          <Badge className="bg-gray-400/20 text-[10px] text-gray-400">
                            Est.
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Year total */}
                <div className="flex items-center justify-between border-t border-cyan-400/20 bg-[#0a1929]/30 px-4 py-2.5">
                  <span className="text-sm text-cyan-100/60">Year Total</span>
                  <span className="font-bold text-green-400">
                    {formatCurrency(unit.yearTotal)}
                  </span>
                </div>
              </div>
            ))}

            {/* Grand total */}
            {data.units.length > 1 && (
              <div className="flex items-center justify-between rounded-lg border border-green-400/30 bg-green-400/5 px-5 py-3">
                <span className="font-semibold text-white">
                  Grand Total ({selectedYear})
                </span>
                <span className="text-xl font-bold text-green-400">
                  {formatCurrency(data.grandTotal)}
                </span>
              </div>
            )}

            {/* Sync timestamp */}
            {data.lastRefreshedAt && (
              <p className="text-xs text-cyan-100/30">
                Last synced:{" "}
                {new Date(data.lastRefreshedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
