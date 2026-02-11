import { redirect, notFound } from "next/navigation";
import { api } from "@/trpc/server";
import { CheckoutClient } from "./_components/checkout-client";

interface CheckoutPageProps {
  params: Promise<{
    collectionId: string;
  }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  }>;
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { collectionId } = await params;
  const { checkIn, checkOut, guests } = await searchParams;
  const id = parseInt(collectionId, 10);

  // Validate params
  if (isNaN(id) || !checkIn || !checkOut) {
    redirect(`/book/${collectionId}`);
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(checkIn) || !dateRegex.test(checkOut)) {
    redirect(`/book/${collectionId}`);
  }

  // Get collection details
  const collection = await api.collection.getById({ id }).catch(() => null);

  if (!collection || !collection.isActive) {
    notFound();
  }

  // Check pricing and availability
  const pricing = await api.booking.checkPricing({
    collectionId: id,
    checkIn,
    checkOut,
    guests: parseInt(guests ?? "2", 10),
  });

  if (!pricing.available) {
    redirect(`/book/${collectionId}?error=unavailable`);
  }

  // Get manual payment methods
  const manualPaymentMethods = await api.manualPayment.getMethods().catch(() => []);

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435]">
      <CheckoutClient
        collection={{
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          imageUrl: collection.imageUrl,
          location: collection.location,
        }}
        bookingDetails={{
          checkIn,
          checkOut,
          guests: parseInt(guests ?? "2", 10),
        }}
        pricing={{
          nightlyRate: pricing.nightlyRate ?? 0,
          originalNightlyRate: pricing.originalNightlyRate,
          totalNights: pricing.totalNights ?? 0,
          subtotal: pricing.subtotal ?? 0,
          originalSubtotal: pricing.originalSubtotal,
          cleaningFee: pricing.cleaningFee ?? 0,
          serviceFee: pricing.serviceFee ?? 0,
          totalPrice: pricing.totalPrice ?? 0,
          originalTotalPrice: pricing.originalTotalPrice,
          availableUnits: pricing.availableUnits ?? 0,
          discountPercent: pricing.discountPercent,
          discountLabel: pricing.discountLabel,
          discounts: pricing.discounts,
          unitsRequired: pricing.unitsRequired ?? 1,
          maxGuestsPerUnit: pricing.maxGuests ?? 6,
        }}
        manualPaymentMethods={manualPaymentMethods.map((m) => ({
          id: m.id,
          name: m.name,
        }))}
      />
    </div>
  );
}
