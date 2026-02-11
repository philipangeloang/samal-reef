/**
 * Smoobu API Client
 *
 * This service handles all communication with the Smoobu channel manager API.
 * Smoobu syncs with Airbnb, Booking.com, and other platforms.
 *
 * API Documentation: https://docs.smoobu.com/
 * Rate Limit: 1000 requests per minute
 *
 * Used by:
 * - Booking processor (create reservations after payment)
 * - Sync service (pull reservations and rates from Smoobu)
 * - Admin UI (link units, manual sync)
 */

import "server-only";
import { env } from "@/env";

// ============================================================================
// Types
// ============================================================================

export interface SmoobuApartment {
  id: number;
  name: string;
  location: {
    street?: string;
    city?: string;
    country?: string;
    zip?: string;
  };
  currency: string;
  timeZone: string;
  rooms: {
    maxOccupancy: number;
    bedrooms: number;
    bathrooms: number;
  };
}

/**
 * Smoobu API uses kebab-case for field names
 * See: https://docs.smoobu.com/
 */
export interface SmoobuReservation {
  id: number;
  "reference-id": string | null;
  type: "reservation" | "modification of booking" | "cancellation" | "blocked";
  arrival: string; // "YYYY-MM-DD"
  departure: string; // "YYYY-MM-DD"
  "created-at": string; // "YYYY-MM-DD HH:mm"
  "modified-at": string; // "YYYY-MM-DD HH:mm"
  apartment: {
    id: number;
    name: string;
  } | null;
  channel: {
    id: number;
    name: string; // "Airbnb", "Booking.com", "Smoobu", etc.
  } | null;
  "guest-name": string;
  email?: string;
  phone?: string;
  adults: number;
  children: number;
  "check-in"?: string; // Time like "16:00"
  "check-out"?: string; // Time like "10:00"
  notice?: string;
  price: number;
  "price-paid"?: string; // "Yes" | "No"
  prepayment?: number;
  "prepayment-paid"?: string;
  deposit?: number;
  "deposit-paid"?: string;
  language?: string;
  "guest-app-url"?: string;
  "is-blocked-booking"?: boolean;
  guestId?: number;
  "assistant-notice"?: string;
}

export interface SmoobuRate {
  date: string; // "YYYY-MM-DD"
  price: number;
  minLengthOfStay: number;
  available: number; // 0 or 1
}

export interface SmoobuAvailability {
  available: boolean;
  price?: number;
  minStay?: number;
  availableCount?: number;
}

export interface CreateReservationInput {
  apartmentId: number;
  arrival: string; // "YYYY-MM-DD"
  departure: string; // "YYYY-MM-DD"
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  adults?: number;
  children?: number;
  notice?: string;
  price?: number;
  priceStatus?: number; // 1 = paid, 0 = not paid
  deposit?: number;
  depositStatus?: number;
  language?: string;
}

export interface UpdateReservationInput {
  arrival?: string;
  departure?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  adults?: number;
  children?: number;
  notice?: string;
  price?: number;
  priceStatus?: number;
  deposit?: number;
  depositStatus?: number;
}

interface SmoobuListResponse<T> {
  page_count: number;
  page_size: number;
  total_items: number;
  page: number;
  [key: string]: T[] | number;
}

interface SmoobuError {
  error?: string;
  message?: string;
  detail?: string;
}

// ============================================================================
// API Client
// ============================================================================

const SMOOBU_BASE_URL = "https://login.smoobu.com/api";

class SmoobuClient {
  private apiKey: string;

  constructor() {
    this.apiKey = env.SMOOBU_API_KEY;
  }

  /**
   * Base request method with API key authentication
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${SMOOBU_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Api-Key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorMessage = response.statusText;
      try {
        const errorBody = JSON.parse(errorText) as SmoobuError;
        errorMessage =
          errorBody.error ??
          errorBody.message ??
          errorBody.detail ??
          response.statusText;
        // Log full error for debugging
        console.error(
          "Smoobu API error response:",
          JSON.stringify(errorBody, null, 2),
        );
      } catch {
        // If not JSON, use raw text
        errorMessage = errorText || response.statusText;
      }
      throw new Error(`Smoobu API error (${response.status}): ${errorMessage}`);
    }

    // Some endpoints return empty response on success
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  // ==========================================================================
  // Apartments (Properties)
  // ==========================================================================

  /**
   * Get all apartments (properties) from Smoobu
   */
  async getApartments(): Promise<SmoobuApartment[]> {
    interface ApartmentsResponse {
      apartments: SmoobuApartment[];
      page_count: number;
      page_size: number;
      total_items: number;
    }

    const response = await this.request<ApartmentsResponse>("/apartments");
    return response.apartments ?? [];
  }

  /**
   * Get a single apartment by ID
   */
  async getApartment(apartmentId: number): Promise<SmoobuApartment | null> {
    try {
      return await this.request<SmoobuApartment>(`/apartments/${apartmentId}`);
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Reservations
  // ==========================================================================

  /**
   * Get reservations with optional filters
   */
  async getReservations(params?: {
    apartmentId?: number;
    from?: string; // "YYYY-MM-DD"
    to?: string; // "YYYY-MM-DD"
    modifiedFrom?: string; // "YYYY-MM-DD HH:mm:ss"
    page?: number;
    pageSize?: number;
    includeBlocked?: boolean;
  }): Promise<{
    reservations: SmoobuReservation[];
    totalPages: number;
    totalItems: number;
  }> {
    const searchParams = new URLSearchParams();

    if (params?.apartmentId) {
      searchParams.append("apartmentId", params.apartmentId.toString());
    }
    if (params?.from) {
      searchParams.append("from", params.from);
    }
    if (params?.to) {
      searchParams.append("to", params.to);
    }
    if (params?.modifiedFrom) {
      searchParams.append("modifiedFrom", params.modifiedFrom);
    }
    if (params?.page) {
      searchParams.append("page", params.page.toString());
    }
    if (params?.pageSize) {
      searchParams.append("pageSize", params.pageSize.toString());
    }
    if (params?.includeBlocked) {
      searchParams.append("showCancelled", "true");
    }

    const queryString = searchParams.toString();
    const endpoint = `/reservations${queryString ? `?${queryString}` : ""}`;

    interface ReservationsResponse {
      bookings: SmoobuReservation[];
      page_count: number;
      page_size: number;
      total_items: number;
      page: number;
    }

    const response = await this.request<ReservationsResponse>(endpoint);

    return {
      reservations: response.bookings ?? [],
      totalPages: response.page_count ?? 1,
      totalItems: response.total_items ?? 0,
    };
  }

  /**
   * Get all reservations (paginated fetch)
   */
  async getAllReservations(params?: {
    apartmentId?: number;
    from?: string;
    to?: string;
  }): Promise<SmoobuReservation[]> {
    const allReservations: SmoobuReservation[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await this.getReservations({
        ...params,
        page: currentPage,
        pageSize: 100,
      });

      allReservations.push(...response.reservations);
      totalPages = response.totalPages;
      currentPage++;
    } while (currentPage <= totalPages);

    return allReservations;
  }

  /**
   * Get a single reservation by ID
   */
  async getReservation(
    reservationId: number,
  ): Promise<SmoobuReservation | null> {
    try {
      return await this.request<SmoobuReservation>(
        `/reservations/${reservationId}`,
      );
    } catch {
      return null;
    }
  }

  /**
   * Create a new reservation in Smoobu
   */
  async createReservation(
    data: CreateReservationInput,
  ): Promise<SmoobuReservation> {
    interface CreateResponse {
      id: number;
      referenceId: string;
      // Other fields...
    }

    const payload = {
      arrivalDate: data.arrival,
      departureDate: data.departure,
      apartmentId: data.apartmentId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? "",
      phone: data.phone ?? "",
      adults: data.adults ?? 1,
      children: data.children ?? 0,
      notice: data.notice ?? "",
      price: data.price ?? 0,
      priceStatus: data.priceStatus ?? 1, // Default to paid
      deposit: data.deposit ?? 0,
      depositStatus: data.depositStatus ?? 0,
      language: data.language ?? "en",
      // Note: channelId is optional - Smoobu will use default if not provided
    };

    const response = await this.request<CreateResponse>("/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Fetch the full reservation details
    const reservation = await this.getReservation(response.id);
    if (!reservation) {
      throw new Error("Failed to fetch created reservation");
    }

    return reservation;
  }

  /**
   * Update an existing reservation
   */
  async updateReservation(
    reservationId: number,
    data: UpdateReservationInput,
  ): Promise<SmoobuReservation> {
    const payload: Record<string, unknown> = {};

    if (data.arrival) payload.arrivalDate = data.arrival;
    if (data.departure) payload.departureDate = data.departure;
    if (data.firstName) payload.firstName = data.firstName;
    if (data.lastName) payload.lastName = data.lastName;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.adults !== undefined) payload.adults = data.adults;
    if (data.children !== undefined) payload.children = data.children;
    if (data.notice !== undefined) payload.notice = data.notice;
    if (data.price !== undefined) payload.price = data.price;
    if (data.priceStatus !== undefined) payload.priceStatus = data.priceStatus;
    if (data.deposit !== undefined) payload.deposit = data.deposit;
    if (data.depositStatus !== undefined)
      payload.depositStatus = data.depositStatus;

    await this.request(`/reservations/${reservationId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    // Fetch updated reservation
    const reservation = await this.getReservation(reservationId);
    if (!reservation) {
      throw new Error("Failed to fetch updated reservation");
    }

    return reservation;
  }

  /**
   * Cancel (delete) a reservation
   */
  async cancelReservation(reservationId: number): Promise<void> {
    await this.request(`/reservations/${reservationId}`, {
      method: "DELETE",
    });
  }

  // ==========================================================================
  // Availability & Rates
  // ==========================================================================

  /**
   * Check availability for a specific apartment and date range
   */
  async checkAvailability(params: {
    apartmentId: number;
    checkIn: string; // "YYYY-MM-DD"
    checkOut: string; // "YYYY-MM-DD"
  }): Promise<SmoobuAvailability> {
    // Get rates for the date range to check availability
    const rates = await this.getRates(
      params.apartmentId,
      params.checkIn,
      params.checkOut,
    );

    if (rates.length === 0) {
      return { available: false };
    }

    // Check if all days are available
    const allAvailable = rates.every((rate) => rate.available === 1);

    if (!allAvailable) {
      return { available: false };
    }

    // Calculate total price and min stay requirement
    const totalPrice = rates.reduce((sum, rate) => sum + rate.price, 0);
    const maxMinStay = Math.max(...rates.map((rate) => rate.minLengthOfStay));
    const nights = rates.length;

    // Check minimum stay requirement
    if (nights < maxMinStay) {
      return {
        available: false,
        minStay: maxMinStay,
      };
    }

    return {
      available: true,
      price: totalPrice,
      minStay: maxMinStay,
    };
  }

  /**
   * Get daily rates for an apartment
   */
  async getRates(
    apartmentId: number,
    from: string,
    to: string,
  ): Promise<SmoobuRate[]> {
    // Smoobu expects array parameters as apartments[]=ID
    const searchParams = new URLSearchParams();
    searchParams.append("apartments[]", apartmentId.toString());
    searchParams.append("start_date", from);
    searchParams.append("end_date", to);

    interface RatesResponse {
      data: Record<
        string,
        Record<
          string,
          {
            price: number;
            min_length_of_stay: number;
            available: number;
          }
        >
      >;
    }

    const response = await this.request<RatesResponse>(
      `/rates?${searchParams.toString()}`,
    );

    const rates: SmoobuRate[] = [];
    const apartmentData = response.data?.[apartmentId.toString()];

    if (apartmentData) {
      for (const [date, rateData] of Object.entries(apartmentData)) {
        rates.push({
          date,
          price: rateData.price,
          minLengthOfStay: rateData.min_length_of_stay,
          available: rateData.available,
        });
      }
    }

    // Sort by date
    rates.sort((a, b) => a.date.localeCompare(b.date));

    return rates;
  }

  /**
   * Get rates for multiple apartments
   */
  async getRatesForApartments(
    apartmentIds: number[],
    from: string,
    to: string,
  ): Promise<Map<number, SmoobuRate[]>> {
    if (apartmentIds.length === 0) {
      return new Map();
    }

    // Smoobu expects array parameters as apartments[]=ID for each apartment
    const searchParams = new URLSearchParams();
    for (const id of apartmentIds) {
      searchParams.append("apartments[]", id.toString());
    }
    searchParams.append("start_date", from);
    searchParams.append("end_date", to);

    interface RatesResponse {
      data: Record<
        string,
        Record<
          string,
          {
            price: number;
            min_length_of_stay: number;
            available: number;
          }
        >
      >;
    }

    const response = await this.request<RatesResponse>(
      `/rates?${searchParams.toString()}`,
    );

    const ratesMap = new Map<number, SmoobuRate[]>();

    if (response.data) {
      for (const [apartmentIdStr, apartmentData] of Object.entries(
        response.data,
      )) {
        const apartmentId = parseInt(apartmentIdStr, 10);
        const rates: SmoobuRate[] = [];

        for (const [date, rateData] of Object.entries(apartmentData)) {
          rates.push({
            date,
            price: rateData.price,
            minLengthOfStay: rateData.min_length_of_stay,
            available: rateData.available,
          });
        }

        rates.sort((a, b) => a.date.localeCompare(b.date));
        ratesMap.set(apartmentId, rates);
      }
    }

    return ratesMap;
  }

  // ==========================================================================
  // Channels
  // ==========================================================================

  /**
   * Get available booking channels
   */
  async getChannels(): Promise<{ id: number; name: string }[]> {
    interface ChannelsResponse {
      channels: { id: number; name: string }[];
    }

    const response = await this.request<ChannelsResponse>("/channels");
    return response.channels ?? [];
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getApartments();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const smoobuClient = new SmoobuClient();

// Export types for use in other modules
export type {
  SmoobuApartment as Apartment,
  SmoobuReservation as Reservation,
  SmoobuRate as Rate,
  SmoobuAvailability as Availability,
};
