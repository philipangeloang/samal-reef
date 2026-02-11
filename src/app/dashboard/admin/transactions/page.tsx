import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { TransactionsManagementClient } from "./_components/transactions-management-client";

export default async function AdminTransactionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch first page of transactions
  const transactionsData = await api.admin.getAllTransactions({ page: 1, limit: 20 });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Transaction Management
        </h1>
        <p className="mt-2 text-cyan-100/70">
          View and manage all property ownership transactions
        </p>
      </div>

      <TransactionsManagementClient initialData={transactionsData} />
    </div>
  );
}
