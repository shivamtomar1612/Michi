import { Badge } from "@/components/ui/badge";

const statusCopy: Record<string, string> = {
  verified_official: "Verified official",
  verified_primary: "Verified operator source",
  official_tourism: "Official tourism source",
  host_provided: "Host provided",
  community_provided: "Community provided",
  unverified: "Unverified",
  unknown: "Not yet verified",
};

export function DataStatusBadge({ status, stale = false }: { status: string; stale?: boolean }) {
  const label = stale ? "Stale · check official source" : statusCopy[status] ?? "Not yet verified";
  return <Badge className={stale ? "border-[#8b4b2f]/30 bg-[#f6e9e0] text-[#733821]" : "border-ink/15 bg-paper text-ink/75"}>{label}</Badge>;
}

export function DataSourceBadge({ name, sourceType, stale = false }: { name: string | null; sourceType: string | null; stale?: boolean }) {
  const label = stale ? "Source needs a fresh check" : sourceType === "primary_operator" ? "Official operator source" : name ? "Official tourism source" : "Source not recorded";
  return <span className="inline-flex items-center border-l-2 border-moss pl-2 text-[11px] font-medium text-ink/65" title={name ?? undefined}>{label}</span>;
}

export function LastVerified({ date, stale = false }: { date: string | null; stale?: boolean }) {
  if (!date) return <p className="text-xs text-ink/55">Verification date not recorded</p>;
  const formatted = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(date));
  return <p className="text-xs text-ink/55">{stale ? "Last verified" : "Last checked"} {formatted}</p>;
}

export function OfficialSourceLink({ href, label = "Official information" }: { href: string | null; label?: string }) {
  if (!href) return <span className="text-xs text-ink/55">Official link not yet available</span>;
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-sm font-semibold text-vermilion underline decoration-vermilion/30 underline-offset-4 hover:decoration-vermilion">{label}<span className="sr-only"> (opens in a new tab)</span></a>;
}

export function isRecordStale(nextVerificationAt: string | null): boolean {
  return nextVerificationAt !== null && new Date(nextVerificationAt).getTime() < Date.now();
}
