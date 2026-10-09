import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleHelp, MapPin } from "lucide-react";
import { DataSourceBadge, DataStatusBadge, LastVerified, OfficialSourceLink, isRecordStale } from "@/components/data-provenance";
import { CatalogueUnavailable } from "@/components/catalogue-unavailable";
import { DestinationComparison } from "@/components/destination-comparison";
import { DestinationHealthCard } from "@/components/destination-health-card";
import { ExperienceCard } from "@/components/experience-card";
import { PlaceCard } from "@/components/place-card";
import { EmptyState } from "@/components/ui/states";
import { getDestination, listDestinations, listExternalExperiences, listPlaces } from "@/server/data/catalogue";
import { getDestinationHealth } from "@/server/destination-health/service";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { MapExplorer } from "@/components/map-explorer";
import { buildCatalogueMapData } from "@/features/maps/catalogue";
import { AnalyticsView } from "@/components/analytics-view";
import { ContentReportLink } from "@/components/admin/content-report-link";
import { getDestinationPhoto } from "@/features/destinations/photography";
import { PhotoCredit } from "@/components/photo-credit";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getDestination(slug);
  return { title: result.ok && result.data ? `${result.data.name} · destination` : "Destination" };
}

export default async function DestinationDetailPage({ params }: Props) {
  const { slug } = await params;
  const destinationResult = await getDestination(slug);
  if (!destinationResult.ok) return <div className="container-editorial py-12"><CatalogueUnavailable failure={destinationResult} returnHref="/destinations" /></div>;
  const destination = destinationResult.data;
  if (!destination) notFound();

  const [placesResult, experiencesResult, destinationsResult, health] = await Promise.all([
    listPlaces(destination.id), listExternalExperiences(), listDestinations(), getDestinationHealth(destination.id),
  ]);
  const experiences = experiencesResult.ok ? experiencesResult.data.filter((item) => item.destination_id === destination.id) : [];
  const alternatives = destinationsResult.ok ? destinationsResult.data.filter((item) => item.slug !== slug && item.region !== destination.region).slice(0, 3) : [];
  const mappedDestinations = [destination, ...alternatives];
  const mapHealth = await getDestinationHealthForDestinations(mappedDestinations.map((item) => item.id));
  const mapData = buildCatalogueMapData({
    destinations: mappedDestinations,
    places: placesResult.ok ? placesResult.data : [],
    experiences,
    healthByDestination: Object.fromEntries(Object.entries(mapHealth).map(([id, value]) => [id, { status: value.status, score: value.score }])),
    alternativeIds: alternatives.map((item) => item.id),
  });
  const stale = isRecordStale(destination.next_verification_at);
  const destinationPhoto = getDestinationPhoto(destination.slug);
  const officialSignalUrl = destination.slug === "kyoto"
    ? "https://global.kyoto.travel/en/comfort/"
    : destination.slug === "kanazawa"
      ? "https://visitkanazawa.jp/en/traveler/"
      : null;

  return <>
    <AnalyticsView eventName="destination_viewed" destinationId={destination.id} />
    <div className="container-editorial pt-6"><Link href="/destinations" className="inline-flex min-h-11 items-center gap-2 text-sm text-ink/70 hover:text-vermilion"><ArrowLeft className="size-4" aria-hidden="true" />All destinations</Link></div>
    <header className="container-editorial relative mt-3 min-h-[430px] overflow-hidden bg-paper-deep sm:min-h-[500px]">
      {destinationPhoto ? <Image src={destinationPhoto.src} alt={destinationPhoto.alt} fill loading="eager" sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover object-center" /> : null}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink/25 via-transparent to-transparent" />
      <div className="relative flex min-h-[430px] items-end p-5 sm:min-h-[500px] sm:p-9 lg:p-12">
        <div className="max-w-2xl bg-paper/95 p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-3"><DataStatusBadge status={destination.data_status} stale={stale} /><DataSourceBadge name={destination.source_name} sourceType={destination.source_type} stale={stale} /></div>
          <p className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink/60"><MapPin className="size-3.5" aria-hidden="true" />{destination.city ?? destination.name} · {destination.prefecture} · {destination.region}</p>
          <h1 className="mt-2 font-serif text-5xl tracking-[-0.04em] sm:text-7xl">{destination.name}</h1>
          {destination.name_ja ? <p lang="ja" className="mt-2 text-lg text-ink/65">{destination.name_ja}</p> : null}
          <p className="mt-5 max-w-3xl text-base leading-7 text-ink/75">{destination.description ?? "A source-backed destination description is not yet available."}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2"><OfficialSourceLink href={destination.source_url} /><LastVerified date={destination.last_verified_at} stale={stale} /><ContentReportLink subjectType="destination" subjectId={destination.id} /></div>
        </div>
      </div>
    </header>
    {destinationPhoto ? <div className="container-editorial flex justify-end py-2"><PhotoCredit photo={destinationPhoto} className="text-ink/70" /></div> : null}
    <nav aria-label="On this page" className="relative z-20 border-y border-ink/10 bg-paper/95 backdrop-blur-sm sm:sticky sm:top-[4.5rem]"><div className="container-editorial flex flex-wrap gap-x-5 sm:flex-nowrap sm:gap-6">{[{ href: "#overview", label: "Overview" }, { href: "#places", label: "Places" }, { href: "#experiences", label: "External experiences" }, { href: "#health", label: "Visitor signals" }].map((item) => <a key={item.href} href={item.href} className="min-h-12 content-center text-xs font-medium text-ink/70 hover:text-vermilion">{item.label}</a>)}</div></nav>
    <div className="container-editorial grid gap-12 py-12 lg:grid-cols-[1fr_0.72fr] lg:gap-20 lg:py-16">
      <div className="min-w-0">
        <section id="overview" className="scroll-mt-28"><p className="eyebrow">Source-backed overview</p><h2 className="mt-3 font-serif text-3xl">A little context before you go.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-ink/70">{destination.description ?? "Description not yet verified."}</p><div className="mt-7"><MapExplorer title={`Map of ${destination.name} and sourced alternatives`} description="Green means Healthy or Good, amber means Moderate Pressure, and red means High or Critical Pressure. Unavailable health evidence is gray. Other-region markers are for comparison only, not personalized recommendations." points={mapData.points} fallbackItems={mapData.fallbackItems} listTitle="Destination, place, and experience list" /></div></section>
        <section id="places" className="scroll-mt-28 mt-12 border-t border-ink/15 pt-9"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Officially listed places</p><h2 className="mt-2 font-serif text-3xl">Places to explore</h2></div></div>{placesResult.ok ? placesResult.data.length ? <div className="mt-5">{placesResult.data.map((place) => <PlaceCard key={place.id} place={place} />)}</div> : <div className="mt-5"><EmptyState title="No verified places are available yet" description="Only individual places with source provenance appear here." /></div> : <div className="mt-5"><CatalogueUnavailable failure={placesResult} returnHref={`/destinations/${destination.slug}`} /></div>}</section>
        <section id="experiences" className="scroll-mt-28 mt-12 border-t border-ink/15 pt-9"><div><p className="eyebrow">External operator listings</p><h2 className="mt-2 font-serif text-3xl">Ways to spend time</h2><p className="mt-3 text-sm leading-6 text-ink/65">These are information listings from external operators. They have no MICHI slots or booking availability.</p></div>{experiences.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2">{experiences.map((experience) => <ExperienceCard key={experience.slug} experience={experience} destinationName={destination.name} />)}</div> : <p className="mt-5 text-sm text-ink/65">No verified external experience listings are available for this destination.</p>}</section>
      </div>
      <aside className="space-y-7">
        <section id="health" className="scroll-mt-28"><DestinationHealthCard destinationId={destination.id} result={health} />{officialSignalUrl ? <div className="mt-3"><OfficialSourceLink href={officialSignalUrl} label={destination.slug === "kyoto" ? "Open Kyoto’s official congestion forecast" : "Open Kanazawa’s official mindful travel guide"} /></div> : null}<DestinationComparison destinationId={destination.id} destinationName={destination.name} health={health} alternatives={[]} /></section>
        <section className="border-l-2 border-moss bg-[#e9ece5] p-5"><div className="flex items-start gap-3"><CircleHelp className="mt-0.5 size-5 shrink-0 text-moss" aria-hidden="true" /><div><p className="eyebrow">Before you visit</p><h2 className="mt-2 font-serif text-xl">Check the current source.</h2><p className="mt-3 text-sm leading-6 text-ink/70">Opening hours, prices, accessibility, and temporary visitor rules can change. Each place links to the source used for its record.</p></div></div></section>
        {alternatives.length ? <section className="border-t border-ink/15 pt-5"><p className="text-xs text-ink/55">Other sourced regions</p><div className="mt-3 flex flex-wrap gap-3">{alternatives.map((place) => <Link key={place.slug} href={`/destinations/${place.slug}`} className="min-h-11 content-center text-sm font-medium underline decoration-ink/20 underline-offset-4 hover:text-vermilion">{place.name}</Link>)}</div><Link href="/discover" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-vermilion">Explore sourced records <ArrowRight className="size-4" aria-hidden="true" /></Link></section> : null}
      </aside>
    </div>
  </>;
}
