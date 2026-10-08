"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DestinationCard } from "@/components/destination-card";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import type { PublicDestination } from "@/server/data/catalogue";
import { MapExplorer } from "@/components/map-explorer";
import type { MapFallbackItem, MapPoint } from "@/features/maps/types";

export function DestinationBrowser({ destinations, mapPoints, fallbackItems }: { destinations: PublicDestination[]; mapPoints: MapPoint[]; fallbackItems: MapFallbackItem[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All regions");
  const regions = ["All regions", ...new Set(destinations.map((destination) => destination.region))];
  const filtered = useMemo(() => destinations.filter((destination) =>
    (region === "All regions" || destination.region === region)
    && `${destination.name} ${destination.name_ja ?? ""} ${destination.prefecture} ${destination.region} ${destination.description ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
  [destinations, query, region]);
  const selectClass = "min-h-11 border border-ink/20 bg-white px-3 text-sm text-ink focus-visible:ring-2 focus-visible:ring-vermilion";

  return <div className="container-editorial py-10 sm:py-14">
    <MapExplorer title="Explore destinations on a map" description="Destination Health colors appear only when complete verified signals are available. Records without checked coordinates stay in the list and receive no marker." points={mapPoints} fallbackItems={fallbackItems} listTitle="Destination list" />
    <div className="grid gap-4 border-y border-ink/15 py-5 sm:grid-cols-[1fr_220px] sm:items-end">
      <label className="relative block"><span className="sr-only">Search destinations</span><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/45" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search place, region, or prefecture" className="pl-11" /></label>
      <label className="grid gap-1.5 text-xs font-medium">Region<select className={selectClass} value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>
    {filtered.length ? <><p className="mb-5 mt-8 text-xs text-ink/55" aria-live="polite">{filtered.length} sourced {filtered.length === 1 ? "destination" : "destinations"}</p><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((destination) => <DestinationCard key={destination.slug} destination={destination} />)}</div></> : <div className="pt-8"><EmptyState title={destinations.length ? "No destinations match these filters" : "No verified destinations are available yet"} description={destinations.length ? "Try another place, prefecture, or region." : "The public catalogue will appear after its approved source records are loaded."} /></div>}
  </div>;
}
