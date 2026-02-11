import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { CommissionsManagementClient } from "./_components/commissions-management-client";

export default async function AdminCommissionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Prefetch all commissions
  const allCommissions = await api.admin.getAllCommissions({});

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Commission Management
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Process and track affiliate commission payments
        </p>
      </div>

      <CommissionsManagementClient initialCommissions={allCommissions} />
    </div>
  );
}
