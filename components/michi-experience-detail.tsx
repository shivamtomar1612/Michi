import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Clock3, MapPin, Users } from "lucide-react";
import { CulturalCompanion } from "@/components/cultural-companion";
import { CulturalEvidencePanel } from "@/components/cultural-evidence-panel";
import { MichiBookingRequest } from "@/components/michi-booking-request";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { DestinationHealthResult } from "@/features/destination-health/types";
import type { PublicMichiExperience } from "@/server/data/catalogue";

type Slot = { id: string; starts_at: string; ends_at: string; capacity: number; booked_count: number; status: string };
function imageUrl(path: string) {
  const config = getSupabasePublicConfig();
  return config ? `${config.url}/storage/v1/object/public/experience-images/${path.split("/").map(encodeURIComponent).join("/")}` : null;
}
const read = (value: unknown, key: string) => typeof value === "object" && value !== null && key in value ? (value as Record<string, unknown>)[key] : null;

export function MichiExperienceDetail({ experience, destinationName, destinationSlug, slots, health }: {
  experience: PublicMichiExperience; destinationName: string; destinationSlug: string | null;
  slots: Slot[]; health: DestinationHealthResult | null;
}) {
  const rules = experience.rules;
  const accessibility = experience.accessibility;
  const policy = experience.booking_policy;
  const cover = experience.image_paths[0] ? imageUrl(experience.image_paths[0]) : null;
  const sourceStatus = health?.status ?? "Unavailable";
  return <>
    <div className="container-editorial pt-6"><Link href="/experiences" className="inline-flex min-h-11 items-center gap-2 text-sm text-ink/70 hover:text-vermilion"><ArrowLeft className="size-4" aria-hidden="true" />All experiences</Link></div>
    <div className="container-editorial grid gap-8 py-4 pb-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 lg:pb-16">
      <div>
        <div className="relative flex min-h-72 flex-col justify-end overflow-hidden border-y border-ink/15 bg-[#e9e5dc] p-6 sm:min-h-[26rem] sm:p-10">{cover ? <Image src={cover} alt={`Host supplied image for ${experience.title}`} fill priority unoptimized sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" aria-hidden="true" /><div className="relative text-white"><p className="text-xs font-semibold uppercase tracking-[0.14em]">Verified MICHI host · {destinationName}</p><h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">{experience.title}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85"><span className="inline-flex items-center gap-2"><MapPin className="size-4" />{destinationName}</span><span className="inline-flex items-center gap-2"><Clock3 className="size-4" />{experience.duration_minutes} minutes</span><span className="inline-flex items-center gap-2"><Users className="size-4" />Up to {experience.max_capacity} guests per slot</span></div></div></div>
        {experience.image_paths.length > 1 ? <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{experience.image_paths.slice(1).map((path, index) => { const url = imageUrl(path); return url ? <div key={path} className="relative aspect-[4/3] bg-[#e9e5dc]"><Image src={url} alt={`${experience.title} image ${index + 2}`} fill unoptimized sizes="(max-width: 640px) 50vw, 250px" className="object-cover" /></div> : null; })}</div> : null}
        <div className="mt-7 flex flex-wrap gap-2"><span className="border border-moss/30 bg-moss/5 px-3 py-1.5 text-xs font-semibold text-moss">MICHI verified host</span><span className="border border-ink/15 px-3 py-1.5 text-xs font-semibold">Provided directly by host</span><span className="border border-ink/15 px-3 py-1.5 text-xs font-semibold">Destination Health {sourceStatus.toLowerCase()}</span></div>
        <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-7 text-ink/70">{experience.description}</p>
        <section className="mt-9 border-t border-ink/15 pt-6"><p className="eyebrow">Cultural context</p><p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/70">{experience.cultural_context}</p><p className="mt-4 text-xs leading-5 text-ink/55">Experience rules and cultural context are provided directly by the host. They are not presented as government or official cultural guidance.</p></section>
        <section className="mt-9 border-t border-ink/15 pt-6"><p className="eyebrow">Participation and access</p><dl className="mt-4 divide-y divide-ink/10">{[
          ["Participation rules", read(rules, "participation_rules")], ["Etiquette", read(rules, "etiquette_rules")],
          ["Eligibility", read(rules, "eligibility")], ["Photography", experience.photography_policy.replaceAll("_", " ")],
          ["Accessibility", read(accessibility, "notes")], ["Cancellation", read(policy, "cancellation_rules")],
          ["Meeting point", experience.meeting_point],
        ].map(([label, value]) => <div key={String(label)} className="grid gap-1 py-3 sm:grid-cols-[170px_1fr]"><dt className="text-xs font-semibold text-ink/55">{String(label)}</dt><dd className="whitespace-pre-line text-sm leading-6">{typeof value === "string" && value.trim() ? value : "Not provided by the host"}</dd></div>)}</dl>{experience.languages.length ? <p className="mt-3 text-sm"><span className="font-semibold">Languages: </span>{experience.languages.join(", ")}</p> : <p className="mt-3 text-sm text-ink/60">Languages not provided.</p>}</section>
        <CulturalCompanion destinationId={experience.destination_id} destinationName={destinationName} experienceId={experience.id} experienceName={experience.title} />
        <CulturalEvidencePanel destinationId={experience.destination_id} placeName={`${experience.title}, ${destinationName}`} />
      </div>
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <section className="border border-ink/15 bg-white p-5 sm:p-7"><p className="eyebrow">Hosted through MICHI</p><p className="mt-2 font-serif text-3xl">¥{experience.price_jpy.toLocaleString("en-US")}<span className="ml-2 font-sans text-xs font-normal text-ink/55">per guest</span></p><p className="mt-4 text-sm leading-6 text-ink/65">Price and rules are supplied by the participating host. Dates and capacity are shown only when the host has opened an actual slot.</p><MichiBookingRequest slots={slots} experienceTitle={experience.title} returnPath={`/experiences/${experience.slug}`} /></section>
        <section className="border-l-2 border-vermilion bg-paper-deep p-5"><p className="eyebrow">Destination Health</p><p className="mt-2 text-sm font-semibold">{sourceStatus}</p><p className="mt-2 text-xs leading-5 text-ink/60">MICHI does not describe this as low pressure unless current verified health evidence supports that status.</p>{destinationSlug ? <Link href={`/destinations/${destinationSlug}`} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-vermilion">Explore {destinationName}</Link> : null}</section>
        <section className="border border-ink/15 p-5"><p className="eyebrow">Host supplied meeting point</p><p className="mt-2 inline-flex items-start gap-2 text-sm leading-6"><MapPin className="mt-1 size-4 shrink-0" />{experience.meeting_point}</p><p className="mt-2 text-xs leading-5 text-ink/55">Coordinates and directions are provided by the host; verify current arrival details with them before travel.</p></section>
      </aside>
    </div>
  </>;
}
