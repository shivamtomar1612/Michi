import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { DestinationBrowser } from "@/components/destination-browser";
import { CatalogueUnavailable } from "@/components/catalogue-unavailable";
import { listDestinations } from "@/server/data/catalogue";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { buildCatalogueMapData } from "@/features/maps/catalogue";

export const metadata: Metadata = { title: "Destinations" };

export default async function DestinationsPage() {
  const result = await listDestinations();
  if (!result.ok) return <><PageIntro eyebrow="Destinations · source-backed" title="Discover Japan beyond the obvious." description="Explore destinations with their source and verification status visible." /><div className="container-editorial py-10"><CatalogueUnavailable failure={result} returnHref="/destinations" /></div></>;
  const health = await getDestinationHealthForDestinations(result.data.map((item) => item.id));
  const mapData = buildCatalogueMapData({ destinations: result.data, healthByDestination: Object.fromEntries(Object.entries(health).map(([id, value]) => [id, { status: value.status, score: value.score }])) });
  return <><PageIntro eyebrow="Destinations · source-backed" title="Discover Japan beyond the obvious." description="Explore destinations with their source and verification status visible." /><DestinationBrowser destinations={result.data} mapPoints={mapData.points} fallbackItems={mapData.fallbackItems} /></>;
}
