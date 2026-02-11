"use client";

import { useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { ManualPaymentsClient } from "./manual-payments-client";
import { PaymentMethodsManager } from "./payment-methods-manager";
import { cn } from "@/lib/utils";
import { ClipboardCheck, CreditCard } from "lucide-react";

type PendingReview = RouterOutputs["manualPayment"]["getPendingReviews"][number];
type PaymentMethod = RouterOutputs["manualPayment"]["getAllMethods"][number];

interface ManualPaymentsTabsProps {
  initialPendingReviews: PendingReview[];
  initialPaymentMethods: PaymentMethod[];
}

type TabValue = "reviews" | "methods";

export function ManualPaymentsTabs({
  initialPendingReviews,
  initialPaymentMethods,
}: ManualPaymentsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("reviews");

  const tabs = [
    {
      value: "reviews" as const,
      label: "Pending Reviews",
      icon: ClipboardCheck,
      count: initialPendingReviews.length,
    },
    {
      value: "methods" as const,
      label: "Payment Methods",
      icon: CreditCard,
      count: initialPaymentMethods.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-cyan-500/20 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-cyan-100/60 hover:bg-cyan-500/10 hover:text-cyan-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    "ml-1 rounded-full px-2 py-0.5 text-xs",
                    activeTab === tab.value
                      ? "bg-cyan-400/30 text-cyan-200"
                      : "bg-gray-700 text-gray-400",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "reviews" && (
        <ManualPaymentsClient initialPendingReviews={initialPendingReviews} />
      )}
      {activeTab === "methods" && (
        <PaymentMethodsManager initialMethods={initialPaymentMethods} />
      )}
    </div>
  );
}
