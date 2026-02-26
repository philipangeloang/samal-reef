"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type RouterOutputs } from "@/trpc/react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Home,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Users,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

type Ownerships = RouterOutputs["purchase"]["getMyOwnerships"];

interface OwnershipsTableProps {
  initialOwnerships: Ownerships;
}

function CoOwnersDialog({ unitId, unitName }: { unitId: number; unitName: string }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = api.purchase.getUnitCoOwners.useQuery(
    { unitId },
    { enabled: open },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300"
          title="View co-owners"
        >
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31] to-[#0a1929] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            Co-Owners — {unitName}
          </DialogTitle>
          <DialogDescription className="text-cyan-100/60">
            All fractional owners of this unit
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-cyan-400/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                    <TableHead className="text-cyan-100">Name</TableHead>
                    <TableHead className="text-cyan-100">Email</TableHead>
                    <TableHead className="text-right text-cyan-100">
                      Ownership
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.coOwners.map((owner, i) => (
                    <TableRow
                      key={i}
                      className={`border-cyan-400/10 transition-colors hover:bg-cyan-400/5 ${
                        owner.isCurrentUser ? "bg-cyan-400/5" : ""
                      }`}
                    >
                      <TableCell className="font-medium text-white">
                        {owner.name}
                        {owner.isCurrentUser && (
                          <span className="ml-1.5 text-xs text-cyan-400">
                            (You)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {owner.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-blue-400/20 text-blue-300">
                          {owner.percentageDisplay}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-cyan-400/20 bg-[#0a1929]/30 px-4 py-3">
              <span className="text-sm text-cyan-100/60">Total Allocated</span>
              <Badge className="bg-cyan-400/20 text-cyan-300">
                {data.totalAllocatedDisplay}
              </Badge>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function OwnershipsTable({ initialOwnerships }: OwnershipsTableProps) {
  return (
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
        {initialOwnerships.length === 0 ? (
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
                  <TableHead className="text-cyan-100">RMA Status</TableHead>
                  <TableHead className="text-cyan-100">Certificate</TableHead>
                  <TableHead className="text-cyan-100">Referred By</TableHead>
                  <TableHead className="text-cyan-100">Co-Owners</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialOwnerships.map((ownership) => (
                  <TableRow
                    key={ownership.id}
                    className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                  >
                    <TableCell>
                      <span className="font-medium text-white">
                        {ownership.unit?.name ?? "Unknown"}
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
                      {ownership.isRmaSigned ? (
                        <div className="flex items-center gap-2">
                          <Badge className="border-green-400/30 bg-green-400/20 text-green-300">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Signed
                          </Badge>
                          {ownership.rmaUrl && (
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-cyan-400 hover:text-cyan-300"
                            >
                              <a
                                href={ownership.rmaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download RMA"
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
                            <Link href={`/rma/sign/${ownership.id}`}>
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
                          {ownership.isSigned
                            ? "Generating..."
                            : "Not Available"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-cyan-100/70">
                      <div className="flex min-h-[40px] flex-col justify-center gap-0.5">
                        {ownership.affiliateLink ? (
                          <>
                            <span className="text-sm">
                              {ownership.affiliateLink.affiliate?.email ??
                                "Unknown"}
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
                    <TableCell>
                      {ownership.unitId ? (
                        <CoOwnersDialog
                          unitId={ownership.unitId}
                          unitName={ownership.unit?.name ?? "Unknown"}
                        />
                      ) : (
                        <span className="text-xs text-cyan-100/40">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
