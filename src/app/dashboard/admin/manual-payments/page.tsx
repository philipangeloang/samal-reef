import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";
import { ManualPaymentsTabs } from "./_components/manual-payments-tabs";

export default async function AdminManualPaymentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Prefetch data in parallel
  const [pendingReviews, paymentMethods] = await Promise.all([
    api.manualPayment.getPendingReviews(),
    api.manualPayment.getAllMethods(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-4xl font-bold text-transparent">
          Manual Payments
        </h1>
        <p className="mt-2 text-cyan-100/70">
          Review payment submissions and manage payment methods
        </p>
      </div>

      <ManualPaymentsTabs
        initialPendingReviews={pendingReviews}
        initialPaymentMethods={paymentMethods}
      />
    </div>
  );
}
