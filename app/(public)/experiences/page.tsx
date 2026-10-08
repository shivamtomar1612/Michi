import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { ExperienceBrowser } from "@/components/experience-browser";
import { CatalogueUnavailable } from "@/components/catalogue-unavailable";
import { listDestinations, listExternalExperiences, listPlaces } from "@/server/data/catalogue";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { buildCatalogueMapData } from "@/features/maps/catalogue";
import { listMichiExperiences } from "@/server/data/catalogue";
import { MichiExperienceDirectory } from "@/components/michi-experience-directory";

export const metadata: Metadata = { title: "Experiences" };

export default async function ExperiencesPage() {
  const [result, michiResult, destinationsResult, placesResult] = await Promise.all([
    listExternalExperiences(), listMichiExperiences(), listDestinations(), listPlaces(),
  ]);
  const michiExperiences = michiResult.ok ? michiResult.data : [];
  const destinations = destinationsResult.ok ? destinationsResult.data : [];
  const intro = <PageIntro eyebrow="Community-led experiences" title="Spend time with people who know this place." description="Explore participating MICHI hosts alongside verified external cultural listings. Their booking and provenance status are clearly identified." />;
  const directory = <MichiExperienceDirectory experiences={michiExperiences} destinations={destinations} />;
  if (!result.ok) return <>{intro}{directory}<div className="container-editorial border-t border-ink/15 py-10"><p className="eyebrow">Verified external listings</p><CatalogueUnavailable failure={result} returnHref="/experiences" /></div></>;
  if (!destinationsResult.ok) return <>{intro}{directory}<div className="container-editorial border-t border-ink/15 py-10"><CatalogueUnavailable failure={destinationsResult} returnHref="/experiences" /></div></>;
  const health = await getDestinationHealthForDestinations(destinationsResult.data.map((item) => item.id));
  const mapData = buildCatalogueMapData({ destinations: destinationsResult.data, experiences: result.data, places: placesResult.ok ? placesResult.data : [], healthByDestination: Object.fromEntries(Object.entries(health).map(([id, value]) => [id, { status: value.status, score: value.score }])) });
  return <>{intro}{directory}<div className="border-t border-ink/15"><PageIntro eyebrow="Verified external listings" title="Explore local experiences." description="External operators are not MICHI hosts. Their availability is not managed here; check current information with the operator." /><ExperienceBrowser experiences={result.data} destinations={destinationsResult.data} mapPoints={mapData.points} fallbackItems={mapData.fallbackItems} /></div></>;
}
