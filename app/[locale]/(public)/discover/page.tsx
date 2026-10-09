import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { DiscoveryBrowser } from "@/components/discovery-browser";
import { CatalogueUnavailable } from "@/components/catalogue-unavailable";
import { listDestinations, listExternalExperiences, listPlaces } from "@/server/data/catalogue";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { buildCatalogueMapData } from "@/features/maps/catalogue";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Discover" });
  return { title: t("eyebrow"), description: t("pageDescription") };
}

export default async function DiscoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Discover" });
  const [destinations, experiences] = await Promise.all([listDestinations(), listExternalExperiences()]);
  if (!destinations.ok) return <><PageIntro eyebrow={t("eyebrow")} title={t("pageTitle")} description={t("pageDescription")} /><div className="container-editorial py-10"><CatalogueUnavailable failure={destinations} /></div></>;
  if (!experiences.ok) return <><PageIntro eyebrow={t("eyebrow")} title={t("pageTitle")} description={t("pageDescription")} /><div className="container-editorial py-10"><CatalogueUnavailable failure={experiences} /></div></>;
  const [places, health] = await Promise.all([
    listPlaces(),
    getDestinationHealthForDestinations(destinations.data.map((item) => item.id)),
  ]);
  const mapData = buildCatalogueMapData({ destinations: destinations.data, experiences: experiences.data, places: places.ok ? places.data : [], healthByDestination: Object.fromEntries(Object.entries(health).map(([id, value]) => [id, { status: value.status, score: value.score }])) });
  return <><PageIntro eyebrow={t("eyebrow")} title={t("pageTitle")} description={t("pageDescription")} /><div className="container-editorial"><RecommendationPanel /></div><DiscoveryBrowser destinations={destinations.data} experiences={experiences.data} mapPoints={mapData.points} fallbackItems={mapData.fallbackItems} /></>;
}
