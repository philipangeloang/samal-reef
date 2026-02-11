import { HydrateClient, api } from "@/trpc/server";

import { FinalCTA } from "./_components/final-cta";
import { HeroSection } from "./_components/hero-section";
import { CollectionShowcase } from "./_components/collection-showcase";
import { InvestmentValue } from "./_components/investment-value";
import { FAQSection } from "./_components/faq-section";

export default async function Home() {
  // Fetch data in parallel
  const [glamphouseCollection, arkpadCollection, manualPaymentMethods] =
    await Promise.all([
      api.collection.getBySlugWithDetails({ slug: "glamphouse" }),
      api.collection.getBySlugWithDetails({ slug: "arkpad" }),
      api.manualPayment.getMethods(),
    ]);

  const [glamphousTierAvailability, arkpadTierAvailability] = await Promise.all(
    [
      glamphouseCollection
        ? api.pricing.getCollectionAvailability({
            collectionId: glamphouseCollection.id,
          })
        : {},
      arkpadCollection
        ? api.pricing.getCollectionAvailability({
            collectionId: arkpadCollection.id,
          })
        : {},
    ],
  );

  // Prepare collections array for carousel
  const collections = [
    ...(glamphouseCollection
      ? [
          {
            ...glamphouseCollection,
            tierAvailability: glamphousTierAvailability,
            available: true,
          },
        ]
      : []),
    ...(arkpadCollection
      ? [
          {
            ...arkpadCollection,
            tierAvailability: arkpadTierAvailability,
            available: true,
          },
        ]
      : []),
  ];

  return (
    <HydrateClient>
      <main className="min-h-screen">
        <HeroSection />
        <CollectionShowcase
          collections={collections}
          manualPaymentMethods={manualPaymentMethods}
        />
        <InvestmentValue />
        {/* <TestimonialsSection /> */}
        <FAQSection />
        <FinalCTA />
      </main>
    </HydrateClient>
  );
}
