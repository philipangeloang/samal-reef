"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CalendarDays, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

export function SubmissionsClient() {
  const { data, isLoading, error } = api.staffEntry.getMySubmissions.useQuery();

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
            Failed to load submissions: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (approvalStatus: string | null, bookingStatus?: string | null) => {
    // For bookings, show cancelled status first if applicable
    if (bookingStatus === "CANCELLED") {
      return (
        <Badge className="bg-red-400/20 text-red-300">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
    }

    switch (approvalStatus) {
      case "PENDING_APPROVAL":
        return (
          <Badge className="bg-orange-400/20 text-orange-300">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-400/20 text-green-300">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-400/20 text-red-300">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-400/20 text-gray-300">Unknown</Badge>
        );
    }
  };

  const ownerships = data?.ownerships ?? [];
  const bookings = data?.bookings ?? [];

  return (
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
            <CardTitle className="text-white">Ownership Submissions</CardTitle>
            <CardDescription className="text-cyan-100/60">
              Your ownership entries and their approval status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ownerships.length === 0 ? (
              <p className="py-8 text-center text-cyan-100/60">
                No ownership submissions yet
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                      <TableHead className="text-cyan-100">Date</TableHead>
                      <TableHead className="text-cyan-100">Owner</TableHead>
                      <TableHead className="text-cyan-100">Collection</TableHead>
                      <TableHead className="text-cyan-100">Tier</TableHead>
                      <TableHead className="text-cyan-100">Amount</TableHead>
                      <TableHead className="text-cyan-100">Status</TableHead>
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
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(ownership.approvalStatus, null)}
                            {ownership.approvalStatus === "REJECTED" &&
                              ownership.rejectionReason && (
                                <p className="text-xs text-red-300">
                                  {ownership.rejectionReason}
                                </p>
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
      </TabsContent>

      {/* Bookings Tab */}
      <TabsContent value="bookings">
        <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Booking Submissions</CardTitle>
            <CardDescription className="text-cyan-100/60">
              Your booking entries and their approval status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="py-8 text-center text-cyan-100/60">
                No booking submissions yet
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-cyan-400/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-400/20 bg-[#0a1929]/50 hover:bg-[#0a1929]/70">
                      <TableHead className="text-cyan-100">Date</TableHead>
                      <TableHead className="text-cyan-100">Guest</TableHead>
                      <TableHead className="text-cyan-100">Collection</TableHead>
                      <TableHead className="text-cyan-100">Dates</TableHead>
                      <TableHead className="text-cyan-100">Total</TableHead>
                      <TableHead className="text-cyan-100">Status</TableHead>
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
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(booking.approvalStatus, booking.status)}
                            {(booking.approvalStatus === "REJECTED" || booking.status === "CANCELLED") &&
                              booking.cancellationReason && (
                                <p className="text-xs text-red-300">
                                  {booking.cancellationReason}
                                </p>
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
      </TabsContent>
    </Tabs>
  );
}
