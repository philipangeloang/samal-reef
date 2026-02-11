import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { PricingManagementClient } from "./_components/pricing-management-client";

export default async function AdminPricingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Prefetch pricing tiers data
  const tiers = await api.pricing.getAllTiers();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Pricing Management
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Manage pricing tiers for unit ownership
        </p>
      </div>

      <PricingManagementClient initialTiers={tiers} />
    </div>
  );
}
