import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { SubmissionsClient } from "./_components/submissions-client";

export default async function SubmissionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Only allow STAFF or ADMIN role
  if (session.user.role !== "STAFF" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          My Submissions
        </h1>
        <p className="mt-2 text-cyan-100/70">
          View the status of your ownership and booking entries
        </p>
      </div>

      {/* Submissions Table */}
      <SubmissionsClient />
    </div>
  );
}
