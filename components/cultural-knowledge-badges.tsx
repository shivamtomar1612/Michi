import type { CulturalConfidence, VerificationStatus } from "@/features/cultural-knowledge/types";

const quiet = "inline-flex items-center border border-ink/15 px-2 py-1 text-[11px] tracking-wide text-ink/70";
export function SourceBadge({ sourceType, sourceName }: { sourceType: string; sourceName?: string }) {
  const label = sourceType === "host" ? "MICHI host" : sourceType === "government" ? "Government source" : sourceType === "national_tourism_board" ? "National tourism source" : sourceType === "municipality" || sourceType === "dmo" ? "Local tourism source" : sourceType === "museum" || sourceType === "temple_shrine" || sourceType === "cultural_institution" ? "Cultural institution" : "Editorial source";
  return <span className={quiet} title={sourceName}>{label}</span>;
}
export function VerificationBadge({ status }: { status: VerificationStatus | string }) {
  const labels: Record<string, string> = { official_verified: "Officially verified", community_verified: "Community verified", pending_review: "Pending review", rejected: "Rejected", unverified: "Unverified" };
  return <span className={quiet}>{labels[status] ?? status}</span>;
}
export function ConfidenceBadge({ confidence }: { confidence: CulturalConfidence }) {
  const style = confidence === "high" ? "border-moss/35 text-moss" : confidence === "medium" ? "border-amber-700/35 text-amber-800" : "border-vermilion/35 text-vermilion";
  return <span className={quiet + " " + style}>{confidence[0]!.toUpperCase() + confidence.slice(1)} confidence</span>;
}
export function StaleWarning({ record }: { record: { stale: boolean; lastVerifiedAt: string | null; limitations: string[] } }) {
  if (!record.stale && !record.limitations.some((item) => item.toLowerCase().includes("conflicting"))) return null;
  return <p role="status" className="border-l-2 border-vermilion bg-[#fbf1ed] px-3 py-2 text-xs text-ink/80">{record.stale ? "This information is stale or has no verification date." : "Equal-authority sources conflict; an administrator must review the evidence."}{record.lastVerifiedAt ? " Last checked " + new Date(record.lastVerifiedAt).toLocaleDateString() + "." : ""}</p>;
}
export function CulturalSources({ sources }: { sources: Array<{ name: string; url: string; authority: number; status: string }> }) {
  return <ul className="grid gap-2">{sources.map((source) => <li key={source.url} className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 py-3 text-sm"><a href={source.url} target="_blank" rel="noreferrer" className="underline decoration-ink/30 underline-offset-2">{source.name}</a><span className="text-xs text-ink/60">Authority {source.authority}/5 · {source.status}</span></li>)}</ul>;
}
