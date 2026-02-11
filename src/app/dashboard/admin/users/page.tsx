import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { UsersManagementClient } from "./_components/users-management-client";

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Prefetch users data
  const users = await api.admin.getAllUsers();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          User Management
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Manage user roles and account status
        </p>
      </div>

      <UsersManagementClient initialUsers={users} />
    </div>
  );
}
