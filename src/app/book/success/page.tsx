import Link from "next/link";
import { currencySymbol } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Calendar, MapPin, Users, Home } from "lucide-react";
import { db } from "@/server/db";
import { bookings } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface BookingSuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
    booking_id?: string;
    tx_hash?: string;
  }>;
}

export default async function BookingSuccessPage({
  searchParams,
}: BookingSuccessPageProps) {
  const { session_id, booking_id, tx_hash } = await searchParams;

  // Try to get booking details
  let bookingDetails = null;
  const bookingId = booking_id ? parseInt(booking_id, 10) : null;

  if (bookingId && !isNaN(bookingId)) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: {
        collection: true,
        assignedUnits: {
          with: {
            unit: true,
          },
        },
      },
    });

    if (booking) {
      const unitNames = booking.assignedUnits.map((bu) => bu.unit.name).join(", ") || "Pending assignment";

      bookingDetails = {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        collectionName: booking.collection.name,
        unitName: unitNames,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.numberOfGuests,
        totalPrice: booking.totalPrice,
        status: booking.status,
      };
    }
  }

  // Parse date string without timezone conversion (avoids off-by-one day bug)
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year!, month! - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a1929] to-[#0f2435] p-4">
      <Card className="w-full max-w-lg border-cyan-400/30 bg-[#0d1f31]/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <CardTitle className="text-2xl text-white">
            Booking Confirmed!
          </CardTitle>
          <CardDescription className="text-cyan-100/70">
            Your reservation has been successfully processed
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Booking Details */}
          {bookingDetails ? (
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
              <h3 className="mb-4 font-semibold text-white">
                Reservation Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Home className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                  <div>
                    <p className="text-sm text-cyan-300/70">Property</p>
                    <p className="font-medium text-white">
                      {bookingDetails.collectionName}
                    </p>
                    {bookingDetails.unitName !== "Pending assignment" && (
                      <p className="text-sm text-cyan-100/70">
                        {bookingDetails.unitName.includes(",") ? "Units" : "Unit"}: {bookingDetails.unitName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                  <div>
                    <p className="text-sm text-cyan-300/70">Dates</p>
                    <p className="font-medium text-white">
                      {formatDate(bookingDetails.checkIn)}
                    </p>
                    <p className="text-sm text-cyan-100/70">
                      to {formatDate(bookingDetails.checkOut)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                  <div>
                    <p className="text-sm text-cyan-300/70">Guests</p>
                    <p className="font-medium text-white">
                      {bookingDetails.guests} guest{bookingDetails.guests !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="border-t border-cyan-400/20 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300/70">Total Paid</span>
                    <span className="text-xl font-bold text-white">
                      {currencySymbol}{parseFloat(bookingDetails.totalPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 text-center">
              <p className="text-cyan-100/70">
                Your booking has been confirmed. Check your email for details.
              </p>
            </div>
          )}

          {/* Transaction Hash (for crypto payments) */}
          {tx_hash && (
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
              <p className="mb-2 text-sm text-cyan-300/70">Transaction Hash</p>
              <a
                href={`https://arbiscan.io/tx/${tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-mono text-xs text-cyan-400 hover:text-cyan-300"
              >
                {tx_hash}
              </a>
            </div>
          )}

          {/* Session ID (for Stripe payments) */}
          {session_id && (
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
              <p className="mb-2 text-sm text-cyan-300/70">Payment Reference</p>
              <p className="break-all font-mono text-xs text-cyan-100/50">
                {session_id}
              </p>
            </div>
          )}

          {/* Next Steps */}
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
            <h3 className="mb-2 font-semibold text-white">What&apos;s Next?</h3>
            <ul className="space-y-2 text-sm text-cyan-100/70">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                <span>Check your email for confirmation details</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                <span>You'll receive check-in instructions before your arrival</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                <span>Contact us if you have any questions</span>
              </li>
            </ul>
          </div>

          {/* Confirmation Message */}
          <div className="rounded-lg border border-green-400/30 bg-green-400/10 p-4">
            <p className="text-center text-sm text-green-100">
              A confirmation email has been sent to{" "}
              <strong>{bookingDetails?.guestEmail ?? "your email address"}</strong>
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex gap-4">
          <Button asChild className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500">
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10">
            <Link href="/book">Book Another Stay</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
