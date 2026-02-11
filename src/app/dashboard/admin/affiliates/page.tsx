import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { AffiliatesManagementClient } from "./_components/affiliates-management-client";

export default async function AdminAffiliatesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Prefetch affiliates data
  const affiliates = await api.affiliate.getAllAffiliates();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Affiliate Management
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Invite and manage affiliate partners
        </p>
      </div>

      <AffiliatesManagementClient initialAffiliates={affiliates} />
    </div>
  );
}
