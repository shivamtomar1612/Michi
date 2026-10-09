import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { DataSourceBadge, DataStatusBadge, LastVerified, isRecordStale } from "@/components/data-provenance";
import { getDestinationPhoto } from "@/features/destinations/photography";
import { PhotoCredit } from "@/components/photo-credit";

export type DestinationCardData = {
  slug: string;
  name: string;
  name_ja?: string | null;
  prefecture: string;
  region: string;
  description?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  last_verified_at?: string | null;
  next_verification_at?: string | null;
  verification_status?: string;
  data_status?: string;
};

export function DestinationCard({ destination }: { destination: DestinationCardData }) {
  const description = destination.description ?? "Description not yet verified.";
  const stale = isRecordStale(destination.next_verification_at ?? null);
  const photo = getDestinationPhoto(destination.slug);
  return <article className="group border border-ink/10 bg-white transition-colors duration-200 hover:border-ink/30">
    <Link href={`/destinations/${destination.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion">
      <div className="relative flex aspect-[4/3] items-end overflow-hidden bg-[#e9e5dc] p-5 sm:p-6">
        {photo ? <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" /> : null}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="relative z-10 flex w-full items-end justify-between gap-3 text-white"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/90">{destination.region} · {destination.prefecture}</p><h3 className="mt-2 font-serif text-3xl">{destination.name}</h3>{destination.name_ja ? <p lang="ja" className="mt-1 text-sm text-white/85">{destination.name_ja}</p> : null}</div><MapPin className="mb-1 size-5 text-white" aria-hidden="true" /></div>
      </div>
    </Link>
      {photo ? <div className="border-b border-ink/10 px-5 py-2 sm:px-6"><PhotoCredit photo={photo} className="text-ink/70" /></div> : null}
      <div className="p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-ink/55">{destination.region} · {destination.prefecture}</p>
        <p className="mt-3 min-h-[3rem] text-sm leading-6 text-ink/65">{description}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
          <><DataStatusBadge status={destination.data_status ?? "unknown"} stale={stale} /><DataSourceBadge name={destination.source_name ?? null} sourceType={destination.source_type ?? null} stale={stale} /></>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-vermilion">Explore <ArrowUpRight className="size-3.5" aria-hidden="true" /></span>
        </div>
        <LastVerified date={destination.last_verified_at ?? null} stale={stale} />
      </div>
  </article>;
}
