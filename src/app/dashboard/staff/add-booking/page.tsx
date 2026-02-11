import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { AddBookingForm } from "./_components/add-booking-form";

export default async function AddBookingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Only allow STAFF or ADMIN role
  if (session.user.role !== "STAFF" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  // Fetch collections
  const collections = await api.collection.getAll();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Add Booking Entry
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Create a new booking record for admin approval
        </p>
      </div>

      {/* Form */}
      <AddBookingForm
        collections={collections}
        isAdmin={session.user.role === "ADMIN"}
      />
    </div>
  );
}
