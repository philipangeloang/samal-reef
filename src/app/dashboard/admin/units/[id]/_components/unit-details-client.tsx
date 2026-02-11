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
import { ArrowLeft, Users, TrendingUp, PieChart } from "lucide-react";
import Link from "next/link";

type UnitDetails = RouterOutputs["units"]["getById"];

interface UnitDetailsClientProps {
  initialData: UnitDetails;
}

export function UnitDetailsClient({ initialData }: UnitDetailsClientProps) {
  const { data: unitDetails = initialData } = api.units.getById.useQuery(
    { id: initialData.id },
    {
      initialData,
      refetchOnMount: false,
    },
  );

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
    </>
  );
}
