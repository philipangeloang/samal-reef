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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  CheckCircle,
  XCircle,
  Loader2,
  User,
} from "lucide-react";

export function ApprovalsClient() {
  const utils = api.useUtils();

  const { data, isLoading, error } = api.staffEntry.getPendingApprovals.useQuery();

  // Get units for ownership approval
  const { data: unitsData } = api.units.getAll.useQuery();

  // Approval/Rejection state
  const [selectedOwnership, setSelectedOwnership] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectOwnershipDialog, setShowRejectOwnershipDialog] = useState(false);
  const [showRejectBookingDialog, setShowRejectBookingDialog] = useState(false);
  const [showApproveOwnershipDialog, setShowApproveOwnershipDialog] = useState(false);

  // Mutations
  const approveOwnership = api.staffEntry.approveOwnership.useMutation({
    onSuccess: () => {
      toast.success("Ownership approved successfully");
      setShowApproveOwnershipDialog(false);
      setSelectedOwnership(null);
      setSelectedUnitId(null);
      void utils.staffEntry.getPendingApprovals.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve ownership");
    },
  });

  const rejectOwnership = api.staffEntry.rejectOwnership.useMutation({
    onSuccess: () => {
      toast.success("Ownership rejected");
      setShowRejectOwnershipDialog(false);
      setSelectedOwnership(null);
      setRejectionReason("");
      void utils.staffEntry.getPendingApprovals.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject ownership");
    },
  });

  const approveBooking = api.staffEntry.approveBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking approved and confirmed");
      setSelectedBooking(null);
      void utils.staffEntry.getPendingApprovals.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve booking");
    },
  });

  const rejectBooking = api.staffEntry.rejectBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking rejected");
      setShowRejectBookingDialog(false);
      setSelectedBooking(null);
      setRejectionReason("");
      void utils.staffEntry.getPendingApprovals.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject booking");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90">
        <CardContent className="py-8">
          <p className="text-center text-red-400">
            Failed to load approvals: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const ownerships = data?.ownerships ?? [];
  const bookings = data?.bookings ?? [];
  const totalPending = ownerships.length + bookings.length;

  // Get units for the selected ownership's collection
  const selectedOwnershipData = ownerships.find((o) => o.id === selectedOwnership);
  const collectionUnits = unitsData?.filter(
    (u) => u.collectionId === selectedOwnershipData?.pricingTier?.collection?.id
  ) ?? [];

  return (
    <>
      {totalPending === 0 ? (
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-12 w-12 text-green-400" />
              <p className="text-center text-xl text-cyan-100">
                No pending approvals
              </p>
              <p className="text-center text-cyan-100/60">
                All staff entries have been reviewed
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="ownerships" className="space-y-6">
          <TabsList className="border-cyan-400/20 bg-[#0a1929]/50">
            <TabsTrigger
              value="ownerships"
              className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Ownerships ({ownerships.length})
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300"
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Bookings ({bookings.length})
            </TabsTrigger>
          </TabsList>

          {/* Ownerships Tab */}
          <TabsContent value="ownerships">
            <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Pending Ownerships</CardTitle>
                <CardDescription className="text-cyan-100/60">
                  Review and approve ownership entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ownerships.length === 0 ? (
                  <p className="py-8 text-center text-cyan-100/60">
                    No pending ownership approvals
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                          <TableHead className="text-cyan-100">Date</TableHead>
                          <TableHead className="text-cyan-100">Created By</TableHead>
                          <TableHead className="text-cyan-100">Owner</TableHead>
                          <TableHead className="text-cyan-100">Collection</TableHead>
                          <TableHead className="text-cyan-100">Tier</TableHead>
                          <TableHead className="text-cyan-100">Amount</TableHead>
                          <TableHead className="text-right text-cyan-100">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ownerships.map((ownership) => (
                          <TableRow
                            key={ownership.id}
                            className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                          >
                            <TableCell className="text-cyan-100/70">
                              {new Date(ownership.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-orange-400" />
                                <span className="text-orange-300">
                                  {ownership.createdBy?.name ?? ownership.createdBy?.email ?? "Unknown"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-white">
                                  {ownership.user?.name ?? ownership.pendingInvestorName ?? "No name"}
                                </div>
                                <div className="text-sm text-cyan-100/60">
                                  {ownership.user?.email ?? ownership.pendingInvestorEmail}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white">
                              {ownership.pricingTier?.collection?.name ?? "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-400/20 text-blue-300">
                                {ownership.pricingTier?.displayLabel ?? "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-green-400">
                              ${ownership.purchasePrice} {ownership.currency}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOwnership(ownership.id);
                                    setShowApproveOwnershipDialog(true);
                                  }}
                                  className="bg-green-500 hover:bg-green-600"
                                >
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOwnership(ownership.id);
                                    setShowRejectOwnershipDialog(true);
                                  }}
                                  className="border-red-400/30 text-red-400 hover:bg-red-400/10"
                                >
                                  <XCircle className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Pending Bookings</CardTitle>
                <CardDescription className="text-cyan-100/60">
                  Review and approve booking entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="py-8 text-center text-cyan-100/60">
                    No pending booking approvals
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                          <TableHead className="text-cyan-100">Date</TableHead>
                          <TableHead className="text-cyan-100">Created By</TableHead>
                          <TableHead className="text-cyan-100">Guest</TableHead>
                          <TableHead className="text-cyan-100">Collection</TableHead>
                          <TableHead className="text-cyan-100">Dates</TableHead>
                          <TableHead className="text-cyan-100">Total</TableHead>
                          <TableHead className="text-right text-cyan-100">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking) => (
                          <TableRow
                            key={booking.id}
                            className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                          >
                            <TableCell className="text-cyan-100/70">
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-orange-400" />
                                <span className="text-orange-300">
                                  {booking.createdBy?.name ?? booking.createdBy?.email ?? "Unknown"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-white">
                                  {booking.guestName}
                                </div>
                                <div className="text-sm text-cyan-100/60">
                                  {booking.guestEmail}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white">
                              {booking.collection?.name ?? "Unknown"}
                            </TableCell>
                            <TableCell className="text-cyan-100/70">
                              <div className="text-sm">
                                <div>{booking.checkIn}</div>
                                <div className="text-cyan-100/40">to</div>
                                <div>{booking.checkOut}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-green-400">
                              ${booking.totalPrice} {booking.currency}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    approveBooking.mutate({ bookingId: booking.id });
                                  }}
                                  disabled={approveBooking.isPending}
                                  className="bg-green-500 hover:bg-green-600"
                                >
                                  {approveBooking.isPending ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking.id);
                                    setShowRejectBookingDialog(true);
                                  }}
                                  className="border-red-400/30 text-red-400 hover:bg-red-400/10"
                                >
                                  <XCircle className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Approve Ownership Dialog */}
      <Dialog open={showApproveOwnershipDialog} onOpenChange={setShowApproveOwnershipDialog}>
        <DialogContent className="border-cyan-400/20 bg-[#0d1f31]">
          <DialogHeader>
            <DialogTitle className="text-white">Approve Ownership</DialogTitle>
            <DialogDescription className="text-cyan-100/60">
              Select a unit to allocate for this ownership
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-cyan-100">Select Unit</Label>
              <Select
                value={selectedUnitId?.toString() ?? ""}
                onValueChange={(value) => setSelectedUnitId(parseInt(value))}
              >
                <SelectTrigger className="border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {collectionUnits.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-cyan-100/60">
                      No units available for this collection
                    </div>
                  ) : (
                    collectionUnits
                      .filter((unit) => unit.id != null && unit.id > 0)
                      .map((unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveOwnershipDialog(false);
                setSelectedOwnership(null);
                setSelectedUnitId(null);
              }}
              className="border-cyan-400/30 text-cyan-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedOwnership && selectedUnitId) {
                  approveOwnership.mutate({
                    ownershipId: selectedOwnership,
                    unitId: selectedUnitId,
                  });
                }
              }}
              disabled={!selectedUnitId || approveOwnership.isPending}
              className="bg-green-500 hover:bg-green-600"
            >
              {approveOwnership.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Approve Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Ownership Dialog */}
      <Dialog open={showRejectOwnershipDialog} onOpenChange={setShowRejectOwnershipDialog}>
        <DialogContent className="border-cyan-400/20 bg-[#0d1f31]">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Ownership</DialogTitle>
            <DialogDescription className="text-cyan-100/60">
              Provide a reason for rejecting this ownership entry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-cyan-100">Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="min-h-[100px] border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectOwnershipDialog(false);
                setSelectedOwnership(null);
                setRejectionReason("");
              }}
              className="border-cyan-400/30 text-cyan-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedOwnership && rejectionReason) {
                  rejectOwnership.mutate({
                    ownershipId: selectedOwnership,
                    reason: rejectionReason,
                  });
                }
              }}
              disabled={!rejectionReason || rejectOwnership.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {rejectOwnership.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reject Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Booking Dialog */}
      <Dialog open={showRejectBookingDialog} onOpenChange={setShowRejectBookingDialog}>
        <DialogContent className="border-cyan-400/20 bg-[#0d1f31]">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Booking</DialogTitle>
            <DialogDescription className="text-cyan-100/60">
              Provide a reason for rejecting this booking entry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-cyan-100">Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="min-h-[100px] border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectBookingDialog(false);
                setSelectedBooking(null);
                setRejectionReason("");
              }}
              className="border-cyan-400/30 text-cyan-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedBooking && rejectionReason) {
                  rejectBooking.mutate({
                    bookingId: selectedBooking,
                    reason: rejectionReason,
                  });
                }
              }}
              disabled={!rejectionReason || rejectBooking.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {rejectBooking.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reject Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
