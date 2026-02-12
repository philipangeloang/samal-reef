/**
 * Site Configuration
 *
 * All deployment-specific settings live here.
 * When cloning this repo for a new country/property, update this file.
 */
export const siteConfig = {
  /** Database table prefix for multi-project schema (Drizzle pgTableCreator) */
  tablePrefix: "samal-reef" as string,

  brand: {
    name: "Reef Resort" as string,
    tagline: "Fractional Resort Ownership" as string,
  },
  emails: {
    noreply: "noreply@reefresort.co" as string,
    support: "support@reefresort.co" as string,
    admin: "admin@reefresort.co" as string,
    sales: "sales@arkpad.co" as string,
  },
  company: {
    legalName: "ARK-MARINE CONSTRUCTION, INC." as string,
    dba: "SAMAL REEF RESORTS" as string,
    defaultManager: "MITCHELL SUCHNER" as string,
  },
  location: {
    country: "Philippines" as string,
    city: "Davao City" as string,
    jurisdiction: "Island Garden City of Samal, Davao del Norte" as string,
  },
  currency: {
    code: "PHP" as string,        // ISO 4217 currency code (e.g., "PHP", "USD", "EUR")
    symbol: "₱",                  // Display symbol (e.g., "₱", "$", "€")
    locale: "en-PH",              // Intl locale for number formatting
  },
  social: {
    facebook: "https://www.facebook.com/reefresortofficial/",
    instagram: "https://www.instagram.com/reefresort.official/",
    tiktok: "https://www.tiktok.com/@reefresort.official",
  },
  integrations: {
    /** DePay crypto payment widget script URL */
    depayWidgetScript: "https://integrate.depay.com/widgets/v13.js",
    /** Smoobu channel manager API base URL */
    smoobuBaseUrl: "https://login.smoobu.com/api",
  },
} as const;
