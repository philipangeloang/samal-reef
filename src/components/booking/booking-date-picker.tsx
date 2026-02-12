"use client";

import { useState, useMemo, useEffect } from "react";
import { currencySymbol } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface AvailabilityData {
  dates: Record<
    string,
    { available: number; minPrice: number | null; isAvailable: boolean }
  >;
  totalUnits: number;
}

interface BookingDatePickerProps {
  collectionId: number;
  initialAvailability?: AvailabilityData;
  onDateChange: (dates: {
    checkIn: string | null;
    checkOut: string | null;
    nights: number;
    estimatedPrice: number | null;
  }) => void;
  // Optional: pre-selected dates (for editing)
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  // Optional: compact mode for modals
  compact?: boolean;
  // Optional: show legend
  showLegend?: boolean;
  // Optional: hide price display in calendar cells and summary
  hidePrices?: boolean;
}

export function BookingDatePicker({
  collectionId,
  initialAvailability,
  onDateChange,
  initialCheckIn = null,
  initialCheckOut = null,
  compact = false,
  showLegend = true,
  hidePrices = false,
}: BookingDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkInDate, setCheckInDate] = useState<string | null>(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState<string | null>(initialCheckOut);

  // Calculate date range for availability query (current month + next 2 months)
  const dateRange = useMemo(() => {
    const startDate = new Date();
    startDate.setDate(1);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);

    return {
      startDate: formatDateString(startDate),
      endDate: formatDateString(endDate),
    };
  }, []);

  // Fetch availability data
  const { data: fetchedAvailability, isLoading } = api.booking.getAvailability.useQuery(
    {
      collectionId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    {
      enabled: !initialAvailability,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const availabilityData = initialAvailability ?? fetchedAvailability ?? { dates: {}, totalUnits: 0 };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDateInPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getDateAvailability = (dateStr: string) => {
    return availabilityData.dates[dateStr] ?? { available: 0, minPrice: null, isAvailable: false };
  };

  const isDateSelected = (dateStr: string): boolean => {
    return dateStr === checkInDate || dateStr === checkOutDate;
  };

  const isDateInRange = (dateStr: string): boolean => {
    if (!checkInDate || !checkOutDate) return false;
    return dateStr > checkInDate && dateStr < checkOutDate;
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDateString(date);
    const availability = getDateAvailability(dateStr);

    if (isDateInPast(date)) return;
    if (!availability.isAvailable) return;

    let newCheckIn = checkInDate;
    let newCheckOut = checkOutDate;

    if (!checkInDate || (checkInDate && checkOutDate)) {
      // Start new selection
      newCheckIn = dateStr;
      newCheckOut = null;
    } else if (dateStr > checkInDate) {
      // Set checkout date
      newCheckOut = dateStr;
    } else {
      // Selected date is before check-in, reset selection
      newCheckIn = dateStr;
      newCheckOut = null;
    }

    setCheckInDate(newCheckIn);
    setCheckOutDate(newCheckOut);
  };

  // Calculate nights and estimated price
  const { nights, estimatedPrice } = useMemo(() => {
    if (!checkInDate || !checkOutDate) {
      return { nights: 0, estimatedPrice: null };
    }

    const start = parseDateString(checkInDate);
    const end = parseDateString(checkOutDate);
    const nightCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    let total = 0;
    let hasAllPrices = true;

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateString(d);
      const availability = getDateAvailability(dateStr);
      if (availability.minPrice !== null) {
        total += availability.minPrice;
      } else {
        hasAllPrices = false;
      }
    }

    return {
      nights: nightCount,
      estimatedPrice: hasAllPrices ? total : null,
    };
  }, [checkInDate, checkOutDate, availabilityData]);

  // Notify parent of date changes
  useEffect(() => {
    onDateChange({
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      estimatedPrice,
    });
  }, [checkInDate, checkOutDate, nights, estimatedPrice, onDateChange]);

  const prevMonth = () => {
    const today = new Date();
    const prevMonthDate = new Date(currentMonth);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);

    if (
      prevMonthDate.getFullYear() > today.getFullYear() ||
      (prevMonthDate.getFullYear() === today.getFullYear() &&
        prevMonthDate.getMonth() >= today.getMonth())
    ) {
      setCurrentMonth(prevMonthDate);
    }
  };

  const nextMonth = () => {
    const nextMonthDate = new Date(currentMonth);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 12);

    if (nextMonthDate <= maxDate) {
      setCurrentMonth(nextMonthDate);
    }
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayNames = compact
    ? ["S", "M", "T", "W", "T", "F", "S"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (isLoading && !initialAvailability) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-cyan-100">
          <Calendar className="h-4 w-4 text-cyan-400" />
          Select Dates
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            className="h-7 w-7 border-cyan-400/30 bg-transparent text-cyan-300 hover:bg-cyan-400/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[120px] text-center text-sm font-medium text-white">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            className="h-7 w-7 border-cyan-400/30 bg-transparent text-cyan-300 hover:bg-cyan-400/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {dayNames.map((day, i) => (
          <div
            key={`${day}-${i}`}
            className="py-1 text-center text-xs font-medium text-cyan-300/70"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="p-1" />;
          }

          const dateStr = formatDateString(date);
          const availability = getDateAvailability(dateStr);
          const isPast = isDateInPast(date);
          const isSelected = isDateSelected(dateStr);
          const isInRange = isDateInRange(dateStr);
          const isAvailable = availability.isAvailable && !isPast;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={!isAvailable}
              className={`relative flex flex-col items-center justify-center rounded-md p-1 text-xs transition-all ${
                isSelected
                  ? "bg-cyan-500 text-white"
                  : isInRange
                    ? "bg-cyan-500/30 text-white"
                    : isAvailable
                      ? "bg-cyan-400/10 text-white hover:bg-cyan-400/20"
                      : "cursor-not-allowed text-gray-600"
              }`}
            >
              <span className="font-medium">{date.getDate()}</span>
              {!hidePrices && isAvailable && availability.minPrice && !compact && (
                <span className="text-[9px] text-cyan-300/70">
                  {currencySymbol}{Math.round(availability.minPrice)}
                </span>
              )}
              {!isPast && !availability.isAvailable && (
                <span className="text-[9px] text-red-400">Full</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Dates Summary */}
      <div className="flex items-center justify-between rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
        <div>
          <p className="text-xs text-cyan-300/60">Check-in</p>
          <p className="text-sm font-medium text-white">
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
          <p className="text-sm font-medium text-white">
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
          {!hidePrices && estimatedPrice !== null && (
            <span className="ml-2 font-medium text-green-400">
              ~{currencySymbol}{estimatedPrice.toLocaleString()}
            </span>
          )}
        </p>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-cyan-100/60">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-cyan-400/10" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-cyan-500" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-cyan-500/30" />
            <span>In Range</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-gray-700" />
            <span>Unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year!, month! - 1, day);
}
