import { redirect, notFound } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { UserDetailClient } from "./_components/user-detail-client";

interface UserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const session = await auth();

  // Admin-only page
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const resolvedParams = await params;

  // Fetch user detail data
  let userData;
  try {
    userData = await api.admin.getUserDetail({ userId: resolvedParams.userId });
  } catch (error) {
    // User not found
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          User Details
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Comprehensive view of user profile and activity
        </p>
      </div>

      <UserDetailClient userData={userData} />
    </div>
  );
}
