import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleHelp, Clock3, MapPin } from "lucide-react";
import { DataSourceBadge, DataStatusBadge, LastVerified, OfficialSourceLink, isRecordStale } from "@/components/data-provenance";
import { CatalogueUnavailable } from "@/components/catalogue-unavailable";
import { CulturalEvidencePanel } from "@/components/cultural-evidence-panel";
import { CulturalCompanion } from "@/components/cultural-companion";
import { getExternalExperience, getMichiExperience, listDestinations } from "@/server/data/catalogue";
import { listPlaces } from "@/server/data/catalogue";
import { MapExplorer } from "@/components/map-explorer";
import { buildCatalogueMapData } from "@/features/maps/catalogue";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { createClient } from "@/lib/supabase/server";
import { MichiExperienceDetail } from "@/components/michi-experience-detail";
import { AnalyticsView } from "@/components/analytics-view";
import { ContentReportLink } from "@/components/admin/content-report-link";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getExternalExperience(slug);
  if (result.ok && result.data) return { title: `${result.data.title} · external listing` };
  const michi = await getMichiExperience(slug);
  return { title: michi.ok && michi.data ? `${michi.data.title} · MICHI host` : "Experience" };
}

export default async function ExperienceDetailPage({ params }: Props) {
  const { slug } = await params;
  const experienceResult = await getExternalExperience(slug);
  const externalExperience = experienceResult.ok ? experienceResult.data : null;
  if (!externalExperience) {
    const michiResult = await getMichiExperience(slug);
    if (michiResult.ok && michiResult.data) {
      const supabase = await createClient();
      const { data: slots } = await supabase.from("experience_slots").select("id,starts_at,ends_at,capacity,booked_count,status")
        .eq("experience_id", michiResult.data.id).eq("status", "open").gte("starts_at", new Date().toISOString()).order("starts_at").limit(100);
      const destinationsResult = await listDestinations();
      const destination = destinationsResult.ok ? destinationsResult.data.find((item) => item.id === michiResult.data?.destination_id) : undefined;
      const health = await getDestinationHealthForDestinations([michiResult.data.destination_id]);
      return <><AnalyticsView eventName="experience_viewed" destinationId={michiResult.data.destination_id} experienceId={michiResult.data.id} /><MichiExperienceDetail experience={michiResult.data} destinationName={destination?.name ?? "Destination"} destinationSlug={destination?.slug ?? null} slots={slots ?? []} health={health[michiResult.data.destination_id] ?? null} /><div className="container-editorial pb-8"><ContentReportLink subjectType="experience" subjectId={michiResult.data.id} /></div></>;
    }
    if (!experienceResult.ok) return <div className="container-editorial py-12"><CatalogueUnavailable failure={experienceResult} returnHref="/experiences" /></div>;
    notFound();
  }
  const experience = externalExperience;
  const destinationsResult = await listDestinations();
  const destination = destinationsResult.ok ? destinationsResult.data.find((item) => item.id === experience.destination_id) : undefined;
  const [placesResult, health] = await Promise.all([
    listPlaces(experience.destination_id),
    getDestinationHealthForDestinations([experience.destination_id]),
  ]);
  const mapData = buildCatalogueMapData({
    destinations: destination ? [destination] : [],
    places: placesResult.ok ? placesResult.data : [],
    experiences: [experience],
    healthByDestination: Object.fromEntries(Object.entries(health).map(([id, value]) => [id, { status: value.status, score: value.score }])),
  });
  const stale = isRecordStale(experience.next_verification_at);

  return <>
    <AnalyticsView eventName="experience_viewed" destinationId={experience.destination_id} experienceId={experience.id} />
    <div className="container-editorial pt-6"><Link href="/experiences" className="inline-flex min-h-11 items-center gap-2 text-sm text-ink/70 hover:text-vermilion"><ArrowLeft className="size-4" aria-hidden="true" />All experiences</Link></div>
    <div className="container-editorial grid gap-8 py-4 pb-12 lg:grid-cols-[1.22fr_0.78fr] lg:gap-12 lg:pb-16">
      <div>
        <div className="flex min-h-64 flex-col justify-end border-y border-ink/15 bg-[#e9e5dc] p-6 sm:min-h-80 sm:p-10"><p className="eyebrow">External listing · no MICHI booking</p><h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">{experience.title}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/65"><span className="inline-flex items-center gap-2"><MapPin className="size-4" aria-hidden="true" />{destination?.name ?? "Destination not yet verified"}</span>{experience.duration_minutes ? <span className="inline-flex items-center gap-2"><Clock3 className="size-4" aria-hidden="true" />{experience.duration_minutes} minutes</span> : null}</div></div>
        <div className="mt-7"><div className="flex flex-wrap items-center gap-3"><DataStatusBadge status={experience.data_status} stale={stale} /><DataSourceBadge name={experience.source_name} sourceType={experience.source_type} stale={stale} /></div><p className="mt-5 max-w-2xl text-base leading-7 text-ink/70">{experience.short_description ?? "An operator listing with no verified summary available."}</p><LastVerified date={experience.last_verified_at} stale={stale} /></div>
        <section className="mt-10 border-t border-ink/15 pt-7"><p className="eyebrow">Official information</p><h2 className="mt-2 font-serif text-2xl">Review details with the operator.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70">The operator controls terms, availability, current pricing, and participation details. MICHI has not onboarded this listing and cannot confirm its current availability.</p><div className="mt-4"><OfficialSourceLink href={experience.official_url} label="View official experience information" /></div></section>
        <CulturalCompanion destinationId={experience.destination_id} destinationName={destination?.name} experienceId={experience.id} experienceName={experience.title} />
        <CulturalEvidencePanel destinationId={experience.destination_id} placeName={experience.title + (destination ? ", " + destination.name : "")} />
        <div className="mt-6"><ContentReportLink subjectType="external_experience" subjectId={experience.id} /></div>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-ink/15 bg-white p-5 sm:p-7"><p className="eyebrow">External operator</p><h2 className="mt-2 font-serif text-xl">{experience.operator_name}</h2><dl className="mt-6 divide-y divide-ink/10 border-y border-ink/10">{[{ label: "Duration", value: experience.duration_minutes ? `${experience.duration_minutes} minutes` : "Not yet verified" }, { label: "Price", value: experience.price_text ?? "Not yet verified" }, { label: "Accessibility", value: experience.accessibility_status === "verified" ? "Verified details available" : "Not yet verified" }].map(({ label, value }) => <div key={label} className="flex justify-between gap-4 py-3 text-sm"><dt className="text-ink/60">{label}</dt><dd className="text-right font-medium">{value}</dd></div>)}</dl>
          <a href={experience.external_booking_url ?? experience.official_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 w-full items-center justify-center border border-ink/25 px-4 text-sm font-semibold text-ink hover:bg-ink/5">View official information<span className="sr-only"> (opens in a new tab)</span></a>
          <p className="mt-3 text-xs leading-5 text-ink/55">This opens the operator’s site. No MICHI booking, payment, or availability check occurs.</p>
        </div>
        <section className="mt-8 border-l-2 border-vermilion bg-paper-deep p-5"><p className="eyebrow">Accessibility and participation</p><p className="mt-2 flex items-start gap-2 text-sm leading-6 text-ink/65"><CircleHelp className="mt-1 size-4 shrink-0" aria-hidden="true" />Accessibility details have not yet been verified for this listing.</p></section>
        {destination ? <Link href={`/destinations/${destination.slug}`} className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-vermilion">Explore {destination.name} <span className="ml-2" aria-hidden="true">→</span></Link> : null}
        <div className="mt-7"><MapExplorer title="Official location" description="This external listing has no MICHI-managed meeting point. A marker appears only when its linked official place record has a verified, current coordinate." points={mapData.points} fallbackItems={mapData.fallbackItems} listTitle="Official listing and location" /></div>
      </aside>
    </div>
  </>;
}
