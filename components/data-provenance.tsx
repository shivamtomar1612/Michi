import { Badge } from "@/components/ui/badge";
import { useLocale, useTranslations } from "next-intl";
import { formatDateTime } from "@/i18n/formatters";
import type { Locale } from "@/i18n/routing";

export function DataStatusBadge({ status, stale = false }: { status: string; stale?: boolean }) {
  const t = useTranslations("Evidence");
  const statusKeys: Record<string, "officialVerified" | "verifiedOperator" | "officialTourism" | "hostProvidedData" | "communityProvidedData" | "unverified" | "notYetVerified"> = {
    verified_official: "officialVerified", verified_primary: "verifiedOperator", official_tourism: "officialTourism",
    host_provided: "hostProvidedData", community_provided: "communityProvidedData", unverified: "unverified", unknown: "notYetVerified",
  };
  const label = stale ? t("staleLabel") : t(statusKeys[status] ?? "notYetVerified");
  return <Badge className={stale ? "border-[#8b4b2f]/30 bg-[#f6e9e0] text-[#733821]" : "border-ink/15 bg-paper text-ink/75"}>{label}</Badge>;
}

export function DataSourceBadge({ name, sourceType, stale = false }: { name: string | null; sourceType: string | null; stale?: boolean }) {
  const t = useTranslations("Evidence");
  const label = stale ? t("sourceNeedsRefresh") : sourceType === "primary_operator" ? t("verifiedOperator") : name ? t("officialTourism") : t("sourceNotRecorded");
  return <span className="inline-flex items-center border-l-2 border-moss pl-2 text-[11px] font-medium text-ink/65" title={name ?? undefined}>{label}</span>;
}

export function LastVerified({ date, stale = false }: { date: string | null; stale?: boolean }) {
  const t = useTranslations("Evidence");
  const locale = useLocale() as Locale;
  if (!date) return <p className="text-xs text-ink/55">{t("verificationDateMissing")}</p>;
  return <p className="text-xs text-ink/55">{stale ? t("lastVerified") : t("lastChecked")} {formatDateTime(date, locale, "Asia/Tokyo", { dateStyle: "medium" })}</p>;
}

export function OfficialSourceLink({ href, label }: { href: string | null; label?: string }) {
  const t = useTranslations("Evidence");
  if (!href) return <span className="text-xs text-ink/55">{t("officialLinkUnavailable")}</span>;
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-sm font-semibold text-vermilion underline decoration-vermilion/30 underline-offset-4 hover:decoration-vermilion">{label ?? t("officialInformation")}<span className="sr-only"> ({t("newTab")})</span></a>;
}

export function isRecordStale(nextVerificationAt: string | null): boolean {
  return nextVerificationAt !== null && new Date(nextVerificationAt).getTime() < Date.now();
}
