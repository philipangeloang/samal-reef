"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { siteConfig } from "@/site.config";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is seasteading?",
    answer:
      "Seasteading is the concept of creating permanent dwellings at sea, called seasteads. This represents a pioneering approach to sustainable ocean living.",
  },
  {
    question: "How does fractional ownership work?",
    answer:
      "Fractional ownership allows you to purchase a percentage of a property, from as little as 1% up to 100%. Your ownership percentage determines your usage rights, share of rental income, and voting power in property decisions.",
  },
  {
    question: "How can I purchase a share?",
    answer:
      "You can purchase ownership through our platform using cryptocurrency or traditional payment methods. Simply browse available properties, select your desired ownership percentage, complete KYC verification, and finalize your purchase through our secure checkout process.",
  },
  {
    question: "What perks do I get as an owner?",
    answer:
      "As an owner, you receive usage rights to stay at your property based on your ownership tier, earn yield from eco-resort operations, participate in community governance, and enjoy the unique experience of being part of a pioneering ocean community.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-gradient-to-b from-[#0f2435] via-[#0d2039] to-[#0b1c2e] py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center justify-center rounded-full bg-cyan-400/10 p-4">
            <HelpCircle className="h-10 w-10 text-cyan-400" />
          </div>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            <span className="bg-linear-to-r from-cyan-300 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
              Questions?
            </span>{" "}
            <span className="text-white">We Have Answers</span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-cyan-50/90 md:text-xl">
            Everything you need to know about investing in {siteConfig.brand.name}
          </p>
        </div>

        <div className="mx-auto max-w-4xl space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/40 to-[#0a1929]/40 backdrop-blur-sm transition-all hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-cyan-400/5"
              >
                <h3 className="pr-8 text-lg font-semibold text-cyan-100">
                  {faq.question}
                </h3>
                <ChevronDown
                  className={`h-6 w-6 flex-shrink-0 text-cyan-400 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="border-t border-cyan-400/20 px-6 pt-4 pb-6">
                  <p className="leading-relaxed text-cyan-50/80">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
