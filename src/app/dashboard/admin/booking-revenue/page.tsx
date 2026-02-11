import { BookingRevenueClient } from "./_components/booking-revenue-client";

export const metadata = {
  title: "Booking Revenue | Admin",
  description: "View booking revenue per unit from Smoobu",
};

export default function BookingRevenuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Booking Revenue</h1>
        <p className="text-cyan-100/60">
          Monthly and yearly revenue per unit from Smoobu bookings
        </p>
      </div>
      <BookingRevenueClient />
    </div>
  );
}
