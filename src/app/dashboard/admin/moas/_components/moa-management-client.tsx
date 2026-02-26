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
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Search,
} from "lucide-react";

type MoaStatus = RouterOutputs["admin"]["getAllMoaStatuses"][number];

interface MoaManagementClientProps {
  initialMoas: MoaStatus[];
}

export function MoaManagementClient({
  initialMoas,
}: MoaManagementClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SIGNED" | "PENDING">("ALL");

  const { data: moas = initialMoas } = api.admin.getAllMoaStatuses.useQuery(
    undefined,
    {
      initialData: initialMoas,
      refetchOnMount: false,
    },
  );

  const { data: collections = [] } = api.collection.getAll.useQuery();

  // Filter MOAs by search term (investor name), collection, and status
  const filteredMoas = moas.filter((moa) => {
    const searchLower = searchTerm.toLowerCase();
    const investorName = moa.investor.name?.toLowerCase() ?? "";
    const investorEmail = moa.investor.email?.toLowerCase() ?? "";
    const matchesSearch =
      investorName.includes(searchLower) || investorEmail.includes(searchLower);

    const matchesCollection =
      collectionFilter === "all" ||
      moa.unit.collectionId.toString() === collectionFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "SIGNED" && moa.isSigned) ||
      (statusFilter === "PENDING" && !moa.isSigned);

    return matchesSearch && matchesCollection && matchesStatus;
  });

  const totalMoas = filteredMoas.length;
  const signedMoas = filteredMoas.filter((moa) => moa.isSigned).length;
  const pendingMoas = totalMoas - signedMoas;

  return (
    <>
      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Total MOAs */}
        <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl transition-all group-hover:bg-cyan-400/20" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-cyan-100/60">
                Total MOAs
              </CardDescription>
              <div className="rounded-full bg-cyan-400/10 p-2">
                <FileText className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              {totalMoas}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Signed MOAs */}
        <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-green-500/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-400/10 blur-2xl transition-all group-hover:bg-green-400/20" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-cyan-100/60">
                Signed
              </CardDescription>
              <div className="rounded-full bg-green-400/10 p-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              {signedMoas}
            </CardTitle>
            <p className="text-sm text-green-400/80">
              {totalMoas > 0 ? ((signedMoas / totalMoas) * 100).toFixed(1) : 0}%
              completion
            </p>
          </CardHeader>
        </Card>

        {/* Pending MOAs */}
        <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-amber-500/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl transition-all group-hover:bg-amber-400/20" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-cyan-100/60">
                Pending Signature
              </CardDescription>
              <div className="rounded-full bg-amber-400/10 p-2">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              {pendingMoas}
            </CardTitle>
            <p className="text-sm text-amber-400/80">
              Awaiting investor signatures
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* MOA Table */}
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">All MOA Documents</CardTitle>
              <CardDescription className="text-cyan-100/60">
                {filteredMoas.length} of {moas.length} MOA documents
              </CardDescription>
            </div>
            <div className="flex gap-4">
              {/* Collection Filter */}
              <Select
                value={collectionFilter}
                onValueChange={setCollectionFilter}
              >
                <SelectTrigger className="w-[200px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                  <SelectValue placeholder="Filter by collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem
                      key={collection.id}
                      value={collection.id.toString()}
                    >
                      {collection.name} ({collection.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value: "ALL" | "SIGNED" | "PENDING") =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger className="w-[150px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="SIGNED">Signed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
            <Input
              type="text"
              placeholder="Search by investor name or email..."
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
          {filteredMoas.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-cyan-400/20 bg-[#0a1929]/30 py-12">
              <FileText className="mb-3 h-12 w-12 text-cyan-400/50" />
              <p className="text-center text-cyan-100/60">
                {moas.length === 0
                  ? "No MOA documents found."
                  : "No MOA documents match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-cyan-400/20">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                      <TableHead className="text-cyan-100">
                        Ownership ID
                      </TableHead>
                      <TableHead className="text-cyan-100">Owner</TableHead>
                      <TableHead className="text-cyan-100">Property</TableHead>
                      <TableHead className="text-cyan-100">
                        Collection
                      </TableHead>
                      <TableHead className="text-cyan-100">
                        Ownership %
                      </TableHead>
                      <TableHead className="text-cyan-100">
                        Purchase Price
                      </TableHead>
                      <TableHead className="text-cyan-100">
                        Purchase Date
                      </TableHead>
                      <TableHead className="text-cyan-100">Status</TableHead>
                      <TableHead className="text-cyan-100">
                        Signed Date
                      </TableHead>
                      <TableHead className="text-cyan-100">
                        Signer Name
                      </TableHead>
                      <TableHead className="text-cyan-100">
                        Certificate
                      </TableHead>
                      <TableHead className="text-right text-cyan-100">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMoas.map((moa) => (
                      <TableRow
                        key={moa.ownershipId}
                        className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                      >
                        <TableCell className="font-mono text-xs text-cyan-100/70">
                          #{moa.ownershipId}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-white">
                              {moa.investor.name ?? "Unknown"}
                            </span>
                            <span className="text-xs text-cyan-100/50">
                              {moa.investor.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-white">
                            {moa.unit.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-cyan-100/70">
                            {moa.unit.collection.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-400/20 text-blue-300">
                            {moa.percentageOwned}%
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-400">
                          {moa.purchasePrice}
                        </TableCell>
                        <TableCell className="text-cyan-100/70">
                          {new Date(moa.purchaseDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {moa.isSigned ? (
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
                        <TableCell className="text-cyan-100/70">
                          {moa.moaSignedAt
                            ? new Date(moa.moaSignedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-cyan-100/70">
                          {moa.signerName ?? "-"}
                        </TableCell>
                        <TableCell>
                          {moa.certificateUrl ? (
                            <Badge className="border-green-400/30 bg-green-400/20 text-green-300">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Sent
                            </Badge>
                          ) : (
                            <span className="text-xs text-cyan-100/40">
                              {moa.isSigned ? "Generating..." : "Not Available"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {moa.isSigned && moa.moaUrl ? (
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-8 text-cyan-400 hover:text-cyan-300"
                              >
                                <a
                                  href={moa.moaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Download MOA"
                                >
                                  <Download className="mr-1 h-4 w-4" />
                                  MOA
                                </a>
                              </Button>
                            ) : (
                              <span className="text-xs text-cyan-100/40">-</span>
                            )}
                            {moa.certificateUrl && (
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-8 text-green-400 hover:text-green-300"
                              >
                                <a
                                  href={moa.certificateUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Download Certificate"
                                >
                                  <Download className="mr-1 h-4 w-4" />
                                  Cert
                                </a>
                              </Button>
                            )}
                          </div>
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
    </>
  );
}
