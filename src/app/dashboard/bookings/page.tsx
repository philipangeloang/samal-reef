import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { MyBookingsClient } from "./_components/my-bookings-client";

export default async function MyBookingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const bookings = await api.booking.getMyBookings();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          My Bookings
        </h1>
        <p className="mt-2 text-cyan-100/70">
          View and manage your booking reservations
        </p>
      </div>

      <MyBookingsClient initialBookings={bookings} />
    </div>
  );
}
