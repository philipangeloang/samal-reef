import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { RmaManagementClient } from "./_components/rma-management-client";

export default async function AdminRmaManagementPage() {
  const session = await auth();

  // Admin-only page
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all RMA statuses
  const allRmas = await api.admin.getAllRmaStatuses();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          RMA Management
        </h1>
        <p className="mt-2 text-cyan-100/70">
          View and manage all Rental Management Agreement documents
        </p>
      </div>

      {/* Client Component with Filters */}
      <RmaManagementClient initialRmas={allRmas} />
    </div>
  );
}
