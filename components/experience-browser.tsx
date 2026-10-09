"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ExperienceCard } from "@/components/experience-card";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import type { PublicDestination, PublicExternalExperience } from "@/server/data/catalogue";
import { MapExplorer } from "@/components/map-explorer";
import type { MapFallbackItem, MapPoint } from "@/features/maps/types";

export function ExperienceBrowser({ experiences, destinations, mapPoints, fallbackItems }: { experiences: PublicExternalExperience[]; destinations: PublicDestination[]; mapPoints: MapPoint[]; fallbackItems: MapFallbackItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const categories = ["All categories", ...new Set(experiences.flatMap((experience) => experience.category ? [experience.category] : []))];
  const filtered = useMemo(() => experiences.filter((experience) =>
    (category === "All categories" || experience.category === category)
    && `${experience.title} ${experience.operator_name} ${experience.short_description ?? ""} ${experience.category ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
  [experiences, query, category]);

  return <div className="container-editorial py-10 sm:py-14">
    <MapExplorer title="External experiences and official places" description="Experience markers use official place coordinates only. Listings without a checked location remain in the list; external availability is never inferred." points={mapPoints} fallbackItems={fallbackItems} listTitle="Experience list" />
    <div className="grid gap-4 border-y border-ink/15 py-5 sm:grid-cols-[1fr_220px] sm:items-end">
      <label className="relative block"><span className="sr-only">Search external experiences</span><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/45" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search craft, operator, or experience" className="pl-11" /></label>
      <label className="grid gap-1.5 text-xs font-medium">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 border border-ink/20 bg-white px-3 text-sm">{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>
    {filtered.length ? <><p className="mb-5 mt-8 text-xs text-ink/55" aria-live="polite">{filtered.length} external {filtered.length === 1 ? "listing" : "listings"}</p><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((experience) => {
      const destination = destinations.find((item) => item.id === experience.destination_id);
      return <ExperienceCard key={experience.slug} experience={experience} destinationName={destination?.name ?? "Destination not verified"} />;
    })}</div></> : <div className="pt-8"><EmptyState title={experiences.length ? "No experiences match this search" : "No verified external experiences are available yet"} description={experiences.length ? "Try a different term or category." : "External listings will appear after their official source records are loaded."} /></div>}
    <p className="mt-8 text-xs leading-5 text-ink/55">External listings are not MICHI hosts and do not have MICHI-managed booking availability. Prices and operating details can change; check the linked operator information before visiting.</p>
  </div>;
}
