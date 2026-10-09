"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ExperienceCard } from "@/components/experience-card";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import type { PublicDestination, PublicExternalExperience } from "@/server/data/catalogue";
import { MapExplorer } from "@/components/map-explorer";
import type { MapFallbackItem, MapPoint } from "@/features/maps/types";
import { useTranslations } from "next-intl";

export function ExperienceBrowser({ experiences, destinations, mapPoints, fallbackItems }: { experiences: PublicExternalExperience[]; destinations: PublicDestination[]; mapPoints: MapPoint[]; fallbackItems: MapFallbackItem[] }) {
  const t = useTranslations("Experiences");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const categories = [...new Set(experiences.flatMap((experience) => experience.category ? [experience.category] : []))];
  const filtered = useMemo(() => experiences.filter((experience) =>
    (!category || experience.category === category)
    && `${experience.title} ${experience.operator_name} ${experience.short_description ?? ""} ${experience.category ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
  [experiences, query, category]);

  return <div className="container-editorial py-10 sm:py-14">
    <MapExplorer title={t("mapTitle")} description={t("mapDescription")} points={mapPoints} fallbackItems={fallbackItems} listTitle={t("mapListTitle")} />
    <div className="grid gap-4 border-y border-ink/15 py-5 sm:grid-cols-[1fr_220px] sm:items-end">
      <label className="relative block"><span className="sr-only">{t("searchLabel")}</span><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/45" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className="pl-11" /></label>
      <label className="grid gap-1.5 text-xs font-medium">{t("category")}<select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 border border-ink/20 bg-white px-3 text-sm"><option value="">{t("allCategories")}</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>
    {filtered.length ? <><p className="mb-5 mt-8 text-xs text-ink/55" aria-live="polite">{t("resultCount", { count: filtered.length })}</p><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((experience) => {
      const destination = destinations.find((item) => item.id === experience.destination_id);
      return <ExperienceCard key={experience.slug} experience={experience} destinationName={destination?.name ?? t("destinationUnverified")} />;
    })}</div></> : <div className="pt-8"><EmptyState title={experiences.length ? t("noFilterResults") : t("noRecords")} description={experiences.length ? t("tryFilter") : t("noCatalogue")} /></div>}
    <p className="mt-8 text-xs leading-5 text-ink/55">{t("externalDisclosure")}</p>
  </div>;
}
