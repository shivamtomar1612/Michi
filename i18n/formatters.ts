import type { Locale } from "./routing";

const localeTag: Record<Locale, string> = { en: "en-JP", ja: "ja-JP" };

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag[locale]).format(value);
}

export function formatCurrency(value: number, locale: Locale, currency = "JPY"): string {
  return new Intl.NumberFormat(localeTag[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}

export function formatDateTime(
  value: string | number | Date,
  locale: Locale,
  timeZone = "Asia/Tokyo",
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Intl.DateTimeFormat(localeTag[locale], { ...options, timeZone }).format(new Date(value));
}

export function formatRelativeTime(value: number, locale: Locale, unit: Intl.RelativeTimeFormatUnit): string {
  return new Intl.RelativeTimeFormat(localeTag[locale], { numeric: "auto" }).format(value, unit);
}
