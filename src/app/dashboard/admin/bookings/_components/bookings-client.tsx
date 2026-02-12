"use client";

import { useState, useCallback, useMemo } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { BookingDatePicker } from "@/components/booking/booking-date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Clock,
  CalendarDays,
  Users,
  Plane,
  AlertTriangle,
  Plus,
  Check,
} from "lucide-react";
import { currencySymbol } from "@/lib/currency";

type Booking = RouterOutputs["booking"]["getAllBookings"]["bookings"][number];
type Collection = RouterOutputs["collection"]["getAll"][number];

interface BookingsClientProps {
  initialBookings: Booking[];
  initialTotal: number;
  collections: Collection[];
}

const statusColors: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  PAYMENT_RECEIVED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  CONFIRMED: "bg-green-500/20 text-green-300 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-300 border-red-500/30",
  COMPLETED: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const sourceColors: Record<string, string> = {
  DIRECT: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  AIRBNB: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  BOOKING_COM: "bg-blue-600/20 text-blue-300 border-blue-500/30",
  SMOOBU: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  OTHER: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

const createdByColors: Record<string, string> = {
  PUBLIC: "bg-green-500/20 text-green-300 border-green-500/30",
  ADMIN: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  STAFF: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

export function BookingsClient({
  initialBookings,
  initialTotal,
  collections,
}: BookingsClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [createdByFilter, setCreatedByFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [bulkCancelDialogOpen, setBulkCancelDialogOpen] = useState(false);

  // Add booking modal state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    guestEmail: "",
    guestName: "",
    guestPhone: "",
    guestCountry: "",
    numberOfGuests: 1,
    collectionId: "",
    checkIn: "",
    checkOut: "",
    guestNotes: "",
    internalNotes: "",
  });
  const [pickerNights, setPickerNights] = useState(0);
  const [pickerEstimatedPrice, setPickerEstimatedPrice] = useState<number | null>(null);

  // Get selected collection and its pricing/discount settings
  const selectedCollection = collections.find((c) => c.id.toString() === addForm.collectionId);

  // Fetch discounts for the selected collection
  const { data: collectionDiscountsData } = api.collection.getDiscounts.useQuery(
    { collectionId: parseInt(addForm.collectionId) },
    { enabled: !!addForm.collectionId },
  );

  // Evaluate which discounts apply based on booking parameters
  const { discountPercent, activeDiscounts } = useMemo(() => {
    if (!collectionDiscountsData || collectionDiscountsData.length === 0) {
      return { discountPercent: 0, activeDiscounts: [] as { percent: number; label: string; conditionType: string }[] };
    }

    const activeOnes = collectionDiscountsData.filter((d) => d.isActive);
    if (activeOnes.length === 0) {
      return { discountPercent: 0, activeDiscounts: [] as { percent: number; label: string; conditionType: string }[] };
    }

    // Calculate total nights from form
    const nights = pickerNights > 0 ? pickerNights : (() => {
      if (!addForm.checkIn || !addForm.checkOut) return 0;
      const ci = new Date(addForm.checkIn);
      const co = new Date(addForm.checkOut);
      return Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
    })();

    const checkInDay = addForm.checkIn ? new Date(addForm.checkIn + "T00:00:00").getDay() : -1;

    // Filter matching discounts
    const matching = activeOnes.filter((d) => {
      switch (d.conditionType) {
        case "ALWAYS": return true;
        case "MIN_NIGHTS": {
          const val = d.conditionValue ? (JSON.parse(d.conditionValue) as { minNights: number }) : null;
          return val ? nights >= val.minNights : false;
        }
        case "DATE_RANGE": {
          const val = d.conditionValue ? (JSON.parse(d.conditionValue) as { startDate: string; endDate: string }) : null;
          if (!val || !addForm.checkIn || !addForm.checkOut) return false;
          return addForm.checkIn < val.endDate && addForm.checkOut > val.startDate;
        }
        case "WEEKEND": return checkInDay === 5 || checkInDay === 6;
        default: return false;
      }
    });

    // Group by conditionType, pick highest percent per group
    const bestByType = new Map<string, { percent: number; label: string; conditionType: string }>();
    for (const d of matching) {
      const pct = parseFloat(d.percent);
      const existing = bestByType.get(d.conditionType);
      if (!existing || pct > existing.percent) {
        bestByType.set(d.conditionType, { percent: pct, label: d.label, conditionType: d.conditionType });
      }
    }

    const winners = Array.from(bestByType.values());
    const combined = winners.reduce((sum, d) => sum + d.percent, 0);

    return { discountPercent: combined, activeDiscounts: winners };
  }, [collectionDiscountsData, pickerNights, addForm.checkIn, addForm.checkOut]);

  // Calculate discounted nightly rate from collection settings
  const baseNightlyRate = selectedCollection?.bookingPricePerNight ?? "0";
  const nightlyRate = useMemo(() => {
    if (baseNightlyRate === "0") return "0";
    const base = parseFloat(baseNightlyRate);
    if (discountPercent > 0) {
      return (base * (1 - discountPercent / 100)).toFixed(2);
    }
    return baseNightlyRate;
  }, [baseNightlyRate, discountPercent]);

  // Handle date picker changes
  const handleDatePickerChange = useCallback((dates: {
    checkIn: string | null;
    checkOut: string | null;
    nights: number;
    estimatedPrice: number | null;
  }) => {
    setAddForm((prev) => ({
      ...prev,
      checkIn: dates.checkIn ?? "",
      checkOut: dates.checkOut ?? "",
    }));
    setPickerNights(dates.nights);
    setPickerEstimatedPrice(dates.estimatedPrice);
  }, []);

  const utils = api.useUtils();

  // Get bookings with filters
  const { data: bookingsData, isLoading } = api.booking.getAllBookings.useQuery(
    {
      status: statusFilter === "all" ? undefined : (statusFilter as Booking["status"]),
      source: sourceFilter === "all" ? undefined : (sourceFilter as Booking["source"]),
      createdBy: createdByFilter === "all" ? undefined : (createdByFilter as "ADMIN" | "STAFF" | "PUBLIC"),
      limit: 50,
    },
    {
      initialData: { bookings: initialBookings, total: initialTotal },
      refetchInterval: 30000,
    },
  );

  // Cancel mutation
  const cancelMutation = api.booking.cancelBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      setCancelDialogOpen(false);
      setSelectedBooking(null);
      setCancelReason("");
      utils.booking.getAllBookings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Approve mutation (for staff-created pending bookings)
  const approveMutation = api.staffEntry.approveBooking.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.booking.getAllBookings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Create booking mutation
  const createMutation = api.booking.adminCreateBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking created successfully");
      setAddDialogOpen(false);
      setAddForm({
        guestEmail: "",
        guestName: "",
        guestPhone: "",
        guestCountry: "",
        numberOfGuests: 1,
        collectionId: "",
        checkIn: "",
        checkOut: "",
        guestNotes: "",
        internalNotes: "",
      });
      setPickerNights(0);
      setPickerEstimatedPrice(null);
      utils.booking.getAllBookings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Bulk cancel stale bookings mutation
  const bulkCancelMutation = api.booking.bulkCancelStaleBookings.useMutation({
    onSuccess: (data) => {
      if (data.cancelledCount > 0) {
        toast.success(`Cancelled ${data.cancelledCount} stale booking${data.cancelledCount !== 1 ? "s" : ""}`);
      } else {
        toast.info("No stale bookings found to cancel");
      }
      setBulkCancelDialogOpen(false);
      utils.booking.getAllBookings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Count stale PENDING_PAYMENT bookings (older than 7 days, not staff approval)
  const stalePendingCount = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return (
      bookingsData?.bookings.filter(
        (b) =>
          b.status === "PENDING_PAYMENT" &&
          !b.approvalStatus &&
          new Date(b.createdAt) < sevenDaysAgo,
      ).length ?? 0
    );
  }, [bookingsData?.bookings]);

  // Get collection fees
  const cleaningFee = selectedCollection?.bookingCleaningFee ?? "0";
  const serviceFeePercent = parseFloat(selectedCollection?.bookingServiceFeePercent ?? "0");

  // Calculate pricing using picker nights or manual calculation as fallback
  const totalNights = pickerNights > 0 ? pickerNights : (() => {
    if (!addForm.checkIn || !addForm.checkOut) return 0;
    const checkIn = new Date(addForm.checkIn);
    const checkOut = new Date(addForm.checkOut);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  })();

  // Calculate totals with discount support
  const { subtotal, serviceFee, totalPrice, originalSubtotal, originalTotalPrice } = useMemo(() => {
    if (totalNights <= 0 || !nightlyRate || nightlyRate === "0") {
      return {
        subtotal: "0.00",
        serviceFee: "0.00",
        totalPrice: "0.00",
      };
    }

    const sub = parseFloat(nightlyRate) * totalNights;
    const svcFee = (sub * serviceFeePercent) / 100;
    const total = sub + parseFloat(cleaningFee || "0") + svcFee;

    let origSubtotal: string | undefined;
    let origTotal: string | undefined;
    if (discountPercent > 0) {
      const origSub = parseFloat(baseNightlyRate) * totalNights;
      const origSvcFee = (origSub * serviceFeePercent) / 100;
      origSubtotal = origSub.toFixed(2);
      origTotal = (origSub + parseFloat(cleaningFee || "0") + origSvcFee).toFixed(2);
    }

    return {
      subtotal: sub.toFixed(2),
      serviceFee: svcFee.toFixed(2),
      totalPrice: total.toFixed(2),
      originalSubtotal: origSubtotal,
      originalTotalPrice: origTotal,
    };
  }, [totalNights, nightlyRate, cleaningFee, serviceFeePercent, discountPercent, baseNightlyRate]);

  const handleCreateBooking = () => {
    if (!addForm.collectionId || !addForm.guestEmail || !addForm.guestName || !addForm.checkIn || !addForm.checkOut) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (totalNights <= 0) {
      toast.error("Check-out must be after check-in");
      return;
    }

    if (nightlyRate === "0") {
      toast.error("Collection does not have a nightly rate configured");
      return;
    }

    createMutation.mutate({
      guestEmail: addForm.guestEmail,
      guestName: addForm.guestName,
      guestPhone: addForm.guestPhone || undefined,
      guestCountry: addForm.guestCountry || undefined,
      numberOfGuests: addForm.numberOfGuests,
      collectionId: parseInt(addForm.collectionId),
      checkIn: addForm.checkIn,
      checkOut: addForm.checkOut,
      nightlyRate: nightlyRate,
      totalNights,
      cleaningFee: cleaningFee,
      serviceFee: serviceFee,
      totalPrice: totalPrice,
      guestNotes: addForm.guestNotes || undefined,
      internalNotes: addForm.internalNotes || undefined,
    });
  };

  const handleCancel = () => {
    if (!selectedBooking) return;
    cancelMutation.mutate({
      bookingId: selectedBooking.id,
      reason: cancelReason.trim() || undefined,
    });
  };

  const openDetailsDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailsDialogOpen(true);
  };

  const openCancelDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  // Calculate stats
  const confirmedCount = bookingsData?.bookings.filter((b) => b.status === "CONFIRMED").length ?? 0;
  const pendingCount = bookingsData?.bookings.filter((b) => b.status === "PENDING_PAYMENT" || b.status === "PAYMENT_RECEIVED").length ?? 0;
  const pendingApprovalCount = bookingsData?.bookings.filter((b) => b.approvalStatus === "PENDING_APPROVAL").length ?? 0;
  const externalCount = bookingsData?.bookings.filter((b) => b.source !== "DIRECT" && b.source !== "OTHER").length ?? 0;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100/70">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-cyan-400" />
              <span className="text-3xl font-bold text-white">
                {bookingsData?.total ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100/70">
              Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <span className="text-3xl font-bold text-white">{confirmedCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100/70">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-400" />
              <span className="text-3xl font-bold text-white">{pendingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-100/70">
              Needs Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-400" />
              <span className="text-3xl font-bold text-white">{pendingApprovalCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-cyan-500 text-white hover:bg-cyan-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Booking
            </Button>
            {stalePendingCount > 0 && (
              <Button
                variant="outline"
                onClick={() => setBulkCancelDialogOpen(true)}
                className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Stale ({stalePendingCount})
              </Button>
            )}
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-cyan-500/30 bg-gray-900/50">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
                  <SelectItem value="PAYMENT_RECEIVED">Payment Received</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="border-cyan-500/30 bg-gray-900/50">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="DIRECT">Direct</SelectItem>
                  <SelectItem value="AIRBNB">Airbnb</SelectItem>
                  <SelectItem value="BOOKING_COM">Booking.com</SelectItem>
                  <SelectItem value="SMOOBU">Smoobu</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                <SelectTrigger className="border-cyan-500/30 bg-gray-900/50">
                  <SelectValue placeholder="Filter by creator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  <SelectItem value="PUBLIC">Public Booking</SelectItem>
                  <SelectItem value="ADMIN">Admin Created</SelectItem>
                  <SelectItem value="STAFF">Staff Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="border-cyan-500/20 bg-gradient-to-br from-gray-900/80 to-gray-950/80">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : !bookingsData?.bookings.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="mb-3 h-12 w-12 text-cyan-500/50" />
              <p className="text-cyan-100/60">No bookings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyan-500/20 hover:bg-transparent">
                    <TableHead className="text-cyan-100">Guest</TableHead>
                    <TableHead className="text-cyan-100">Property</TableHead>
                    <TableHead className="text-cyan-100">Dates</TableHead>
                    <TableHead className="text-cyan-100">Guests</TableHead>
                    <TableHead className="text-cyan-100">Total</TableHead>
                    <TableHead className="text-cyan-100">Status</TableHead>
                    <TableHead className="text-cyan-100">Source</TableHead>
                    <TableHead className="text-cyan-100">Created By</TableHead>
                    <TableHead className="text-cyan-100">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingsData.bookings.map((booking) => (
                    <TableRow
                      key={booking.id}
                      className="border-cyan-500/10 hover:bg-cyan-500/5"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{booking.guestName}</p>
                          <p className="text-xs text-cyan-100/60">{booking.guestEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-cyan-100">{booking.collection}</p>
                          {booking.unit && (() => {
                            const unitNames = booking.unit.split(", ");
                            if (unitNames.length <= 1) {
                              return <p className="text-xs text-cyan-100/60">Unit: {booking.unit}</p>;
                            }
                            return (
                              <div className="flex items-center gap-1.5" title={booking.unit}>
                                <p className="text-xs text-cyan-100/60">Units: {unitNames[0]}</p>
                                <span className="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">
                                  +{unitNames.length - 1}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-cyan-100">
                            {new Date(booking.checkIn).toLocaleDateString()}
                          </p>
                          <p className="text-cyan-100/60">
                            to {new Date(booking.checkOut).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-cyan-100">
                          <Users className="h-4 w-4" />
                          {booking.guests}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-400">
                          {currencySymbol}{parseFloat(booking.totalPrice).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={statusColors[booking.status]}>
                            {booking.status.replace("_", " ")}
                          </Badge>
                          {booking.approvalStatus === "PENDING_APPROVAL" && (
                            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                              Needs Approval
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={sourceColors[booking.source]}>
                          {booking.source.replace("_", ".")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Badge className={createdByColors[booking.createdByType]}>
                            {booking.createdByType}
                          </Badge>
                          {booking.createdBy && (
                            <span className="mt-1 text-xs text-cyan-100/50">
                              {booking.createdBy.name ?? booking.createdBy.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetailsDialog(booking)}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Approve button for pending staff submissions */}
                          {booking.approvalStatus === "PENDING_APPROVAL" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => approveMutation.mutate({ bookingId: booking.id })}
                              disabled={approveMutation.isPending}
                              className="text-green-400 hover:text-green-300"
                              title="Approve booking"
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openCancelDialog(booking)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-cyan-100">Booking Details</DialogTitle>
            <DialogDescription>
              Full details for this booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-cyan-100/60">Guest Name</p>
                  <p className="text-cyan-100">{selectedBooking.guestName}</p>
                </div>
                <div>
                  <p className="text-sm text-cyan-100/60">Guest Email</p>
                  <p className="text-cyan-100">{selectedBooking.guestEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-cyan-100/60">Phone</p>
                  <p className="text-cyan-100">{selectedBooking.guestPhone ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-cyan-100/60">Number of Guests</p>
                  <p className="text-cyan-100">{selectedBooking.guests}</p>
                </div>
                <div>
                  <p className="text-sm text-cyan-100/60">Check-in</p>
                  <p className="text-cyan-100">
                    {new Date(selectedBooking.checkIn).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-cyan-100/60">Check-out</p>
                  <p className="text-cyan-100">
                    {new Date(selectedBooking.checkOut).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-cyan-100/60">Property</p>
                  <p className="text-cyan-100">{selectedBooking.collection}</p>
                </div>
                <div>
                  <p className="text-sm text-cyan-100/60">
                    {selectedBooking.unit?.includes(",") ? "Units" : "Unit"}
                  </p>
                  <p className="text-cyan-100">{selectedBooking.unit ?? "Pending assignment"}</p>
                </div>
                <div>
                  <p className="text-sm text-cyan-100/60">Total Price</p>
                  <p className="text-lg font-bold text-green-400">
                    {currencySymbol}{parseFloat(selectedBooking.totalPrice).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-cyan-100/60">Smoobu Reservation</p>
                  <p className="text-cyan-100">
                    {selectedBooking.smoobuReservationId
                      ? `#${selectedBooking.smoobuReservationId}`
                      : selectedBooking.status === "CONFIRMED"
                        ? "Failed to submit"
                        : "Pending confirmation"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={statusColors[selectedBooking.status]}>
                  {selectedBooking.status.replace("_", " ")}
                </Badge>
                <Badge className={sourceColors[selectedBooking.source]}>
                  {selectedBooking.source.replace("_", ".")}
                </Badge>
              </div>
              {selectedBooking.cancellationReason && (
                <div className="rounded-lg bg-red-500/10 p-3 border border-red-500/20">
                  <p className="text-sm text-red-400">
                    <strong>Cancellation Reason:</strong> {selectedBooking.cancellationReason}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              This will cancel the booking and notify the guest. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="border-cyan-500/30 bg-gray-900/50"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Cancel Stale Dialog */}
      <Dialog open={bulkCancelDialogOpen} onOpenChange={setBulkCancelDialogOpen}>
        <DialogContent className="border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Cancel Stale Bookings
            </DialogTitle>
            <DialogDescription>
              This will cancel all PENDING_PAYMENT bookings older than 7 days that are not awaiting staff approval. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
            {stalePendingCount} stale booking{stalePendingCount !== 1 ? "s" : ""} found in the current view. The actual count may differ as the server will cancel all matching bookings across all pages.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkCancelDialogOpen(false)}
              disabled={bulkCancelMutation.isPending}
            >
              Keep Bookings
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkCancelMutation.mutate()}
              disabled={bulkCancelMutation.isPending}
            >
              {bulkCancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel All Stale"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Booking Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-cyan-500/20 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-100">
              <Plus className="h-5 w-5" />
              Add New Booking
            </DialogTitle>
            <DialogDescription>
              Create a new booking. This will be auto-confirmed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Collection Selection */}
            <div className="space-y-2">
              <Label className="text-cyan-100">Collection *</Label>
              <Select
                value={addForm.collectionId}
                onValueChange={(value) => setAddForm({ ...addForm, collectionId: value })}
              >
                <SelectTrigger className="w-full border-cyan-500/30 bg-gray-900/50">
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

            {/* Guest Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-cyan-100">Guest Name *</Label>
                <Input
                  value={addForm.guestName}
                  onChange={(e) => setAddForm({ ...addForm, guestName: e.target.value })}
                  placeholder="John Doe"
                  className="border-cyan-500/30 bg-gray-900/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-cyan-100">Guest Email *</Label>
                <Input
                  type="email"
                  value={addForm.guestEmail}
                  onChange={(e) => setAddForm({ ...addForm, guestEmail: e.target.value })}
                  placeholder="john@example.com"
                  className="border-cyan-500/30 bg-gray-900/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-cyan-100">Phone</Label>
                <Input
                  value={addForm.guestPhone}
                  onChange={(e) => setAddForm({ ...addForm, guestPhone: e.target.value })}
                  placeholder="+1234567890"
                  className="border-cyan-500/30 bg-gray-900/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-cyan-100">Country</Label>
                <Input
                  value={addForm.guestCountry}
                  onChange={(e) => setAddForm({ ...addForm, guestCountry: e.target.value })}
                  placeholder="United States"
                  className="border-cyan-500/30 bg-gray-900/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-cyan-100">Number of Guests</Label>
              <Input
                type="number"
                min={1}
                value={addForm.numberOfGuests}
                onChange={(e) => setAddForm({ ...addForm, numberOfGuests: parseInt(e.target.value) || 1 })}
                className="border-cyan-500/30 bg-gray-900/50"
              />
            </div>

            {/* Date Picker - Shows availability calendar */}
            {addForm.collectionId && (
              <div className="rounded-lg border border-cyan-500/20 bg-gray-900/30 p-4">
                <BookingDatePicker
                  collectionId={parseInt(addForm.collectionId)}
                  onDateChange={handleDatePickerChange}
                  compact={true}
                  showLegend={true}
                />
              </div>
            )}
            {!addForm.collectionId && (
              <div className="rounded-lg border border-cyan-500/20 bg-gray-900/30 p-4 text-center text-cyan-100/60">
                Select a collection to view availability calendar
              </div>
            )}

            {/* Pricing Summary */}
            {addForm.collectionId && totalNights > 0 && nightlyRate !== "0" && (
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                <h4 className="mb-2 font-medium text-cyan-100">Pricing Summary</h4>

                {/* Discount Badges */}
                {activeDiscounts.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {activeDiscounts.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          {d.percent}% OFF
                        </Badge>
                        <span className="text-sm text-green-400">{d.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1 text-sm text-cyan-100/70">
                  <div className="flex justify-between">
                    <span>
                      {currencySymbol}{nightlyRate} × {totalNights} nights
                      {discountPercent > 0 && (
                        <span className="ml-2 text-cyan-100/50 line-through">
                          {currencySymbol}{baseNightlyRate}
                        </span>
                      )}
                    </span>
                    <span>
                      {currencySymbol}{subtotal}
                      {originalSubtotal && (
                        <span className="ml-2 text-cyan-100/50 line-through">
                          {currencySymbol}{originalSubtotal}
                        </span>
                      )}
                    </span>
                  </div>
                  {parseFloat(cleaningFee) > 0 && (
                    <div className="flex justify-between">
                      <span>Cleaning fee</span>
                      <span>{currencySymbol}{cleaningFee}</span>
                    </div>
                  )}
                  {parseFloat(serviceFee) > 0 && (
                    <div className="flex justify-between">
                      <span>Service fee ({serviceFeePercent}%)</span>
                      <span>{currencySymbol}{serviceFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-cyan-500/20 pt-1 font-semibold text-green-400">
                    <span>Total</span>
                    <span>
                      {currencySymbol}{totalPrice}
                      {originalTotalPrice && (
                        <span className="ml-2 text-cyan-100/50 line-through font-normal">
                          {currencySymbol}{originalTotalPrice}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* No pricing configured warning */}
            {addForm.collectionId && nightlyRate === "0" && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-300 text-sm">
                This collection does not have booking pricing configured. Please configure pricing in collection settings.
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-cyan-100">Guest Notes</Label>
              <Textarea
                value={addForm.guestNotes}
                onChange={(e) => setAddForm({ ...addForm, guestNotes: e.target.value })}
                placeholder="Special requests from guest..."
                className="border-cyan-500/30 bg-gray-900/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-cyan-100">Internal Notes</Label>
              <Textarea
                value={addForm.internalNotes}
                onChange={(e) => setAddForm({ ...addForm, internalNotes: e.target.value })}
                placeholder="Internal notes (not visible to guest)..."
                className="border-cyan-500/30 bg-gray-900/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBooking}
              disabled={createMutation.isPending}
              className="bg-cyan-500 text-white hover:bg-cyan-600"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
