import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataSourceBadge, DataStatusBadge, LastVerified, isRecordStale } from "@/components/data-provenance";
import type { PublicExternalExperience } from "@/server/data/catalogue";

export function ExperienceCard({ experience, destinationName }: { experience: PublicExternalExperience; destinationName: string }) {
  const stale = isRecordStale(experience.next_verification_at ?? null);
  return <article className="group border border-ink/10 bg-white transition-colors duration-200 hover:border-ink/30">
    <Link href={`/experiences/${experience.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion">
      <div className="relative flex aspect-[4/3] items-end overflow-hidden bg-[#e9e5dc] p-5 sm:p-6">
        <div aria-hidden="true" className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(135deg,transparent 48%,rgba(60,81,65,.12) 49%,transparent 50%),linear-gradient(45deg,transparent 55%,rgba(150,74,54,.10) 56%,transparent 57%)", backgroundSize: "80px 80px,110px 110px" }} />
        <div className="relative z-10"><p className="eyebrow">External listing</p><h3 className="mt-3 max-w-sm font-serif text-3xl leading-tight">{experience.title}</h3></div>
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
