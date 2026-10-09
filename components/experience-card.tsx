import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataSourceBadge, DataStatusBadge, LastVerified, isRecordStale } from "@/components/data-provenance";
import type { PublicExternalExperience } from "@/server/data/catalogue";

export function ExperienceCard({ experience, destinationName }: { experience: PublicExternalExperience; destinationName: string }) {
  const stale = isRecordStale(experience.next_verification_at ?? null);
  return <article className="group border border-ink/10 bg-white transition-colors duration-200 hover:border-ink/30">
    <Link href={`/experiences/${experience.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion">
      <div className="flex min-h-52 items-end border-b border-ink/10 bg-paper-deep p-5 transition-colors group-hover:bg-[#e8e4da] sm:p-6">
        <div><p className="eyebrow">External information · {destinationName}</p><h3 className="mt-3 max-w-sm font-serif text-3xl leading-tight">{experience.title}</h3></div>
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-xs text-ink/60">{experience.operator_name}</p>
        {experience.short_description ? <p className="mt-3 text-sm leading-6 text-ink/70">{experience.short_description}</p> : null}
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink/10 pt-4 text-xs text-ink/70">
          <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden="true" />{destinationName}</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden="true" />{experience.duration_minutes ? `${experience.duration_minutes} minutes` : "Duration not verified"}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><Badge>{experience.category ?? "Experience"}</Badge><DataStatusBadge status={experience.data_status ?? "unknown"} stale={stale} /><DataSourceBadge name={experience.source_name ?? null} sourceType={experience.source_type ?? null} stale={stale} /></div>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-vermilion">View official experience <ArrowUpRight className="size-3.5" aria-hidden="true" /></span>
        <LastVerified date={experience.last_verified_at ?? null} stale={stale} />
      </div>
    </Link>
  </article>;
}
