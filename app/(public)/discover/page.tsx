import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { DiscoveryBrowser } from "@/components/discovery-browser";
import { CatalogueUnavailable } from "@/components/catalogue-unavailable";
import { listDestinations, listExternalExperiences, listPlaces } from "@/server/data/catalogue";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { buildCatalogueMapData } from "@/features/maps/catalogue";
import { RecommendationPanel } from "@/components/recommendation-panel";

export const metadata: Metadata = { title: "Discover Japan" };

export default async function DiscoverPage() {
  const [destinations, experiences] = await Promise.all([listDestinations(), listExternalExperiences()]);
  if (!destinations.ok) return <><PageIntro eyebrow="Discover Japan" title="Find a journey that feels like yours." description="Explore source-backed places and external experience information." /><div className="container-editorial py-10"><CatalogueUnavailable failure={destinations} /></div></>;
  if (!experiences.ok) return <><PageIntro eyebrow="Discover Japan" title="Find a journey that feels like yours." description="Explore source-backed places and external experience information." /><div className="container-editorial py-10"><CatalogueUnavailable failure={experiences} /></div></>;
  const [places, health] = await Promise.all([
    listPlaces(),
    getDestinationHealthForDestinations(destinations.data.map((item) => item.id)),
  ]);
  const mapData = buildCatalogueMapData({ destinations: destinations.data, experiences: experiences.data, places: places.ok ? places.data : [], healthByDestination: Object.fromEntries(Object.entries(health).map(([id, value]) => [id, { status: value.status, score: value.score }])) });
  return <><PageIntro eyebrow="Discover Japan · source-backed" title="Find a journey that feels like yours." description="Explore official destination and operator information with source and verification details visible." /><div className="container-editorial"><RecommendationPanel /></div><DiscoveryBrowser destinations={destinations.data} experiences={experiences.data} mapPoints={mapData.points} fallbackItems={mapData.fallbackItems} /></>;
}
