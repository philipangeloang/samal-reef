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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Plus, Loader2, Check, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, currencySymbol, currencyCode } from "@/lib/currency";

type Transaction = RouterOutputs["admin"]["getAllTransactions"]["transactions"][number];

interface TransactionsManagementClientProps {
  initialData: RouterOutputs["admin"]["getAllTransactions"];
}

export function TransactionsManagementClient({
  initialData,
}: TransactionsManagementClientProps) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  // Add Ownership Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    investorEmail: "",
    investorName: "",
    collectionId: "",
    pricingTierId: "",
    unitId: "",
    paymentMethod: "MANUAL" as "FIAT" | "CRYPTO" | "MANUAL",
    internalNotes: "",
  });

  const utils = api.useUtils();
  const { data: collections = [] } = api.collection.getAll.useQuery();

  // Get units for selected collection
  const { data: unitsData = [] } = api.units.getByCollection.useQuery(
    { collectionId: parseInt(addForm.collectionId) },
    { enabled: !!addForm.collectionId }
  );

  // Get pricing tiers for selected collection
  const selectedCollection = collections.find(
    (c) => c.id.toString() === addForm.collectionId
  );
  const pricingTiers = selectedCollection?.pricingTiers ?? [];

  // Get selected pricing tier
  const selectedTier = pricingTiers.find(
    (t) => t.id.toString() === addForm.pricingTierId
  );

  // Only use initialData when on page 1 with no filters applied
  const hasFilters = searchTerm !== "" || collectionFilter !== "all" || yearFilter !== "all" || monthFilter !== "all";

  const { data, isLoading } = api.admin.getAllTransactions.useQuery(
    {
      page,
      limit: 20,
      search: searchTerm || undefined,
      collectionId: collectionFilter !== "all" ? parseInt(collectionFilter) : undefined,
      year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
      month: monthFilter !== "all" ? parseInt(monthFilter) : undefined,
    },
    {
      placeholderData: (previousData) => previousData,
    },
  );

  const createOwnership = api.admin.adminCreateOwnership.useMutation({
    onSuccess: () => {
      toast.success("Ownership created successfully");
      setIsAddModalOpen(false);
      setAddForm({
        investorEmail: "",
        investorName: "",
        collectionId: "",
        pricingTierId: "",
        unitId: "",
        paymentMethod: "MANUAL",
        internalNotes: "",
      });
      utils.admin.getAllTransactions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create ownership");
    },
  });

  // Approve ownership mutation (for staff-created pending ownerships)
  const approveOwnership = api.staffEntry.approveOwnership.useMutation({
    onSuccess: () => {
      toast.success("Ownership approved successfully");
      utils.admin.getAllTransactions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve ownership");
    },
  });

  const transactions = data?.transactions ?? [];
  const pagination = data?.pagination ?? initialData.pagination;

  // Generate year options (current year and past years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Month names
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleSearch = () => {
    setPage(1); // Reset to first page when searching
  };

  const handleCollectionChange = (value: string) => {
    setAddForm({
      ...addForm,
      collectionId: value,
      pricingTierId: "",
      unitId: "",
    });
  };

  const handleTierChange = (value: string) => {
    setAddForm({
      ...addForm,
      pricingTierId: value,
    });
  };

  const handleCreateOwnership = () => {
    if (!addForm.investorEmail) {
      toast.error("Please enter investor email");
      return;
    }
    if (!addForm.collectionId) {
      toast.error("Please select a collection");
      return;
    }
    if (!addForm.pricingTierId) {
      toast.error("Please select a pricing tier");
      return;
    }
    if (!addForm.unitId) {
      toast.error("Please select a unit");
      return;
    }
    if (!selectedTier) {
      toast.error("Invalid pricing tier");
      return;
    }

    createOwnership.mutate({
      investorEmail: addForm.investorEmail,
      investorName: addForm.investorName || undefined,
      collectionId: parseInt(addForm.collectionId),
      pricingTierId: parseInt(addForm.pricingTierId),
      unitId: parseInt(addForm.unitId),
      purchasePrice: selectedTier.fiatPrice,
      paymentMethod: addForm.paymentMethod,
      internalNotes: addForm.internalNotes || undefined,
    });
  };

  return (
    <>
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">All Transactions</CardTitle>
              <CardDescription className="text-cyan-100/60">
                {pagination.total} total transactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {/* Add Ownership Button */}
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-green-500 hover:bg-green-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Ownership
              </Button>

              {/* Collection Filter */}
              <Select
                value={collectionFilter}
                onValueChange={(value) => {
                  setCollectionFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                  <SelectValue placeholder="Filter by collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem
                      key={collection.id}
                      value={collection.id.toString()}
                    >
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Filter */}
              <Select
                value={yearFilter}
                onValueChange={(value) => {
                  setYearFilter(value);
                  if (value === "all") setMonthFilter("all");
                  setPage(1);
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
                onValueChange={(value) => {
                  setMonthFilter(value);
                  setPage(1);
                }}
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
              placeholder="Search by buyer name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full border-cyan-400/30 bg-[#0a1929]/50 pl-10 text-cyan-100 placeholder:text-cyan-100/40"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
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
                  <TableHead className="text-cyan-100">Transaction ID</TableHead>
                  <TableHead className="text-cyan-100">Buyer</TableHead>
                  <TableHead className="text-cyan-100">Unit</TableHead>
                  <TableHead className="text-cyan-100">Ownership %</TableHead>
                  <TableHead className="text-cyan-100">Purchase Price</TableHead>
                  <TableHead className="text-cyan-100">Payment Method</TableHead>
                  <TableHead className="text-cyan-100">Status</TableHead>
                  <TableHead className="text-cyan-100">Date</TableHead>
                  <TableHead className="text-cyan-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-cyan-100/60">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-cyan-100/60">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                    >
                      <TableCell className="font-mono text-xs text-cyan-100/70">
                        #{transaction.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">
                            {transaction.userName ?? transaction.pendingInvestorName ?? "Unknown"}
                          </div>
                          <div className="text-sm text-cyan-100/60">
                            {transaction.userEmail ?? transaction.pendingInvestorEmail ?? "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {transaction.unitName ?? (transaction.approvalStatus === "PENDING_APPROVAL" ? "Pending" : "N/A")}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-400/20 text-blue-300">
                          {(Number(transaction.percentageOwned) / 100).toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-400">
                        {formatCurrency(transaction.purchasePrice)}
                      </TableCell>
                      <TableCell>
                        <Badge className="border-cyan-400/30 bg-cyan-400/20 text-cyan-300">
                          {transaction.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.approvalStatus === "PENDING_APPROVAL" ? (
                          <Badge className="bg-orange-400/20 text-orange-300 border-orange-400/30">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        ) : transaction.approvalStatus === "APPROVED" ? (
                          <Badge className="bg-green-400/20 text-green-300 border-green-400/30">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge className="bg-green-400/20 text-green-300 border-green-400/30">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-cyan-100/70">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {transaction.approvalStatus === "PENDING_APPROVAL" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => approveOwnership.mutate({ ownershipId: transaction.id })}
                            disabled={approveOwnership.isPending}
                            className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                            title="Approve ownership"
                          >
                            {approveOwnership.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-cyan-100/60">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1 || isLoading}
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-cyan-300 hover:bg-cyan-400/20"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages || isLoading}
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-cyan-300 hover:bg-cyan-400/20"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Ownership Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-cyan-500/30 bg-[#0d1f31] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-white">Add Ownership</DialogTitle>
            <DialogDescription className="text-cyan-100/60">
              Create a new ownership entry directly. This will create the investor account if needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Investor Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-cyan-300">Investor Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-cyan-100">
                    Email <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={addForm.investorEmail}
                    onChange={(e) => setAddForm({ ...addForm, investorEmail: e.target.value })}
                    placeholder="investor@example.com"
                    className="border-cyan-500/30 bg-gray-900/50 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cyan-100">Name</Label>
                  <Input
                    type="text"
                    value={addForm.investorName}
                    onChange={(e) => setAddForm({ ...addForm, investorName: e.target.value })}
                    placeholder="John Doe"
                    className="border-cyan-500/30 bg-gray-900/50 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Property Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-cyan-300">Property Selection</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-cyan-100">
                    Collection <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={addForm.collectionId}
                    onValueChange={handleCollectionChange}
                  >
                    <SelectTrigger className="w-full border-cyan-500/30 bg-gray-900/50 text-white">
                      <SelectValue placeholder="Select collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id.toString()}>
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-cyan-100">
                    Pricing Tier <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={addForm.pricingTierId}
                    onValueChange={handleTierChange}
                    disabled={!addForm.collectionId}
                  >
                    <SelectTrigger className="w-full border-cyan-500/30 bg-gray-900/50 text-white">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingTiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id.toString()}>
                          {(tier.percentage / 100).toFixed(2)}% - {formatCurrency(tier.fiatPrice)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-cyan-100">
                    Unit <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={addForm.unitId}
                    onValueChange={(value) => setAddForm({ ...addForm, unitId: value })}
                    disabled={!addForm.collectionId}
                  >
                    <SelectTrigger className="w-full border-cyan-500/30 bg-gray-900/50 text-white">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitsData.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name} ({unit.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-cyan-300">Payment Details</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-cyan-100">Purchase Price ({currencyCode})</Label>
                  <div className="flex h-10 w-full items-center rounded-md border border-cyan-500/30 bg-gray-900/50 px-3 text-white">
                    {selectedTier
                      ? formatCurrency(selectedTier.fiatPrice)
                      : "Select a pricing tier"}
                  </div>
                  <p className="text-xs text-cyan-100/50">
                    Price is determined by the selected pricing tier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-cyan-100">Payment Method</Label>
                  <Select
                    value={addForm.paymentMethod}
                    onValueChange={(value: "FIAT" | "CRYPTO" | "MANUAL") =>
                      setAddForm({ ...addForm, paymentMethod: value })
                    }
                  >
                    <SelectTrigger className="w-full border-cyan-500/30 bg-gray-900/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="FIAT">Fiat (Stripe)</SelectItem>
                      <SelectItem value="CRYPTO">Crypto (DePay)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-cyan-300">Notes</h3>
              <div className="space-y-2">
                <Label className="text-cyan-100">Internal Notes</Label>
                <Textarea
                  value={addForm.internalNotes}
                  onChange={(e) => setAddForm({ ...addForm, internalNotes: e.target.value })}
                  placeholder="Notes about this transaction..."
                  className="min-h-[80px] border-cyan-500/30 bg-gray-900/50 text-white"
                />
              </div>
            </div>

            {/* Summary */}
            {addForm.collectionId && selectedTier && (
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                <h4 className="mb-2 font-medium text-cyan-100">Summary</h4>
                <div className="space-y-1 text-sm text-cyan-100/70">
                  <div className="flex justify-between">
                    <span>Collection</span>
                    <span>{selectedCollection?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ownership Percentage</span>
                    <span>{(selectedTier.percentage / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between border-t border-cyan-500/20 pt-1 font-semibold text-green-400">
                    <span>Purchase Price</span>
                    <span>{formatCurrency(selectedTier.fiatPrice)} {currencyCode}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="border-cyan-500/30 text-cyan-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOwnership}
              disabled={createOwnership.isPending}
              className="bg-green-500 hover:bg-green-600"
            >
              {createOwnership.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Ownership"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
