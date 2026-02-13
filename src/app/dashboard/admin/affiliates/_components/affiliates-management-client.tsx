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
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Pencil } from "lucide-react";
import { InviteAffiliateDialog } from "./invite-affiliate-dialog";
import { EditCommissionDialog } from "./edit-commission-dialog";
import { formatCurrency } from "@/lib/currency";

type Affiliate = RouterOutputs["affiliate"]["getAllAffiliates"][number];

interface AffiliatesManagementClientProps {
  initialAffiliates: Affiliate[];
}

export function AffiliatesManagementClient({
  initialAffiliates,
}: AffiliatesManagementClientProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editAffiliate, setEditAffiliate] = useState<{
    name: string;
    email: string;
    linkId: number;
    currentRate: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: affiliates = initialAffiliates } =
    api.affiliate.getAllAffiliates.useQuery(undefined, {
      initialData: initialAffiliates,
      refetchOnMount: false,
    });

  // Filter affiliates by name or email
  const filteredAffiliates = affiliates.filter((affiliate) => {
    const searchLower = searchTerm.toLowerCase();
    const name = affiliate.user.name?.toLowerCase() ?? "";
    const email = affiliate.user.email?.toLowerCase() ?? "";
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const getStatusBadge = (status: "ACTIVE" | "SUSPENDED") => {
    return (
      <Badge
        className={
          status === "ACTIVE"
            ? "bg-green-400/20 text-green-300"
            : "bg-gray-400/20 text-gray-300"
        }
      >
        {status}
      </Badge>
    );
  };

  return (
    <>
      <div className="grid gap-6">
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Affiliate Partners</CardTitle>
                <CardDescription className="text-cyan-100/60">
                  {filteredAffiliates.length} of {affiliates.length} affiliates
                </CardDescription>
              </div>
              <Button
                onClick={() => setInviteDialogOpen(true)}
                className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Affiliate
              </Button>
            </div>

            {/* Search Filter */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
              <Input
                type="text"
                placeholder="Search by name or email..."
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
                    <TableHead className="text-cyan-100">Commission Rate</TableHead>
                    <TableHead className="text-cyan-100">Total Earned</TableHead>
                    <TableHead className="text-cyan-100">Total Paid</TableHead>
                    <TableHead className="text-cyan-100">Pending</TableHead>
                    <TableHead className="text-cyan-100">Status</TableHead>
                    <TableHead className="text-cyan-100">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-cyan-100/60"
                      >
                        {affiliates.length === 0
                          ? "No affiliates found. Invite your first affiliate to get started."
                          : "No affiliates match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAffiliates.map((affiliate) => {
                      const totalEarned = parseFloat(affiliate.totalEarned);
                      const totalPaid = parseFloat(affiliate.totalPaid);
                      const pending = totalEarned - totalPaid;

                      return (
                        <TableRow
                          key={affiliate.id}
                          className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium text-white">
                                {affiliate.user.name ?? "No name"}
                              </div>
                              <div className="text-sm text-cyan-100/60">
                                {affiliate.user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="text-cyan-100/70">
                                {parseFloat(affiliate.link?.commissionRate ?? affiliate.defaultCommissionRate).toFixed(2)}%
                              </span>
                              {affiliate.link && (
                                <button
                                  onClick={() =>
                                    setEditAffiliate({
                                      name: affiliate.user.name ?? "Affiliate",
                                      email: affiliate.user.email,
                                      linkId: affiliate.link!.id,
                                      currentRate: affiliate.link!.commissionRate,
                                    })
                                  }
                                  className="rounded p-1 text-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-300"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-cyan-100/70">
                            {formatCurrency(totalEarned)}
                          </TableCell>
                          <TableCell className="text-cyan-100/70">
                            {formatCurrency(totalPaid)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                pending > 0
                                  ? "font-semibold text-green-400"
                                  : "text-cyan-100/70"
                              }
                            >
                              {formatCurrency(pending)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(affiliate.status)}
                          </TableCell>
                          <TableCell className="text-cyan-100/70">
                            {new Date(affiliate.createdAt).toLocaleDateString()}
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
      </div>

      <InviteAffiliateDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

      <EditCommissionDialog
        open={!!editAffiliate}
        onOpenChange={(open) => {
          if (!open) setEditAffiliate(null);
        }}
        affiliate={editAffiliate}
      />
    </>
  );
}
