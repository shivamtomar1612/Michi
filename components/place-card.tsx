import { CircleHelp } from "lucide-react";
import { DataSourceBadge, DataStatusBadge, LastVerified, OfficialSourceLink, isRecordStale } from "@/components/data-provenance";
import type { PublicPlace } from "@/server/data/catalogue";

export function PlaceCard({ place }: { place: PublicPlace }) {
  const stale = isRecordStale(place.next_verification_at);
  return <article className="border-t border-ink/15 py-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{place.place_type.replaceAll("_", " ")}</p><h3 className="mt-2 font-serif text-2xl">{place.name}</h3>{place.name_ja ? <p lang="ja" className="mt-1 text-sm text-ink/60">{place.name_ja}</p> : null}</div><DataStatusBadge status={place.data_status} stale={stale} /></div>
    {place.short_description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">{place.short_description}</p> : null}
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-ink/55">Opening hours</dt><dd className="mt-1">{place.opening_hours_text ?? "Not yet verified · check the official site before visiting"}</dd></div>
      <div><dt className="text-xs text-ink/55">Admission</dt><dd className="mt-1">{place.admission_text ?? "Not yet verified"}</dd></div>
    </dl>
    {place.accessibility_status !== "verified" ? <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/60"><CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Accessibility information has not yet been verified.</p> : null}
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2"><OfficialSourceLink href={place.official_url ?? place.source_url} /><DataSourceBadge name={place.source_name} sourceType={place.source_type} stale={stale} /></div>
    <LastVerified date={place.last_verified_at} stale={stale} />
  </article>;
}
