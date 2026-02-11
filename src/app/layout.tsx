import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Suspense } from "react";

import { TRPCReactProvider } from "@/trpc/react";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { AffiliateTracker } from "@/components/affiliate-tracker";

export const metadata: Metadata = {
  title: "Reef Resort - Fractional Resort Ownership",
  description: "Invest in fractional resort ownership with crypto or fiat",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${geist.variable}`}>
      <body className="bg-gray-900 text-white antialiased">
        <SessionProvider>
          <TRPCReactProvider>
            <Suspense fallback={null}>
              <AffiliateTracker />
            </Suspense>
            <SiteHeader />
            <div className="min-h-screen">{children}</div>
            <Toaster />
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
