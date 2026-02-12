"use client";

import { useState, useEffect } from "react";
import { currencySymbol } from "@/lib/currency";
import Link from "next/link";
import NextImage from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
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
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Wallet,
  FileText,
  Loader2,
  Check,
  ChevronRight,
} from "lucide-react";
import { getAffiliateCode } from "@/hooks/use-affiliate-tracking";

// DePay widget types - extends the global Window interface defined in purchase-button.tsx

interface Collection {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  location: string | null;
}

interface BookingDetails {
  checkIn: string;
  checkOut: string;
  guests: number;
}

interface Pricing {
  nightlyRate: number;
  originalNightlyRate?: number;
  totalNights: number;
  subtotal: number;
  originalSubtotal?: number;
  cleaningFee: number;
  serviceFee: number;
  totalPrice: number;
  originalTotalPrice?: number;
  totalPriceBeforeAffiliateDiscount?: number;
  availableUnits: number;
  discountPercent?: number;
  discountLabel?: string;
  discounts?: Array<{ percent: number; label: string; conditionType?: string }>;
  affiliateDiscount?: number;
  affiliateCodeValid?: boolean;
  unitsRequired?: number;
  maxGuestsPerUnit?: number;
}

interface ManualPaymentMethod {
  id: string;
  name: string;
}

interface CheckoutClientProps {
  collection: Collection;
  bookingDetails: BookingDetails;
  pricing: Pricing;
  manualPaymentMethods: ManualPaymentMethod[];
}

export function CheckoutClient({
  collection,
  bookingDetails,
  pricing: initialPricing,
  manualPaymentMethods,
}: CheckoutClientProps) {
  const { data: session } = useSession();
  const [paymentMethod, setPaymentMethod] = useState<"FIAT" | "CRYPTO" | "MANUAL">("FIAT");
  const [isLoading, setIsLoading] = useState(false);

  // Guest details form
  const [guestName, setGuestName] = useState(session?.user?.name ?? "");
  const [guestEmail, setGuestEmail] = useState(session?.user?.email ?? "");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [selectedManualMethod, setSelectedManualMethod] = useState<string | null>(null);

  // Affiliate code state - read from localStorage
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Pricing>(initialPricing);

  // Refetch pricing with affiliate code if present
  const { data: updatedPricing, isLoading: isPricingLoading } = api.booking.checkPricing.useQuery(
    {
      collectionId: collection.id,
      checkIn: bookingDetails.checkIn,
      checkOut: bookingDetails.checkOut,
      guests: bookingDetails.guests,
      affiliateCode: affiliateCode ?? undefined,
    },
    {
      enabled: !!affiliateCode, // Only fetch if affiliate code exists
    }
  );

  // Read affiliate code from localStorage on mount
  useEffect(() => {
    const code = getAffiliateCode();
    if (code) {
      setAffiliateCode(code);
    }
  }, []);

  // Update pricing when affiliate code pricing is fetched
  useEffect(() => {
    if (updatedPricing && updatedPricing.available) {
      setPricing({
        nightlyRate: updatedPricing.nightlyRate ?? initialPricing.nightlyRate,
        originalNightlyRate: updatedPricing.originalNightlyRate,
        totalNights: updatedPricing.totalNights ?? initialPricing.totalNights,
        subtotal: updatedPricing.subtotal ?? initialPricing.subtotal,
        originalSubtotal: updatedPricing.originalSubtotal,
        cleaningFee: updatedPricing.cleaningFee ?? initialPricing.cleaningFee,
        serviceFee: updatedPricing.serviceFee ?? initialPricing.serviceFee,
        totalPrice: updatedPricing.totalPrice ?? initialPricing.totalPrice,
        originalTotalPrice: updatedPricing.originalTotalPrice,
        totalPriceBeforeAffiliateDiscount: updatedPricing.totalPriceBeforeAffiliateDiscount,
        availableUnits: updatedPricing.availableUnits ?? initialPricing.availableUnits,
        discountPercent: updatedPricing.discountPercent,
        discountLabel: updatedPricing.discountLabel,
        discounts: updatedPricing.discounts,
        affiliateDiscount: updatedPricing.affiliateDiscount,
        affiliateCodeValid: updatedPricing.affiliateCodeValid,
        unitsRequired: updatedPricing.unitsRequired ?? initialPricing.unitsRequired,
        maxGuestsPerUnit: updatedPricing.maxGuests ?? initialPricing.maxGuestsPerUnit,
      });
    }
  }, [updatedPricing, initialPricing]);

  // Initiate booking mutation
  const initiateBooking = api.booking.initiate.useMutation({
    onError: (error) => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  // Form validation
  const isFormValid = guestName.trim().length >= 2 && guestEmail.includes("@");

  // Parse date string without timezone conversion (avoids off-by-one day bug)
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year!, month! - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Load DePay script
  const loadDePayScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.DePayWidgets) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(
        'script[src*="integrate.depay.com"]'
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://integrate.depay.com/widgets/v13.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!isFormValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      // First, initiate the booking to get a booking ID
      const result = await initiateBooking.mutateAsync({
        collectionId: collection.id,
        checkIn: bookingDetails.checkIn,
        checkOut: bookingDetails.checkOut,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim() || undefined,
        guestCountry: guestCountry || undefined,
        numberOfGuests: bookingDetails.guests,
        guestNotes: guestNotes.trim() || undefined,
        paymentMethod,
        affiliateCode: affiliateCode ?? undefined, // Pass affiliate code for 5% discount
      });

      if (paymentMethod === "FIAT") {
        // Redirect to Stripe checkout
        const response = await fetch("/api/booking/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: result.bookingId,
            totalPrice: pricing.totalPrice,
            collectionName: collection.name,
            checkIn: bookingDetails.checkIn,
            checkOut: bookingDetails.checkOut,
            nights: pricing.totalNights,
            guestEmail: guestEmail.trim(),
          }),
        });

        const data = await response.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          throw new Error(data.error ?? "Failed to create checkout session");
        }
      } else if (paymentMethod === "CRYPTO") {
        // Load DePay and open widget
        await loadDePayScript();

        if (!window.DePayWidgets) {
          throw new Error("Failed to load DePay widgets");
        }

        const integrationId = process.env.NEXT_PUBLIC_DEPAY_INTEGRATION_ID;
        if (!integrationId) {
          throw new Error("DePay integration not configured");
        }

        let paymentSucceeded = false;
        let successTxHash = "";

        // Cast to any to allow flexible payload structure for booking
        (window.DePayWidgets as { Payment: (config: unknown) => void }).Payment({
          integration: integrationId,
          payload: {
            type: "BOOKING",
            bookingId: result.bookingId.toString(),
            email: guestEmail.trim(),
            userId: session?.user?.id ?? "",
          },
          succeeded: (transaction: unknown) => {
            if (transaction && typeof transaction === "object") {
              const txData = transaction as Record<string, unknown>;
              successTxHash = (txData.id as string) || "";
            }
            paymentSucceeded = true;
            toast.success("Payment successful!");
          },
          failed: (error: unknown) => {
            console.error("Payment failed:", error);
            toast.error("Payment failed. Please try again.");
            setIsLoading(false);
          },
          closed: () => {
            if (paymentSucceeded) {
              window.location.href = `/book/success?booking_id=${result.bookingId}${successTxHash ? `&tx_hash=${successTxHash}` : ""}`;
            } else {
              setIsLoading(false);
            }
          },
        });
      } else if (paymentMethod === "MANUAL") {
        // Redirect to manual payment page
        if (!selectedManualMethod) {
          toast.error("Please select a payment method");
          setIsLoading(false);
          return;
        }

        window.location.href = `/book/manual?booking_id=${result.bookingId}&method=${selectedManualMethod}`;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Checkout failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <header className="border-b border-cyan-400/20">
        <div className="container mx-auto px-4 py-6">
          <Link
            href={`/book/${collection.id}`}
            className="inline-flex items-center gap-2 text-sm text-cyan-300/80 transition-colors hover:text-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calendar
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white md:text-3xl">
          Complete Your Booking
        </h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Guest Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest Details */}
            <div className="rounded-2xl border border-cyan-400/30 bg-[#0d1f31]/80 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Users className="h-5 w-5 text-cyan-400" />
                Guest Details
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-cyan-100">
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="John Doe"
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-cyan-100">
                    Email Address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-cyan-100">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-cyan-100">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={guestCountry}
                    onChange={(e) => setGuestCountry(e.target.value)}
                    placeholder="United States"
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes" className="text-cyan-100">
                    Special Requests
                  </Label>
                  <Textarea
                    id="notes"
                    value={guestNotes}
                    onChange={(e) => setGuestNotes(e.target.value)}
                    placeholder="Any special requests or notes for your stay..."
                    rows={3}
                    className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-2xl border border-cyan-400/30 bg-[#0d1f31]/80 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <CreditCard className="h-5 w-5 text-cyan-400" />
                Payment Method
              </h2>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  onClick={() => setPaymentMethod("FIAT")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    paymentMethod === "FIAT"
                      ? "border-cyan-400 bg-cyan-400/20 text-white"
                      : "border-cyan-400/30 bg-cyan-400/5 text-cyan-100/70 hover:border-cyan-400/50"
                  }`}
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="text-sm font-medium">Credit Card</span>
                  {paymentMethod === "FIAT" && (
                    <Check className="h-4 w-4 text-cyan-400" />
                  )}
                </button>

                <button
                  onClick={() => setPaymentMethod("CRYPTO")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    paymentMethod === "CRYPTO"
                      ? "border-cyan-400 bg-cyan-400/20 text-white"
                      : "border-cyan-400/30 bg-cyan-400/5 text-cyan-100/70 hover:border-cyan-400/50"
                  }`}
                >
                  <Wallet className="h-6 w-6" />
                  <span className="text-sm font-medium">Crypto</span>
                  {paymentMethod === "CRYPTO" && (
                    <Check className="h-4 w-4 text-cyan-400" />
                  )}
                </button>

                {manualPaymentMethods.length > 0 && (
                  <button
                    onClick={() => setPaymentMethod("MANUAL")}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                      paymentMethod === "MANUAL"
                        ? "border-cyan-400 bg-cyan-400/20 text-white"
                        : "border-cyan-400/30 bg-cyan-400/5 text-cyan-100/70 hover:border-cyan-400/50"
                    }`}
                  >
                    <FileText className="h-6 w-6" />
                    <span className="text-sm font-medium">Manual</span>
                    {paymentMethod === "MANUAL" && (
                      <Check className="h-4 w-4 text-cyan-400" />
                    )}
                  </button>
                )}
              </div>

              {/* Manual payment method selection */}
              {paymentMethod === "MANUAL" && manualPaymentMethods.length > 0 && (
                <div className="mt-4">
                  <Label className="text-cyan-100">Select Payment Method</Label>
                  <Select
                    value={selectedManualMethod ?? ""}
                    onValueChange={setSelectedManualMethod}
                  >
                    <SelectTrigger className="mt-2 border-cyan-400/30 bg-[#0a1929]/50 text-white">
                      <SelectValue placeholder="Choose a payment method" />
                    </SelectTrigger>
                    <SelectContent className="border-cyan-400/30 bg-[#0d1f31]">
                      {manualPaymentMethods.map((method) => (
                        <SelectItem
                          key={method.id}
                          value={method.id}
                          className="text-cyan-100 focus:bg-cyan-400/20 focus:text-white"
                        >
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <p className="mt-4 text-xs text-cyan-300/60">
                {paymentMethod === "FIAT" && "Secure payment via Stripe. Major credit cards accepted."}
                {paymentMethod === "CRYPTO" && "Pay with USDC, ETH, or other cryptocurrencies via DePay."}
                {paymentMethod === "MANUAL" && "Bank transfer or other manual payment methods."}
              </p>
            </div>
          </div>

          {/* Right Column: Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-2xl border border-cyan-400/30 bg-[#0d1f31]/80 overflow-hidden">
              {/* Collection Image */}
              <div className="relative h-40">
                <NextImage
                  src={
                    collection.imageUrl ??
                    "https://arkpad.co/wp-content/uploads/2025/09/Reef-Resort-35.jpg"
                  }
                  alt={collection.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#0d1f31] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-lg font-semibold text-white drop-shadow-lg">
                    {collection.name}
                  </h3>
                  {collection.location && (
                    <div className="flex items-center gap-1 text-sm text-white/80 drop-shadow-lg">
                      <MapPin className="h-3 w-3" />
                      <span>{collection.location}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5">
                {/* Dates & Guest Info */}
                <div className="space-y-2.5 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-cyan-300/70">
                      <Calendar className="h-3.5 w-3.5" />
                      Check-in
                    </span>
                    <span className="font-medium text-white">
                      {formatDate(bookingDetails.checkIn)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-cyan-300/70">
                      <Calendar className="h-3.5 w-3.5" />
                      Check-out
                    </span>
                    <span className="font-medium text-white">
                      {formatDate(bookingDetails.checkOut)}
                    </span>
                  </div>
                  <div className="border-t border-cyan-400/10 pt-2.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-cyan-300/70">
                      <Users className="h-3.5 w-3.5" />
                      Guests
                    </span>
                    <span className="font-medium text-white">{bookingDetails.guests}</span>
                  </div>
                  {pricing.unitsRequired && pricing.unitsRequired > 1 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cyan-300/70">Units required</span>
                      <span className="font-medium text-white">{pricing.unitsRequired} units</span>
                    </div>
                  )}
                </div>

                {/* Price Breakdown — receipt style */}
                {(() => {
                  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const baseRate = pricing.originalNightlyRate ?? pricing.nightlyRate;
                  const baseSubtotal = pricing.originalSubtotal ?? pricing.subtotal;
                  const collectionDiscount = pricing.originalSubtotal && pricing.originalSubtotal > pricing.subtotal
                    ? pricing.originalSubtotal - pricing.subtotal
                    : 0;
                  const affiliateDiscountAmt = (pricing.affiliateCodeValid && pricing.affiliateDiscount && pricing.affiliateDiscount > 0)
                    ? pricing.affiliateDiscount
                    : 0;
                  const hasCollectionDiscounts = (pricing.discounts && pricing.discounts.length > 0) || collectionDiscount > 0;
                  const hasDiscounts = hasCollectionDiscounts || affiliateDiscountAmt > 0;

                  return (
                    <div className="mt-5 space-y-3">
                      {/* Line items */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-cyan-300/70">Accommodation</span>
                            <span className="font-medium text-white">{currencySymbol}{fmt(baseSubtotal)}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-cyan-300/40">
                            {currencySymbol}{fmt(baseRate)}/night &times; {pricing.totalNights} night{pricing.totalNights !== 1 ? "s" : ""}
                            {pricing.unitsRequired && pricing.unitsRequired > 1
                              ? ` × ${pricing.unitsRequired} units`
                              : ""}
                          </p>
                        </div>

                        {pricing.cleaningFee > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-cyan-300/70">
                              Cleaning fee
                              {pricing.unitsRequired && pricing.unitsRequired > 1
                                ? ` (×${pricing.unitsRequired})`
                                : ""}
                            </span>
                            <span className="font-medium text-white">{currencySymbol}{fmt(pricing.cleaningFee)}</span>
                          </div>
                        )}

                        {pricing.serviceFee > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-cyan-300/70">Service fee</span>
                            <span className="font-medium text-white">{currencySymbol}{fmt(pricing.serviceFee)}</span>
                          </div>
                        )}
                      </div>

                      {/* Discounts */}
                      {hasDiscounts && (
                        <>
                          <div className="border-t border-dashed border-cyan-400/15" />
                          <div className="space-y-2">
                            {pricing.discounts && pricing.discounts.length > 0 ? (
                              pricing.discounts.map((d, i) => {
                                const amt = baseSubtotal * d.percent / 100;
                                return (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-green-400">
                                      {d.label} ({d.percent}%)
                                    </span>
                                    <span className="font-medium text-green-400">-{currencySymbol}{fmt(amt)}</span>
                                  </div>
                                );
                              })
                            ) : collectionDiscount > 0 ? (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-green-400">
                                  {pricing.discountLabel ?? "Special Discount"}
                                  {pricing.discountPercent ? ` (${pricing.discountPercent}%)` : ""}
                                </span>
                                <span className="font-medium text-green-400">-{currencySymbol}{fmt(collectionDiscount)}</span>
                              </div>
                            ) : null}
                            {affiliateDiscountAmt > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-purple-400">Referral Discount (5%)</span>
                                <span className="font-medium text-purple-400">-{currencySymbol}{fmt(affiliateDiscountAmt)}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Total */}
                      <div className="border-t border-cyan-400/20" />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-semibold text-cyan-100">You Pay</span>
                        <span className={`text-xl font-bold ${
                          affiliateDiscountAmt > 0
                            ? "text-purple-400"
                            : collectionDiscount > 0
                              ? "text-green-400"
                              : "text-white"
                        }`}>
                          {currencySymbol}{fmt(pricing.totalPrice)}
                        </span>
                      </div>
                      {hasDiscounts && (() => {
                        const totalCollectionSavings = pricing.discounts && pricing.discounts.length > 0
                          ? pricing.discounts.reduce((sum, d) => sum + baseSubtotal * d.percent / 100, 0)
                          : collectionDiscount;
                        return (
                          <p className="text-right text-xs text-cyan-300/40">
                            You save {currencySymbol}{fmt(totalCollectionSavings + affiliateDiscountAmt)}
                          </p>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* Pay Button */}
                <Button
                  onClick={handlePayment}
                  disabled={!isFormValid || isLoading || (paymentMethod === "MANUAL" && !selectedManualMethod)}
                  className="mt-5 w-full bg-linear-to-r from-cyan-500 to-blue-500 py-6 text-lg font-semibold text-white hover:from-cyan-400 hover:to-blue-400"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {paymentMethod === "FIAT" && "Pay with Card"}
                      {paymentMethod === "CRYPTO" && "Pay with Crypto"}
                      {paymentMethod === "MANUAL" && "Continue"}
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="mt-3 text-center text-xs text-cyan-300/40">
                  {pricing.availableUnits} unit{pricing.availableUnits !== 1 ? "s" : ""} available
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
