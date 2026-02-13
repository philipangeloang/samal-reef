"use client";

import { useState, useCallback } from "react";
import { currencySymbol } from "@/lib/currency";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Users,
  Loader2,
  Info,
} from "lucide-react";
import { BookingDatePicker } from "@/components/booking/booking-date-picker";
import { GalleryViewer } from "@/components/gallery-viewer";

interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
  maxGuestsPerUnit: number;
}

interface AvailabilityData {
  dates: Record<
    string,
    { available: number; minPrice: number | null; isAvailable: boolean }
  >;
  totalUnits: number;
}

interface BookingDiscount {
  percent: number;
  label?: string;
}

interface BookingClientProps {
  collection: Collection;
  initialAvailability: AvailabilityData;
  discounts?: BookingDiscount[];
}

export function BookingClient({
  collection,
  initialAvailability,
  discounts,
}: BookingClientProps) {
  const combinedDiscountPercent = discounts?.reduce((sum, d) => sum + d.percent, 0) ?? 0;
  const router = useRouter();
  const [checkInDate, setCheckInDate] = useState<string | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<string | null>(null);
  const [nights, setNights] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [guests, setGuests] = useState(2);
  const [isCheckingPricing, setIsCheckingPricing] = useState(false);

  // Calculate units needed based on guest count
  const maxPerUnit = collection.maxGuestsPerUnit;
  const unitsNeeded = Math.ceil(guests / maxPerUnit);
  const maxGuests = maxPerUnit * initialAvailability.totalUnits;

  // TRPC utils for manual queries
  const utils = api.useUtils();

  // Fetch gallery images for this collection
  const { data: galleryImages = [] } = api.gallery.getByCollection.useQuery({
    collectionId: collection.id,
  });
  const galleryImageUrls = galleryImages.map((img) => img.url);

  // Handle date picker changes
  const handleDatePickerChange = useCallback((dates: {
    checkIn: string | null;
    checkOut: string | null;
    nights: number;
    estimatedPrice: number | null;
  }) => {
    setCheckInDate(dates.checkIn);
    setCheckOutDate(dates.checkOut);
    setNights(dates.nights);
    setEstimatedPrice(dates.estimatedPrice);
  }, []);

  // Helper to parse date string for display
  const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year!, month! - 1, day);
  };


  const handleContinue = async () => {
    if (!checkInDate || !checkOutDate) return;

    setIsCheckingPricing(true);

    try {
      // Validate availability before proceeding
      const result = await utils.booking.checkPricing.fetch({
        collectionId: collection.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
      });

      if (result.available) {
        // Navigate to checkout with the booking details
        const params = new URLSearchParams({
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guests: guests.toString(),
        });
        router.push(`/book/${collection.id}/checkout?${params.toString()}`);
      } else {
        toast.error(result.error ?? "No units available for the selected dates");
        setIsCheckingPricing(false);
      }
    } catch (error) {
      toast.error("Failed to check availability. Please try again.");
      setIsCheckingPricing(false);
    }
  };


  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <header className="border-b border-cyan-400/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-cyan-300/80 transition-colors hover:text-cyan-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Collection Info & Calendar */}
          <div className="lg:col-span-2 space-y-8">
            {/* Collection Header */}
            <div className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#0d1f31]/80">
              <div className="relative h-48 md:h-64">
                <NextImage
                  src={
                    collection.imageUrl ??
                    "https://arkpad.co/wp-content/uploads/2025/09/Reef-Resort-35.jpg"
                  }
                  alt={collection.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f31] to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    Book a Stay at {collection.name}
                  </h1>
                  {collection.location && (
                    <div className="mt-2 flex items-center gap-2 text-cyan-300/80">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{collection.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Availability Calendar */}
            <div className="rounded-2xl border border-cyan-400/30 bg-[#0d1f31]/80 p-6">
              <BookingDatePicker
                collectionId={collection.id}
                initialAvailability={initialAvailability}
                onDateChange={handleDatePickerChange}
                showLegend={true}
              />
            </div>

            {/* Info Box */}
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 flex-shrink-0 text-cyan-400" />
                <div className="text-sm text-cyan-100/70">
                  <p>
                    Select your check-in and check-out dates on the calendar above.
                    Prices shown are per night and may vary based on availability.
                    The system will automatically assign you an available unit upon confirmation.
                  </p>
                </div>
              </div>
            </div>

            {/* Gallery Preview */}
            {galleryImageUrls.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Gallery</h3>
                <GalleryViewer
                  images={galleryImageUrls}
                  collectionName={collection.name}
                  columns={2}
                  maxDisplay={4}
                />
              </div>
            )}
          </div>

          {/* Right Column: Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-2xl border border-cyan-400/30 bg-[#0d1f31]/80 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Booking Summary
              </h3>

              {/* Date Selection */}
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
                  <div>
                    <p className="text-xs text-cyan-300/60">Check-in</p>
                    <p className="font-medium text-white">
                      {checkInDate
                        ? parseDateString(checkInDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : "Select date"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-cyan-400" />
                  <div className="text-right">
                    <p className="text-xs text-cyan-300/60">Check-out</p>
                    <p className="font-medium text-white">
                      {checkOutDate
                        ? parseDateString(checkOutDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : "Select date"}
                    </p>
                  </div>
                </div>

                {nights > 0 && (
                  <p className="text-center text-sm text-cyan-300/70">
                    {nights} night{nights !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Guest Count */}
              <div className="mb-6">
                <label className="mb-2 block text-sm text-cyan-300/70">
                  <Users className="mr-1 inline-block h-4 w-4" />
                  Guests
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    disabled={guests <= 1}
                    className="h-8 w-8 border-cyan-400/30 bg-transparent text-cyan-300 hover:bg-cyan-400/20"
                  >
                    -
                  </Button>
                  <span className="min-w-[40px] text-center font-medium text-white">
                    {guests}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setGuests(Math.min(maxGuests, guests + 1))}
                    disabled={guests >= maxGuests}
                    className="h-8 w-8 border-cyan-400/30 bg-transparent text-cyan-300 hover:bg-cyan-400/20"
                  >
                    +
                  </Button>
                </div>
                {unitsNeeded > 1 && (
                  <p className="mt-2 text-xs text-cyan-300/70">
                    {unitsNeeded} units required ({maxPerUnit} guests per unit)
                  </p>
                )}
              </div>

              {/* Discount Badges in Sidebar */}
              {discounts && discounts.length > 0 && (
                <div className="mb-4 space-y-2">
                  {discounts.map((d, i) => (
                    <div key={i} className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-400">
                          {d.label ?? "Special Discount"}
                        </span>
                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-sm font-bold text-green-400">
                          {d.percent}% OFF
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Price Estimate */}
              {checkInDate && checkOutDate && (() => {
                const totalEstimate = estimatedPrice !== null ? estimatedPrice * unitsNeeded : null;
                return (
                <div className="mb-6 border-t border-cyan-400/20 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cyan-300/70">
                      Estimated Total
                      {unitsNeeded > 1 ? ` (${unitsNeeded} units)` : ""}
                    </span>
                    <div className="text-right">
                      {totalEstimate !== null ? (
                        combinedDiscountPercent > 0 ? (
                          <>
                            <span className="mr-2 text-sm text-red-400/70 line-through">
                              {currencySymbol}{totalEstimate.toLocaleString()}
                            </span>
                            <span className="text-xl font-bold text-green-400">
                              {currencySymbol}{Math.round(totalEstimate * (1 - combinedDiscountPercent / 100)).toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-bold text-white">
                            {currencySymbol}{totalEstimate.toLocaleString()}
                          </span>
                        )
                      ) : (
                        <span className="text-xl font-bold text-white">
                          Calculating...
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-cyan-300/50">
                    Final price will be confirmed at checkout
                  </p>
                </div>
                );
              })()}

              {/* Continue Button */}
              <Button
                onClick={handleContinue}
                disabled={!checkInDate || !checkOutDate || isCheckingPricing}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-6 text-lg font-semibold text-white hover:from-cyan-400 hover:to-blue-400"
              >
                {isCheckingPricing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Checking availability...
                  </>
                ) : (
                  <>
                    Continue to Checkout
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              {/* Total Units Available */}
              <p className="mt-4 text-center text-xs text-cyan-300/50">
                {initialAvailability.totalUnits} units available for booking
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
