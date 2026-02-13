import { HydrateClient, api } from "@/trpc/server";
import { notFound } from "next/navigation";
import { OwnershipClient } from "./_components/ownership-client";

interface OwnershipPageProps {
  params: Promise<{ collectionId: string }>;
}

export default async function OwnershipPage({ params }: OwnershipPageProps) {
  const { collectionId } = await params;
  const id = parseInt(collectionId, 10);

  if (isNaN(id)) {
    notFound();
  }

  // Fetch collection details
  const collection = await api.collection.getById({ id }).catch(() => null);

  if (!collection || !collection.isActive) {
    notFound();
  }

  // Fetch pricing tiers
  const pricingTiers = await api.pricing.getTiersByCollection({
    collectionId: id,
  });

  // Fetch tier availability
  const tierAvailability = await api.pricing.getCollectionAvailability({
    collectionId: id,
  });

  // Fetch manual payment methods
  const manualPaymentMethods = await api.manualPayment.getMethods();

  return (
    <HydrateClient>
      <OwnershipClient
        collection={{
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          description: collection.description,
          imageUrl: collection.imageUrl,
          location: collection.location,
          totalUnits: 0, // We can update this if needed
          pricingTiers: pricingTiers,
          tierAvailability,
        }}
        manualPaymentMethods={manualPaymentMethods}
      />
    </HydrateClient>
  );
}
