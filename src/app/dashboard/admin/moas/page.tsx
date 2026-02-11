import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { MoaManagementClient } from "./_components/moa-management-client";

export default async function AdminMoaManagementPage() {
  const session = await auth();

  // Admin-only page
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all MOA statuses
  const allMoas = await api.admin.getAllMoaStatuses();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          MOA Management
        </h1>
        <p className="mt-2 text-cyan-100/70">
          View and manage all Memorandum of Agreement documents
        </p>
      </div>

      {/* Client Component with Filters */}
      <MoaManagementClient initialMoas={allMoas} />
    </div>
  );
}
