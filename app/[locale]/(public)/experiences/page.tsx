import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { ExperienceBrowser } from "@/components/experience-browser";
import { CatalogueUnavailable } from "@/components/catalogue-unavailable";
import { listDestinations, listExternalExperiences, listPlaces } from "@/server/data/catalogue";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { buildCatalogueMapData } from "@/features/maps/catalogue";
import { listMichiExperiences } from "@/server/data/catalogue";
import { MichiExperienceDirectory } from "@/components/michi-experience-directory";
import { getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Experiences" });
  return { title: t("eyebrow"), description: t("description") };
}

export default async function ExperiencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Experiences" });
  const [result, michiResult, destinationsResult, placesResult] = await Promise.all([
    listExternalExperiences(), listMichiExperiences(), listDestinations(), listPlaces(),
  ]);
  const michiExperiences = michiResult.ok ? michiResult.data : [];
  const destinations = destinationsResult.ok ? destinationsResult.data : [];
  const intro = <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />;
  const directory = <MichiExperienceDirectory experiences={michiExperiences} destinations={destinations} />;
  if (!result.ok) return <>{intro}{directory}<div className="container-editorial border-t border-ink/15 py-10"><p className="eyebrow">{t("externalEyebrow")}</p><CatalogueUnavailable failure={result} returnHref="/experiences" /></div></>;
  if (!destinationsResult.ok) return <>{intro}{directory}<div className="container-editorial border-t border-ink/15 py-10"><CatalogueUnavailable failure={destinationsResult} returnHref="/experiences" /></div></>;
  const health = await getDestinationHealthForDestinations(destinationsResult.data.map((item) => item.id));
  const mapData = buildCatalogueMapData({ destinations: destinationsResult.data, experiences: result.data, places: placesResult.ok ? placesResult.data : [], healthByDestination: Object.fromEntries(Object.entries(health).map(([id, value]) => [id, { status: value.status, score: value.score }])) });
  return <>{intro}{directory}<div className="border-t border-ink/15"><PageIntro eyebrow={t("externalEyebrow")} title={t("externalTitle")} description={t("externalDescription")} /><ExperienceBrowser experiences={result.data} destinations={destinationsResult.data} mapPoints={mapData.points} fallbackItems={mapData.fallbackItems} /></div></>;
}
