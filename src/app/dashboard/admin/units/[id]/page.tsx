import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { UnitDetailsClient } from "./_components/unit-details-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UnitDetailPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;

  // Only admins can access this page
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const unitId = parseInt(id);

  if (isNaN(unitId)) {
    redirect("/dashboard/admin/units");
  }

  try {
    const unitDetails = await api.units.getById({ id: unitId });

    return (
      <div className="space-y-8">
        <UnitDetailsClient initialData={unitDetails} />
      </div>
    );
  } catch (error) {
    redirect("/dashboard/admin/units");
  }
}
