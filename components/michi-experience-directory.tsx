import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3, Users } from "lucide-react";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { PublicDestination, PublicMichiExperience } from "@/server/data/catalogue";

function imageUrl(path: string) {
  const config = getSupabasePublicConfig();
  return config ? `${config.url}/storage/v1/object/public/experience-images/${path.split("/").map(encodeURIComponent).join("/")}` : null;
}

export function MichiExperienceDirectory({ experiences, destinations }: { experiences: PublicMichiExperience[]; destinations: PublicDestination[] }) {
  const destinationById = new Map(destinations.map((item) => [item.id, item]));
  return <section className="container-editorial py-10" aria-labelledby="michi-experiences-title">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5"><div><p className="eyebrow">Available through MICHI</p><h2 id="michi-experiences-title" className="mt-2 font-serif text-3xl">Hosted with community consent.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">These listings are managed by verified MICHI hosts. Availability appears only when a host has added a real date and capacity.</p></div><span className="text-xs text-ink/55">{experiences.length} verified {experiences.length === 1 ? "experience" : "experiences"}</span></div>
    {experiences.length ? <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{experiences.map((experience) => {
      const destination = destinationById.get(experience.destination_id);
      const src = experience.image_paths[0] ? imageUrl(experience.image_paths[0]) : null;
      return <article key={experience.id} className="group border border-ink/15 bg-white">
        <Link href={`/experiences/${experience.slug}`} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion">
          <div className="relative aspect-[4/3] bg-[#e9e5dc]">{src ? <Image src={src} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" /> : <div className="flex h-full items-end p-4"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Host experience</span></div>}</div>
          <div className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/55">{destination?.name ?? "Destination"} · Verified MICHI host</p><h3 className="mt-2 font-serif text-2xl">{experience.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/65">{experience.short_description}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink/60"><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{experience.duration_minutes} minutes</span><span className="inline-flex items-center gap-1.5"><Users className="size-3.5" />Up to {experience.max_capacity}</span><span>¥{experience.price_jpy.toLocaleString("en-US")}</span></div><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-vermilion">View experience <ArrowUpRight className="size-4" /></span></div>
        </Link>
      </article>;
    })}</div> : <p className="mt-6 border-y border-ink/10 py-6 text-sm text-ink/60">No verified MICHI host experiences are published at this time. Explore the source-backed external listings below.</p>}
  </section>;
}
