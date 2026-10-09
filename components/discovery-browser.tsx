"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ExperienceCard } from "@/components/experience-card";
import { DestinationCard } from "@/components/destination-card";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import type { PublicDestination, PublicExternalExperience } from "@/server/data/catalogue";
import { MapExplorer } from "@/components/map-explorer";
import type { MapFallbackItem, MapPoint } from "@/features/maps/types";
import { useTranslations } from "next-intl";

type Filter = "all" | "destinations" | "experiences";

export function DiscoveryBrowser({ destinations, experiences, mapPoints, fallbackItems }: { destinations: PublicDestination[]; experiences: PublicExternalExperience[]; mapPoints: MapPoint[]; fallbackItems: MapFallbackItem[] }) {
  const t = useTranslations("Discover");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleDestinations = useMemo(() => destinations.filter((item) => `${item.name} ${item.name_ja ?? ""} ${item.region} ${item.prefecture} ${item.description ?? ""}`.toLocaleLowerCase().includes(normalizedQuery)), [destinations, normalizedQuery]);
  const visibleExperiences = useMemo(() => experiences.filter((item) => `${item.title} ${item.operator_name} ${item.category ?? ""} ${item.short_description ?? ""}`.toLocaleLowerCase().includes(normalizedQuery)), [experiences, normalizedQuery]);
  const hasResults = (filter !== "experiences" && visibleDestinations.length > 0) || (filter !== "destinations" && visibleExperiences.length > 0);

  return <div className="container-editorial py-10 sm:py-14">
    <MapExplorer title={t("mapTitle")} description={t("mapDescription")} points={mapPoints} fallbackItems={fallbackItems} listTitle={t("mapListTitle")} />
    <section aria-label={t("searchLandmark")} className="border-b border-ink/15 pb-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-serif text-xl">{t("searchTitle")}</h2><p className="mt-1 text-sm text-ink/60">{t("searchDescription")}</p></div>
        <label className="relative block w-full sm:max-w-sm"><span className="sr-only">{t("searchLabel")}</span><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/45" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className="pl-11" /></label></div>
    </section>
    <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label={t("filterLabel")}>{(["all", "destinations", "experiences"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-11 border px-4 text-xs font-semibold capitalize transition-colors focus-visible:ring-2 focus-visible:ring-vermilion ${filter === value ? "border-vermilion bg-vermilion text-white" : "border-ink/20 hover:border-ink/50"}`}>{t(value)}</button>)}</div>
    {hasResults ? <div className="space-y-12 pt-9">
      {filter !== "experiences" ? <section aria-labelledby="discover-destinations"><div className="mb-5 flex items-baseline justify-between gap-3"><div><p className="eyebrow">{t("startWithPlace")}</p><h2 id="discover-destinations" className="mt-2 font-serif text-3xl">{t("destinationsTitle")}</h2></div><span className="text-xs text-ink/55" aria-live="polite">{t("placesCount", { count: visibleDestinations.length })}</span></div>{visibleDestinations.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{visibleDestinations.map((destination) => <DestinationCard key={destination.slug} destination={destination} />)}</div> : <p className="border border-dashed border-ink/20 p-6 text-sm text-ink/65">{t("noDestinations")}</p>}</section> : null}
      {filter !== "destinations" ? <section aria-labelledby="discover-experiences"><div className="mb-5 flex items-baseline justify-between gap-3"><div><p className="eyebrow">{t("followInterest")}</p><h2 id="discover-experiences" className="mt-2 font-serif text-3xl">{t("experiencesTitle")}</h2></div><span className="text-xs text-ink/55" aria-live="polite">{t("listingsCount", { count: visibleExperiences.length })}</span></div>{visibleExperiences.length ? <div className="grid gap-5 md:grid-cols-3">{visibleExperiences.map((experience) => {
        const destination = destinations.find((item) => item.id === experience.destination_id);
        return <ExperienceCard key={experience.slug} experience={experience} destinationName={destination?.name ?? t("destinationUnverified")} />;
      })}</div> : <p className="border border-dashed border-ink/20 p-6 text-sm text-ink/65">{t("noListings")}</p>}</section> : null}
      <p className="text-xs text-ink/55">{t("externalDisclosure")}</p>
    </div> : <div className="pt-10"><EmptyState title={t("emptyTitle")} description={t("emptyDescription")} /></div>}
  </div>;
}
