// TEMPORARY: Coming Soon page — restore original below when ready
// import { HydrateClient, api } from "@/trpc/server";
// import { FinalCTA } from "./_components/final-cta";
// import { HeroSection } from "./_components/hero-section";
// import { CollectionShowcase } from "./_components/collection-showcase";
// import { InvestmentValue } from "./_components/investment-value";
// import { TestimonialsSection } from "./_components/testimonials-section";
// import { FAQSection } from "./_components/faq-section";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-[#0a1929] via-[#0d1f31] to-[#0f2435] px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
          Reef Resort
        </h1>
        <p className="mt-4 text-xl text-cyan-300/80 sm:text-2xl">
          Coming Soon
        </p>
        <div className="mx-auto mt-8 h-px w-24 bg-cyan-400/40" />
        <p className="mt-8 max-w-md text-sm text-cyan-100/50">
          We&apos;re building something special. Stay tuned.
        </p>
      </div>
    </main>
  );
}

// ORIGINAL LANDING PAGE — uncomment imports above and this block, then remove the Coming Soon function:
/*
export default async function Home() {
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
        <FAQSection />
        <FinalCTA />
      </main>
    </HydrateClient>
  );
}
*/
