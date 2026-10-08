import { Badge } from "@/components/ui/badge";
import { HealthVisualization } from "@/components/health-visualization";
import { healthComponentKeys, type DestinationHealthResult, type HealthComponentKey } from "@/features/destination-health/types";
import { HealthViewedTracker } from "@/features/destination-health/health-viewed-tracker";

const labels: Record<HealthComponentKey, string> = {
  crowdPressure: "Crowd pressure",
  remainingCapacity: "Remaining capacity",
  communityReadiness: "Community readiness",
  transportAccessibility: "Transport accessibility",
  seasonalSuitability: "Seasonal suitability",
};

const signalLabels = { live: "Live source", snapshot: "Verified snapshot", simulated: "Simulated", unavailable: "Unavailable" } as const;
const truthLabels = { official: "Verified official", community: "Community provided", host: "Host provided", simulated: "Simulated", unverified: "Unverified", stale: "Stale" } as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

export function DestinationHealthCard({ destinationId, result }: { destinationId: string; result: DestinationHealthResult }) {
  return <section aria-labelledby="destination-health-title" className="border border-ink/15 bg-white p-5 sm:p-6">
    <HealthViewedTracker destinationId={destinationId} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="eyebrow">Destination Health</p><h2 id="destination-health-title" className="mt-2 font-serif text-2xl">A clear view of current conditions.</h2></div>
      <Badge>{signalLabels[result.simulationStatus]}</Badge>
    </div>

    {result.score === null || !result.componentScores ? <div className="mt-5 border-l-2 border-ink/30 bg-paper-deep p-4" role="status">
      <p className="font-medium">Health score unavailable</p>
      <p className="mt-2 text-sm leading-6 text-ink/70">{result.explanation}</p>
      {Object.keys(result.availableComponentScores).length ? <dl className="mt-4 grid gap-2 sm:grid-cols-2">{healthComponentKeys.filter((key) => result.availableComponentScores[key] !== undefined).map((key) => <div key={key} className="text-sm"><dt className="text-ink/60">{labels[key]}</dt><dd className="font-semibold tabular-nums">{result.availableComponentScores[key]}/100</dd></div>)}</dl> : null}
      {result.missingComponents.length ? <p className="mt-3 text-xs text-ink/60">Missing verified inputs: {result.missingComponents.map((key) => labels[key]).join(", ")}.</p> : null}
    </div> : <>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="font-serif text-5xl tabular-nums">{result.score}</span><span className="text-sm text-ink/55">/ 100</span><span className="border-l border-ink/20 pl-3 text-sm font-semibold">{result.status}</span></div>
      <p className="mt-3 text-sm leading-6 text-ink/70">{result.explanation}</p>
      <HealthVisualization componentScores={result.componentScores} labels={labels} />
    </>}

    <p className="mt-5 border-t border-ink/10 pt-4 text-xs leading-5 text-ink/60">Crowd pressure is the only inverse input: higher pressure lowers the score. Other inputs are scored higher-is-better. MICHI does not use a missing value as zero.</p>
    {result.dataProvenance.length ? <details className="mt-4 border-t border-ink/10 pt-4">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">View signal sources and dates</summary>
      <ul className="mt-2 divide-y divide-ink/10">
        {healthComponentKeys.map((key) => {
          const source = result.dataProvenance.find((item) => item.component === key);
          if (!source) return null;
          return <li key={key} className="grid gap-1 py-3 text-xs sm:grid-cols-[1fr_auto] sm:items-start"><span className="font-medium">{labels[key]} · {source.sourceName} · {truthLabels[source.truth]}{source.dataStatus ? ` · ${source.dataStatus.replaceAll("_", " ")}` : ""}</span><span className="text-ink/60">{source.sourceType}{source.sourceAuthority ? ` · authority ${source.sourceAuthority}/5` : ""} · observed {formatDate(source.observedAt)} · checked {formatDate(source.verifiedAt)}{source.retrievedAt ? ` · retrieved ${formatDate(source.retrievedAt)}` : ""}</span><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="editorial-link w-fit text-vermilion sm:col-span-2">Open source<span className="sr-only"> (opens in a new tab)</span></a></li>;
        })}
      </ul>
    </details> : null}
    {result.lastUpdated ? <p className="mt-3 text-xs text-ink/55">Oldest input used for this score: {formatDate(result.lastUpdated)} (Asia/Tokyo)</p> : null}
  </section>;
}
