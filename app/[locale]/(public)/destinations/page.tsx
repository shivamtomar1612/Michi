import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { DestinationBrowser } from "@/components/destination-browser";
import { CatalogueUnavailable } from "@/components/catalogue-unavailable";
import { listDestinations } from "@/server/data/catalogue";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { buildCatalogueMapData } from "@/features/maps/catalogue";
import { getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Destinations" });
  return { title: t("eyebrow"), description: t("description") };
}

export default async function DestinationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Destinations" });
  const result = await listDestinations();
  if (!result.ok) return <><PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} /><div className="container-editorial py-10"><CatalogueUnavailable failure={result} returnHref="/destinations" /></div></>;
  const health = await getDestinationHealthForDestinations(result.data.map((item) => item.id));
  const mapData = buildCatalogueMapData({ destinations: result.data, healthByDestination: Object.fromEntries(Object.entries(health).map(([id, value]) => [id, { status: value.status, score: value.score }])) });
  return <><PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} /><DestinationBrowser destinations={result.data} mapPoints={mapData.points} fallbackItems={mapData.fallbackItems} /></>;
}
