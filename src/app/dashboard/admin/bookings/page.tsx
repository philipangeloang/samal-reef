import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { BookingsClient } from "./_components/bookings-client";

export default async function AdminBookingsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [bookingsData, collectionsData] = await Promise.all([
    api.booking.getAllBookings({ limit: 50 }),
    api.collection.getAll(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Bookings
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Manage resort bookings and reservations
        </p>
      </div>

      <BookingsClient
        initialBookings={bookingsData.bookings}
        initialTotal={bookingsData.total}
        collections={collectionsData}
      />
    </div>
  );
}
