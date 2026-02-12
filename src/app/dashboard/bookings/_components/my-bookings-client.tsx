"use client";

import { currencySymbol } from "@/lib/currency";
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
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

type Booking = RouterOutputs["booking"]["getMyBookings"][number];

interface MyBookingsClientProps {
  initialBookings: Booking[];
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  PENDING_PAYMENT: {
    label: "Pending Payment",
    className: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30",
    icon: <Clock className="mr-1 h-3 w-3" />,
  },
  PAYMENT_RECEIVED: {
    label: "Processing",
    className: "bg-blue-400/20 text-blue-300 border-blue-400/30",
    icon: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-green-400/20 text-green-300 border-green-400/30",
    icon: <CheckCircle2 className="mr-1 h-3 w-3" />,
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
    icon: <CheckCircle2 className="mr-1 h-3 w-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-400/20 text-red-300 border-red-400/30",
    icon: <XCircle className="mr-1 h-3 w-3" />,
  },
};

export function MyBookingsClient({ initialBookings }: MyBookingsClientProps) {
  const { data: bookings = initialBookings } = api.booking.getMyBookings.useQuery(
    undefined,
    {
      initialData: initialBookings,
      refetchOnMount: false,
    }
  );

  // Calculate stats
  const upcomingCount = bookings.filter(
    (b) => b.status === "CONFIRMED" && new Date(b.checkIn) > new Date()
  ).length;
  const completedCount = bookings.filter((b) => b.status === "COMPLETED").length;
  const pendingCount = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT" || b.status === "PAYMENT_RECEIVED"
  ).length;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-400/10 blur-2xl transition-all group-hover:bg-green-400/20" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-cyan-100/60">
                Upcoming
              </CardDescription>
              <div className="rounded-full bg-green-400/10 p-2">
                <CalendarDays className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              {upcomingCount}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl transition-all group-hover:bg-cyan-400/20" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-cyan-100/60">
                Completed
              </CardDescription>
              <div className="rounded-full bg-cyan-400/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              {completedCount}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="group relative overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-400/10 blur-2xl transition-all group-hover:bg-yellow-400/20" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-cyan-100/60">
                Pending
              </CardDescription>
              <div className="rounded-full bg-yellow-400/10 p-2">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              {pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-cyan-400/10 p-2">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-white">Booking History</CardTitle>
              <CardDescription className="text-cyan-100/60">
                All your past and upcoming reservations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-cyan-400/20 bg-[#0a1929]/30 py-12">
              <CalendarDays className="mb-3 h-12 w-12 text-cyan-400/50" />
              <p className="text-center text-cyan-100/60">
                No bookings yet. Start by booking your first stay!
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-cyan-400/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                    <TableHead className="text-cyan-100">Property</TableHead>
                    <TableHead className="text-cyan-100">Unit(s)</TableHead>
                    <TableHead className="text-cyan-100">Check-in</TableHead>
                    <TableHead className="text-cyan-100">Check-out</TableHead>
                    <TableHead className="text-cyan-100">Guests</TableHead>
                    <TableHead className="text-cyan-100">Total</TableHead>
                    <TableHead className="text-cyan-100">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => {
                    const status = statusConfig[booking.status] ?? {
                      label: booking.status,
                      className: "bg-gray-400/20 text-gray-300",
                      icon: null,
                    };

                    const checkInDate = new Date(booking.checkIn);
                    const checkOutDate = new Date(booking.checkOut);
                    const isUpcoming = checkInDate > new Date() && booking.status === "CONFIRMED";

                    return (
                      <TableRow
                        key={booking.id}
                        className="border-cyan-400/10 transition-colors hover:bg-cyan-400/5"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-cyan-400" />
                            <span className="font-medium text-white">
                              {booking.collection}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const unitNames = booking.unit.split(", ");
                            if (unitNames.length <= 1) {
                              return <span className="text-cyan-100/70">{booking.unit}</span>;
                            }
                            return (
                              <div className="flex items-center gap-1.5" title={booking.unit}>
                                <span className="text-cyan-100/70">{unitNames[0]}</span>
                                <span className="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">
                                  +{unitNames.length - 1} more
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="text-cyan-100/70">
                            {checkInDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-cyan-100/70">
                            {checkOutDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-cyan-100/70">
                            <Users className="h-4 w-4" />
                            {booking.guests}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-green-400">
                          {currencySymbol}{parseFloat(booking.totalPrice).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.className} ${isUpcoming ? "animate-pulse" : ""}`}>
                            {status.icon}
                            {status.label}
                          </Badge>
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
