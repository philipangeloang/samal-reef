import { notFound } from "next/navigation";
import { api } from "@/trpc/server";
import { BookingClient } from "./_components/booking-client";

interface BookingPageProps {
  params: Promise<{
    collectionId: string;
  }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { collectionId } = await params;
  const id = parseInt(collectionId, 10);

  if (isNaN(id)) {
    notFound();
  }

  // Get collection details
  const collection = await api.collection.getById({ id }).catch(() => null);

  if (!collection || !collection.isActive) {
    notFound();
  }

  // Calculate date range for availability (today to 365 days ahead)
  // Use local date formatting to avoid timezone issues
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 365);

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startDate = formatLocalDate(today);
  const endDate = formatLocalDate(futureDate);

  // Get initial availability data and active discounts
  const [availability, allDiscounts] = await Promise.all([
    api.booking.getAvailability({
      collectionId: id,
      startDate,
      endDate,
    }),
    api.collection.getDiscounts({ collectionId: id }),
  ]);

  // Pass only active "ALWAYS" discounts to the booking page
  // (conditional discounts are evaluated at checkout when dates are known)
  const alwaysDiscounts = allDiscounts
    .filter((d) => d.isActive && d.conditionType === "ALWAYS")
    .map((d) => ({ percent: parseFloat(d.percent), label: d.label }));

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      <BookingClient
        collection={{
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          description: collection.description,
          imageUrl: collection.imageUrl,
          location: collection.location,
          maxGuestsPerUnit: collection.bookingMaxGuests ?? 6,
        }}
        initialAvailability={availability}
        discounts={alwaysDiscounts.length > 0 ? alwaysDiscounts : undefined}
      />
    </div>
  );
}
