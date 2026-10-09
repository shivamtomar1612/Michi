import type { CulturalConfidence, VerificationStatus } from "@/features/cultural-knowledge/types";
import { useLocale, useTranslations } from "next-intl";
import { formatDateTime } from "@/i18n/formatters";
import type { Locale } from "@/i18n/routing";

const quiet = "inline-flex items-center border border-ink/15 px-2 py-1 text-[11px] tracking-wide text-ink/70";
export function SourceBadge({ sourceType, sourceName }: { sourceType: string; sourceName?: string }) {
  const t = useTranslations("Evidence");
  const key = sourceType === "host" ? "sourceHost" : sourceType === "government" ? "sourceGovernment" : sourceType === "national_tourism_board" ? "sourceNationalTourism" : sourceType === "municipality" || sourceType === "dmo" ? "sourceLocalTourism" : sourceType === "museum" || sourceType === "temple_shrine" || sourceType === "cultural_institution" ? "sourceInstitution" : "sourceEditorial";
  return <span className={quiet} title={sourceName}>{t(key)}</span>;
}
export function VerificationBadge({ status }: { status: VerificationStatus | string }) {
  const t = useTranslations("Evidence");
  const keys: Record<string, "officialVerified" | "communityVerified" | "pendingReview" | "rejected" | "unverified"> = { official_verified: "officialVerified", community_verified: "communityVerified", pending_review: "pendingReview", rejected: "rejected", unverified: "unverified" };
  const key = keys[status];
  return <span className={quiet}>{key ? t(key) : status}</span>;
}
export function ConfidenceBadge({ confidence }: { confidence: CulturalConfidence }) {
  const t = useTranslations("Evidence");
  const style = confidence === "high" ? "border-moss/35 text-moss" : confidence === "medium" ? "border-amber-700/35 text-amber-800" : "border-vermilion/35 text-vermilion";
  return <span className={quiet + " " + style}>{t("confidence", { level: t(confidence) })}</span>;
}
export function StaleWarning({ record }: { record: { stale: boolean; lastVerifiedAt: string | null; limitations: string[] } }) {
  const t = useTranslations("Evidence");
  const locale = useLocale() as Locale;
  if (!record.stale && !record.limitations.some((item) => item.toLowerCase().includes("conflicting"))) return null;
  return <p role="status" className="border-l-2 border-vermilion bg-[#fbf1ed] px-3 py-2 text-xs text-ink/80">{record.stale ? t("staleWarning") : t("conflictWarning")}{record.lastVerifiedAt ? ` ${t("lastChecked", { date: formatDateTime(record.lastVerifiedAt, locale, "Asia/Tokyo", { dateStyle: "medium" }) })}` : ""}</p>;
}
export function CulturalSources({ sources }: { sources: Array<{ name: string; url: string; authority: number; status: string }> }) {
  const t = useTranslations("Evidence");
  return <ul className="grid gap-2">{sources.map((source) => <li key={source.url} className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 py-3 text-sm"><a href={source.url} target="_blank" rel="noreferrer" className="underline decoration-ink/30 underline-offset-2">{source.name}</a><span className="text-xs text-ink/60">{t("authority", { level: source.authority, status: source.status })}</span></li>)}</ul>;
}
