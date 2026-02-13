import { siteConfig } from "@/site.config";

const { code, symbol, locale } = siteConfig.currency;

/** Format a number as currency using site config (e.g., "₱1,200.00") */
export function formatCurrency(amount: number | string, decimals = 2): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${symbol}0`;
  return `${symbol}${num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format without decimals (e.g., "₱1,200") */
export function formatCurrencyRound(amount: number | string): string {
  return formatCurrency(amount, 0);
}

/** PDF-safe format using currency code instead of symbol (e.g., "PHP 1,200.00") */
export function formatCurrencyPdf(amount: number | string, decimals = 2): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${code} 0`;
  return `${code} ${num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Just the currency code (e.g., "PHP") */
export const currencyCode = code;

/** Just the currency symbol (e.g., "₱") */
export const currencySymbol = symbol;
