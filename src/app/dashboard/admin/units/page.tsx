import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { UnitsManagementClient } from "./_components/units-management-client";

export default async function AdminUnitsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Prefetch units data
  const units = await api.units.getAll();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Units Management
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Create, edit, and manage property units
        </p>
      </div>

      <UnitsManagementClient initialUnits={units} />
    </div>
  );
}
