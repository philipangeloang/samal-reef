"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Wallet } from "lucide-react";
import { getAffiliateCode } from "@/hooks/use-affiliate-tracking";

type ManualPaymentMethod = {
  id: string;
  name: string;
};

interface ManualPaymentButtonProps {
  collectionId: number;
  tierId: number;
  tierLabel: string;
  isAvailable: boolean;
  manualPaymentMethods: ManualPaymentMethod[];
}

export function ManualPaymentButton({
  collectionId,
  tierId,
  tierLabel,
  isAvailable,
  manualPaymentMethods,
}: ManualPaymentButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectMethod = (methodId: string) => {
    const affiliateCode = getAffiliateCode();
    const params = new URLSearchParams({
      collection: collectionId.toString(),
      tier: tierId.toString(),
      method: methodId,
    });

    if (affiliateCode) {
      params.set("ref", affiliateCode);
    }

    router.push(`/purchase/manual?${params.toString()}`);
  };

  if (!isAvailable) {
    return (
      <Button
        className="w-full bg-gradient-to-r from-gray-500/90 to-gray-600/90 text-white"
        size="sm"
        disabled
      >
        Sold Out
      </Button>
    );
  }

  if (manualPaymentMethods.length === 0) {
    return (
      <Button
        className="w-full bg-gradient-to-r from-gray-500/90 to-gray-600/90 text-white"
        size="sm"
        disabled
      >
        Not Available
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          className="w-full bg-gradient-to-r from-cyan-500/90 to-blue-500/90 text-white hover:from-cyan-500 hover:to-blue-500"
          size="sm"
        >
          <Wallet className="mr-2 h-3.5 w-3.5" />
          Pay {tierLabel}
          <ChevronDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="w-48 border-cyan-500/30 bg-gray-900"
      >
        {manualPaymentMethods.map((method) => (
          <DropdownMenuItem
            key={method.id}
            onClick={() => handleSelectMethod(method.id)}
            className="cursor-pointer text-cyan-100 hover:bg-cyan-500/20 hover:text-white focus:bg-cyan-500/20 focus:text-white"
          >
            {method.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
