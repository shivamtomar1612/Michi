import { Badge } from "@/components/ui/badge";
import { HealthVisualization } from "@/components/health-visualization";
import { healthComponentKeys, type DestinationHealthResult, type HealthComponentKey } from "@/features/destination-health/types";
import { HealthViewedTracker } from "@/features/destination-health/health-viewed-tracker";
import { useLocale } from "next-intl";
import { formatDateTime } from "@/i18n/formatters";
import type { Locale } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function DestinationHealthCard({ destinationId, result }: { destinationId: string; result: DestinationHealthResult }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Health");
  const accessibility = useTranslations("Accessibility");
  const formatDate = (value: string) => formatDateTime(value, locale);
  const labels: Record<HealthComponentKey, string> = Object.fromEntries(healthComponentKeys.map((key) => [key, t(key)])) as Record<HealthComponentKey, string>;
  const statusKey = { Healthy: "statusHealthy", Good: "statusGood", "Moderate Pressure": "statusModerate", "High Pressure": "statusHigh", "Critical Pressure": "statusCritical", Unavailable: "statusUnavailable" } as const;
  const signalLabels = { live: t("live"), snapshot: t("snapshot"), simulated: t("simulated"), unavailable: t("unavailable") };
  const truthLabels = { official: t("official"), community: t("community"), host: t("host"), simulated: t("simulated"), unverified: t("unverified"), stale: t("stale") };
  return <section aria-labelledby="destination-health-title" className="border border-ink/15 bg-white p-5 sm:p-6">
    <HealthViewedTracker destinationId={destinationId} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="eyebrow">{t("eyebrow")}</p><h2 id="destination-health-title" className="mt-2 font-serif text-2xl">{t("title")}</h2></div>
      <Badge>{signalLabels[result.simulationStatus]}</Badge>
    </div>

    {result.score === null || !result.componentScores ? <div className="mt-5 border-l-2 border-ink/30 bg-paper-deep p-4" role="status">
      <p className="font-medium">{t("scoreUnavailable")}</p>
      <p className="mt-2 text-sm leading-6 text-ink/70">{t("missingExplanation")}</p>
      {Object.keys(result.availableComponentScores).length ? <dl className="mt-4 grid gap-2 sm:grid-cols-2">{healthComponentKeys.filter((key) => result.availableComponentScores[key] !== undefined).map((key) => <div key={key} className="text-sm"><dt className="text-ink/60">{labels[key]}</dt><dd className="font-semibold tabular-nums">{result.availableComponentScores[key]}/100</dd></div>)}</dl> : null}
      {result.missingComponents.length ? <p className="mt-3 text-xs text-ink/60">{t("missingInputs", { inputs: result.missingComponents.map((key) => labels[key]).join(", ") })}</p> : null}
    </div> : <>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="font-serif text-5xl tabular-nums">{result.score}</span><span className="text-sm text-ink/55">{t("outOf100")}</span><span className="border-l border-ink/20 pl-3 text-sm font-semibold">{t(statusKey[result.status])}</span></div>
      <p className="mt-3 text-sm leading-6 text-ink/70">{t("calculated")} {result.contributions[0] ? t(`factor_${result.contributions[0].key}` as never, { value: result.contributions[0].value } as never) : ""}</p>
      <HealthVisualization componentScores={result.componentScores} labels={labels} />
    </>}

    <p className="mt-5 border-t border-ink/10 pt-4 text-xs leading-5 text-ink/60">{t("inverseNote")}</p>
    {result.dataProvenance.length ? <details className="mt-4 border-t border-ink/10 pt-4">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">{t("sources")}</summary>
      <ul className="mt-2 divide-y divide-ink/10">
        {healthComponentKeys.map((key) => {
          const source = result.dataProvenance.find((item) => item.component === key);
          if (!source) return null;
          return <li key={key} className="grid gap-1 py-3 text-xs sm:grid-cols-[1fr_auto] sm:items-start"><span className="font-medium">{labels[key]} · {source.sourceName} · {truthLabels[source.truth]}{source.dataStatus ? ` · ${source.dataStatus.replaceAll("_", " ")}` : ""}</span><span className="text-ink/60">{source.sourceType}{source.sourceAuthority ? ` · ${t("authority", { level: source.sourceAuthority })}` : ""} · {t("observed", { date: formatDate(source.observedAt) })} · {t("checked", { date: formatDate(source.verifiedAt) })}{source.retrievedAt ? ` · ${t("retrieved", { date: formatDate(source.retrievedAt) })}` : ""}</span><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="editorial-link w-fit text-vermilion sm:col-span-2">{t("openSource")}<span className="sr-only"> ({accessibility("newTab")})</span></a></li>;
        })}
      </ul>
    </details> : null}
    {result.lastUpdated ? <p className="mt-3 text-xs text-ink/55">{t("oldestInput", { date: formatDate(result.lastUpdated) })}</p> : null}
  </section>;
}
