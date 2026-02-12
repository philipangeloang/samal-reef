/**
 * Site Configuration
 *
 * All deployment-specific settings live here.
 * When cloning this repo for a new country/property, update this file.
 */
export const siteConfig = {
  currency: {
    code: "PHP" as string,        // ISO 4217 currency code (e.g., "PHP", "USD", "EUR")
    symbol: "₱",                  // Display symbol (e.g., "₱", "$", "€")
    locale: "en-PH",              // Intl locale for number formatting
  },
} as const;
