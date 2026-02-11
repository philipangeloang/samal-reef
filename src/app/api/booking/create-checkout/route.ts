import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";

const requestSchema = z.object({
  bookingId: z.number().int().positive(),
  totalPrice: z.number().positive(),
  collectionName: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  nights: z.number().int().positive(),
  guestEmail: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);

    // Format dates for display (parse without timezone conversion)
    const formatDateStr = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year!, month! - 1, day);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };
    const checkInDate = formatDateStr(data.checkIn);
    const checkOutDate = formatDateStr(data.checkOut);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "php",
            product_data: {
              name: `${data.collectionName} - ${data.nights} Night Stay`,
              description: `Check-in: ${checkInDate} | Check-out: ${checkOutDate}`,
            },
            unit_amount: Math.round(data.totalPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${env.NEXT_PUBLIC_APP_URL}/book/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${data.bookingId}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/book/cancelled?booking_id=${data.bookingId}`,
      customer_email: data.guestEmail,
      metadata: {
        type: "BOOKING",
        bookingId: data.bookingId.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Failed to create booking checkout:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
