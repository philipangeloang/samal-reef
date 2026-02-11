import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { SmoobuSettingsClient } from "./_components/smoobu-settings-client";

export default async function SmoobuSettingsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const units = await api.booking.getUnitsForLinking();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Smoobu Settings
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Manage Smoobu integration and unit linking
        </p>
      </div>

      <SmoobuSettingsClient initialUnits={units} />
    </div>
  );
}
