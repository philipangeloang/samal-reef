"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CalendarDays } from "lucide-react";
import { BookingDatePicker } from "@/components/booking/booking-date-picker";
import { currencySymbol, currencyCode } from "@/lib/currency";

type Collection = RouterOutputs["collection"]["getAll"][number];

interface AddBookingFormProps {
  collections: Collection[];
  isAdmin: boolean;
}

export function AddBookingForm({ collections, isAdmin }: AddBookingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch staff's affiliate code
  const { data: affiliateData } = api.user.getMyAffiliateCode.useQuery();

  // Form state
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [pickerNights, setPickerNights] = useState(0);
  const [guestNotes, setGuestNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Handle date picker changes
  const handleDatePickerChange = useCallback((dates: {
    checkIn: string | null;
    checkOut: string | null;
    nights: number;
    estimatedPrice: number | null;
  }) => {
    setCheckIn(dates.checkIn);
    setCheckOut(dates.checkOut);
    setPickerNights(dates.nights);
  }, []);

  // Get selected collection and its pricing
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
  const baseNightlyRate = selectedCollection?.bookingPricePerNight ?? "0";
  const cleaningFee = selectedCollection?.bookingCleaningFee ?? "0";
  const serviceFeePercent = parseFloat(selectedCollection?.bookingServiceFeePercent ?? "0");

  // Fetch discounts for the selected collection
  const { data: collectionDiscountsData } = api.collection.getDiscounts.useQuery(
    { collectionId: selectedCollectionId! },
    { enabled: !!selectedCollectionId },
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

    const nights = pickerNights;
    const checkInDay = checkIn ? new Date(checkIn + "T00:00:00").getDay() : -1;

    const matching = activeOnes.filter((d) => {
      switch (d.conditionType) {
        case "ALWAYS": return true;
        case "MIN_NIGHTS": {
          const val = d.conditionValue ? (JSON.parse(d.conditionValue) as { minNights: number }) : null;
          return val ? nights >= val.minNights : false;
        }
        case "DATE_RANGE": {
          const val = d.conditionValue ? (JSON.parse(d.conditionValue) as { startDate: string; endDate: string }) : null;
          if (!val || !checkIn || !checkOut) return false;
          return checkIn < val.endDate && checkOut > val.startDate;
        }
        case "WEEKEND": return checkInDay === 5 || checkInDay === 6;
        default: return false;
      }
    });

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
  }, [collectionDiscountsData, pickerNights, checkIn, checkOut]);

  // Apply discount to nightly rate
  const nightlyRate = useMemo(() => {
    if (baseNightlyRate === "0") return "0";
    const base = parseFloat(baseNightlyRate);
    if (discountPercent > 0) {
      return (base * (1 - discountPercent / 100)).toFixed(2);
    }
    return baseNightlyRate;
  }, [baseNightlyRate, discountPercent]);

  // Helper to parse date string
  const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year!, month! - 1, day);
  };

  // Calculate totals using picker nights
  const totalNights = pickerNights;
  const { subtotal, serviceFee, totalPrice, originalSubtotal, originalTotalPrice } =
    useMemo(() => {
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

  // Check availability for selected dates
  const shouldCheckAvailability =
    !!selectedCollectionId && !!checkIn && !!checkOut && totalNights > 0;

  const { data: pricingData, isLoading: isCheckingAvailability } =
    api.booking.checkPricing.useQuery(
      {
        collectionId: selectedCollectionId!,
        checkIn: checkIn!,
        checkOut: checkOut!,
        guests: numberOfGuests,
      },
      {
        enabled: shouldCheckAvailability,
        refetchOnWindowFocus: false,
      }
    );

  const isAvailable = pricingData?.available ?? false;
  const availableUnits = pricingData?.availableUnits ?? 0;

  const createBooking = api.staffEntry.createBooking.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      router.push("/dashboard/staff/submissions");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking entry");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedCollectionId) {
      toast.error("Please select a collection");
      setIsSubmitting(false);
      return;
    }

    if (!guestEmail || !guestName) {
      toast.error("Please enter guest email and name");
      setIsSubmitting(false);
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      setIsSubmitting(false);
      return;
    }

    if (totalNights <= 0) {
      toast.error("Check-out must be after check-in");
      setIsSubmitting(false);
      return;
    }

    if (!baseNightlyRate || baseNightlyRate === "0") {
      toast.error("Selected collection has no booking price configured");
      setIsSubmitting(false);
      return;
    }

    if (!isAvailable) {
      toast.error("No units available for the selected dates");
      setIsSubmitting(false);
      return;
    }

    createBooking.mutate({
      guestEmail,
      guestName,
      guestPhone: guestPhone || undefined,
      guestCountry: guestCountry || undefined,
      numberOfGuests,
      collectionId: selectedCollectionId,
      checkIn,
      checkOut,
      nightlyRate,
      totalNights,
      cleaningFee,
      serviceFee,
      totalPrice,
      currency: currencyCode,
      guestNotes: guestNotes || undefined,
      internalNotes: internalNotes || undefined,
      affiliateCode: affiliateData?.affiliateCode || undefined,
    });
  };

  // Reset dates when collection changes
  const handleCollectionChange = (value: string) => {
    setSelectedCollectionId(parseInt(value));
    setCheckIn(null);
    setCheckOut(null);
    setPickerNights(0);
  };

  return (
    <Card className="border-cyan-400/20 bg-gradient-to-br from-[#0d1f31]/90 to-[#0a1929]/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-400/10 p-2">
            <CalendarDays className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <CardTitle className="text-white">Booking Details</CardTitle>
            <CardDescription className="text-cyan-100/60">
              {isAdmin
                ? "Entry will be immediately confirmed"
                : "Entry will be submitted for admin approval"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cyan-300">Guest Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guestEmail" className="text-cyan-100">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestName" className="text-cyan-100">
                  Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="John Doe"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestPhone" className="text-cyan-100">
                  Phone (optional)
                </Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestCountry" className="text-cyan-100">
                  Country (optional)
                </Label>
                <Input
                  id="guestCountry"
                  type="text"
                  value={guestCountry}
                  onChange={(e) => setGuestCountry(e.target.value)}
                  placeholder="United States"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cyan-300">Booking Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="collection" className="text-cyan-100">
                  Collection <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={selectedCollectionId?.toString() ?? ""}
                  onValueChange={handleCollectionChange}
                >
                  <SelectTrigger className="w-full border-cyan-400/30 bg-[#0a1929]/50 text-cyan-100">
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
              <div className="space-y-2">
                <Label htmlFor="numberOfGuests" className="text-cyan-100">
                  Number of Guests
                </Label>
                <Input
                  id="numberOfGuests"
                  type="number"
                  min="1"
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || 1)}
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white"
                />
              </div>
            </div>

            {/* Availability Calendar */}
            {selectedCollectionId && (
              <div className="rounded-xl border border-cyan-400/20 bg-[#0a1929]/50 p-4">
                <BookingDatePicker
                  collectionId={selectedCollectionId}
                  onDateChange={handleDatePickerChange}
                  hidePrices={true}
                  showLegend={true}
                />

                {/* Availability Status */}
                {totalNights > 0 && (
                  <p className="mt-2 text-center text-sm text-cyan-300/70">
                    {isCheckingAvailability ? (
                      <span className="text-cyan-400">
                        <Loader2 className="inline h-3 w-3 animate-spin" /> Checking availability...
                      </span>
                    ) : isAvailable ? (
                      <span className="text-green-400">
                        {availableUnits} unit{availableUnits !== 1 ? "s" : ""} available
                      </span>
                    ) : (
                      <span className="text-red-400">No units available for these dates</span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cyan-300">Pricing ({currencyCode})</h3>

            {/* Discount Badges */}
            {activeDiscounts.length > 0 && (
              <div className="space-y-2">
                {activeDiscounts.map((d, i) => (
                  <div key={i} className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-green-400">{d.label}</span>
                      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-sm font-bold text-green-400">
                        {d.percent}% OFF
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="nightlyRate" className="text-cyan-100">
                  Nightly Rate
                </Label>
                <Input
                  id="nightlyRate"
                  type="text"
                  value={
                    nightlyRate !== "0"
                      ? discountPercent > 0
                        ? `${currencySymbol}${nightlyRate} (was ${currencySymbol}${baseNightlyRate})`
                        : `${currencySymbol}${nightlyRate}`
                      : ""
                  }
                  disabled
                  placeholder="Select a collection"
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cleaningFee" className="text-cyan-100">
                  Cleaning Fee
                </Label>
                <Input
                  id="cleaningFee"
                  type="text"
                  value={cleaningFee !== "0" ? `${currencySymbol}${cleaningFee}` : `${currencySymbol}0`}
                  disabled
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceFeePercent" className="text-cyan-100">
                  Service Fee
                </Label>
                <Input
                  id="serviceFeePercent"
                  type="text"
                  value={`${serviceFeePercent}%`}
                  disabled
                  className="border-cyan-400/30 bg-[#0a1929]/50 text-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
            <p className="text-xs text-cyan-100/50">
              Pricing is auto-filled from collection settings
            </p>

            {/* Price Summary */}
            {totalNights > 0 && (
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-cyan-100/70">
                    <span>
                      {discountPercent > 0 ? (
                        <>
                          <span className="text-red-400/70 line-through">{currencySymbol}{baseNightlyRate}</span>{" "}
                          <span className="text-green-400">{currencySymbol}{nightlyRate}</span>
                        </>
                      ) : (
                        `${currencySymbol}${nightlyRate}`
                      )}{" "}
                      x {totalNights} night{totalNights > 1 ? "s" : ""}
                    </span>
                    <span>
                      {originalSubtotal ? (
                        <span className="flex items-center gap-2">
                          <span className="text-red-400/70 line-through">{currencySymbol}{originalSubtotal}</span>
                          <span className="text-green-400">{currencySymbol}{subtotal}</span>
                        </span>
                      ) : (
                        `${currencySymbol}${subtotal}`
                      )}
                    </span>
                  </div>
                  {parseFloat(cleaningFee) > 0 && (
                    <div className="flex justify-between text-cyan-100/70">
                      <span>Cleaning fee</span>
                      <span>{currencySymbol}{cleaningFee}</span>
                    </div>
                  )}
                  {parseFloat(serviceFee) > 0 && (
                    <div className="flex justify-between text-cyan-100/70">
                      <span>Service fee ({serviceFeePercent}%)</span>
                      <span>{currencySymbol}{serviceFee}</span>
                    </div>
                  )}
                  <div className="border-t border-cyan-400/20 pt-2">
                    <div className="flex justify-between font-semibold text-white">
                      <span>Total</span>
                      <span>
                        {originalTotalPrice ? (
                          <>
                            <span className="mr-2 text-sm text-red-400/70 line-through">
                              {currencySymbol}{originalTotalPrice}
                            </span>
                            <span className="text-green-400">{currencySymbol}{totalPrice} {currencyCode}</span>
                          </>
                        ) : (
                          <span className="text-green-400">{currencySymbol}{totalPrice} {currencyCode}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes & Affiliate */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cyan-300">Additional Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guestNotes" className="text-cyan-100">
                  Guest Notes (optional)
                </Label>
                <Textarea
                  id="guestNotes"
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                  placeholder="Special requests from guest..."
                  className="min-h-[80px] border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalNotes" className="text-cyan-100">
                  Internal Notes (optional)
                </Label>
                <Textarea
                  id="internalNotes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Staff notes about this booking..."
                  className="min-h-[80px] border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliateCode" className="text-cyan-100">
                Affiliate Code
                {affiliateData?.isAffiliate && (
                  <span className="ml-2 text-xs text-green-400">(Your code)</span>
                )}
              </Label>
              <Input
                id="affiliateCode"
                type="text"
                value={affiliateData?.affiliateCode ?? ""}
                disabled
                placeholder={affiliateData?.isAffiliate ? "" : "Not an affiliate"}
                className="max-w-xs border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40 disabled:cursor-not-allowed disabled:opacity-60"
              />
              {!affiliateData?.isAffiliate && (
                <p className="text-xs text-cyan-100/50">
                  You are not an affiliate. No commission will be applied.
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                totalNights <= 0 ||
                isCheckingAvailability ||
                (shouldCheckAvailability && !isAvailable)
              }
              className="bg-green-500 hover:bg-green-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : isAdmin ? (
                "Create & Confirm"
              ) : (
                "Submit for Approval"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
