import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { CollectionsManagementClient } from "./_components/collections-management-client";

export default async function AdminCollectionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Prefetch collections data
  const collections = await api.collection.getAll();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Collections Management
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Create, edit, and manage property collections
        </p>
      </div>

      <CollectionsManagementClient initialCollections={collections} />
    </div>
  );
}
