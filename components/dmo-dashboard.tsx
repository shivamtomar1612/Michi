import { ChartNoAxesCombined, CircleHelp, ShieldCheck } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { metricDelta, type DmoMetrics, type MetricValue } from "@/features/dmo/metrics";
import type { DestinationHealthResult } from "@/features/destination-health/types";
import type { DmoDestination } from "@/server/dmo/service";

const labels: Array<[keyof DmoMetrics["metrics"], string, string]> = [
  ["destinationViewSessions", "Destination discovery", "Distinct MICHI browser sessions that viewed this destination."],
  ["experienceViewSessions", "Experience discovery", "Distinct MICHI sessions that viewed a listed experience."],
  ["recommendationSessions", "Recommendations", "Distinct MICHI sessions that generated recommendations for this destination."],
  ["alternativeConsiderationSessions", "Alternative consideration", "Distinct sessions that considered this destination as an alternative."],
  ["itineraryGenerationSessions", "Itinerary planning", "Distinct sessions that generated an itinerary including this destination."],
  ["confirmedBookingCount", "Confirmed MICHI bookings", "Confirmed or completed MICHI bookings recorded in this month."],
  ["activeVerifiedExperiences", "Active verified experiences", "Published, verified, unpaused experiences; suppressed below five distinct hosts."],
  ["remainingSlotCapacity", "Upcoming slot capacity", "Remaining MICHI slot places in this month; suppressed below five hosts."],
  ["slotUtilizationPercent", "Slot utilization", "Reserved guest places divided by published slot capacity in this month."],
  ["recordedBookingValueJpy", "Recorded booking value", "Recorded MICHI booking value, not realized revenue or total local economic impact."],
  ["culturalLearningSessions", "Cultural learning", "Distinct MICHI sessions with a cultural companion interaction."],
  ["reflectionTravelers", "Private reflection participants", "Distinct travelers who completed a private reflection; narrative text is never returned."],
  ["passportAchievementTravelers", "Passport engagement", "Distinct travelers with a qualifying achievement tied to a booking here."],
];

function show(metric: MetricValue, label: string): string {
  if (metric.value === null || metric.state !== "available") return metric.state === "unavailable" ? "Unavailable" : "Insufficient data";
  if (label.includes("value")) return `¥${new Intl.NumberFormat("en").format(metric.value)}`;
  if (label.includes("Percent") || label.includes("utilization")) return `${metric.value}%`;
  return new Intl.NumberFormat("en").format(metric.value);
}

function TrendPanel({ current, previous, month, previousMonth }: { current: DmoMetrics; previous: DmoMetrics | null; month: string; previousMonth: string | null }) {
  const rows = labels.slice(0, 5).map(([key, label]) => ({
    key, label,
    current: current.metrics[key] as MetricValue,
    previous: previous?.metrics[key] as MetricValue | undefined,
  }));
  return <section className="border border-ink/15 bg-white p-5 sm:p-7" aria-labelledby="trend-title">
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">Month-over-month</p><h2 id="trend-title" className="mt-2 font-serif text-2xl">Activity trend</h2>
    <p className="mt-2 text-xs leading-5 text-ink/60">Distinct MICHI sessions across disjoint calendar months. Trends are shown only when both periods meet the reporting threshold.</p>
    {previous && previousMonth ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[34rem] border-collapse text-left text-xs"><caption className="sr-only">MICHI discovery activity trend comparing {previousMonth.slice(0, 7)} with {month.slice(0, 7)}</caption><thead><tr className="border-b border-ink/15"><th scope="col" className="py-2 pr-3">Metric</th><th scope="col" className="py-2 pr-3">{previousMonth.slice(0, 7)}</th><th scope="col" className="py-2 pr-3">{month.slice(0, 7)}</th><th scope="col" className="py-2">Change</th></tr></thead><tbody>{rows.map(({ key, label, current: nowValue, previous: earlierValue }) => {
      const delta = earlierValue ? metricDelta(nowValue, earlierValue) : null;
      return <tr key={key} className="border-b border-ink/10"><th scope="row" className="py-3 pr-3 font-medium">{label}</th><td className="py-3 pr-3">{earlierValue ? show(earlierValue, label) : "Insufficient data"}</td><td className="py-3 pr-3">{show(nowValue, label)}</td><td className="py-3">{delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}</td></tr>;
    })}</tbody></table></div> : <p role="status" className="mt-5 text-sm text-ink/60">A previous full calendar month is not available for this selection.</p>}
  </section>;
}

function HealthPanel({ health }: { health: DestinationHealthResult }) {
  const complete = health.score !== null;
  return <section className="border border-ink/15 bg-white p-5 sm:p-7" aria-labelledby="health-title">
    <div className="flex items-start gap-3"><ShieldCheck className="mt-1 size-5 text-moss" aria-hidden="true" /><div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">Verified destination evidence</p>
      <h2 id="health-title" className="mt-2 font-serif text-2xl">Destination Health</h2>
    </div></div>
    {complete ? <div className="mt-5"><p className="font-serif text-4xl tabular-nums">{health.score}<span className="ml-2 text-base text-ink/60">{health.status}</span></p><p className="mt-2 text-sm leading-6 text-ink/65">{health.explanation}</p></div>
      : <p role="status" className="mt-5 border-l-2 border-ink/25 bg-paper p-4 text-sm leading-6 text-ink/70">No complete current verified Health Score is available. MICHI will not estimate missing components or show a crowd claim.</p>}
    {Object.keys(health.availableComponentScores).length > 0 ? <dl className="mt-5 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(health.availableComponentScores).map(([key, value]) => <div key={key} className="bg-paper p-3"><dt className="text-xs text-ink/60">{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</dt><dd className="mt-1 font-semibold tabular-nums">{value}/100</dd></div>)}</dl> : null}
    {health.missingComponents.length ? <p className="mt-4 text-xs text-ink/60">Missing or unsuitable components: {health.missingComponents.join(", ")}.</p> : null}
    {health.dataProvenance.length ? <details className="mt-5 border-t border-ink/10 pt-4"><summary className="cursor-pointer text-sm font-semibold">Evidence and source details</summary><ul className="mt-3 grid gap-3">{health.dataProvenance.map((item) => <li key={item.component} className="text-xs leading-5 text-ink/65"><span className="font-semibold text-ink">{item.component}</span> · {item.sourceName} · checked {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.retrievedAt ?? item.verifiedAt))}<br /><a className="break-all text-vermilion underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceUrl}</a></li>)}</ul></details> : null}
  </section>;
}

function ActivityChart({ metrics }: { metrics: DmoMetrics["metrics"] }) {
  const chartRows = labels.slice(0, 5).map(([key, label]) => [label, metrics[key] as MetricValue] as const);
  const values = chartRows.map(([, metric]) => metric.state === "available" ? metric.value ?? 0 : 0);
  const max = Math.max(...values, 1);
  return <section className="border border-ink/15 bg-white p-5 sm:p-7" aria-labelledby="activity-title">
    <div className="flex items-start gap-3"><ChartNoAxesCombined className="mt-1 size-5 text-moss" aria-hidden="true" /><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">MICHI activity</p><h2 id="activity-title" className="mt-2 font-serif text-2xl">Discovery and planning</h2></div></div>
    {chartRows.every(([, metric]) => metric.state !== "available") ? <p className="mt-5 border-l-2 border-ink/25 bg-paper p-4 text-sm leading-6 text-ink/70">Insufficient activity for a privacy-safe chart in this period. Suppressed values are not zero.</p>
      : <div className="mt-6 grid gap-4" role="img" aria-label="Bar chart showing MICHI destination discovery and planning activity for this month">
        {chartRows.map(([label, metric]) => <div key={label} className="grid gap-2 sm:grid-cols-[12rem_1fr_6rem] sm:items-center">
          <span className="text-xs text-ink/70">{label}</span>
          <div className="h-3 bg-ink/5"><div className="h-full bg-moss" style={{ width: metric.state === "available" && metric.value !== null ? `${Math.max(2, metric.value / max * 100)}%` : "0%" }} /></div>
          <span className="text-xs tabular-nums text-ink/65">{show(metric, label)}</span>
        </div>)}
      </div>}
    <table className="sr-only"><caption>MICHI discovery and planning activity</caption><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>{chartRows.map(([label, metric]) => <tr key={label}><th>{label}</th><td>{show(metric, label)}</td></tr>)}</tbody></table>
  </section>;
}

function FeedbackPanel({ title, metric, previous, contextLabel }: {
  title: string; metric: DmoMetrics["metrics"]["communityFeedback"];
  previous: DmoMetrics["metrics"]["communityFeedback"] | null; contextLabel: string;
}) {
  const count = (value: number | null, state: string) => state === "unavailable" ? "Unavailable" : value === null ? "Insufficient data" : value;
  const categories = [
    ["Positive", metric.positive, metric.positiveState, previous?.positive, previous?.positiveState],
    ["Neutral", metric.neutral, metric.neutralState, previous?.neutral, previous?.neutralState],
    ["Concerned", metric.negative, metric.negativeState, previous?.negative, previous?.negativeState],
  ] as const;
  return <section className="border border-ink/15 bg-white p-5 sm:p-7" aria-label={title}>
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">{contextLabel}</p><h2 className="mt-2 font-serif text-2xl">{title}</h2>
    <p className="mt-2 text-xs leading-5 text-ink/60">Counts represent distinct contributors in a category, and each category is independently suppressed below five. Narratives are private and excluded.</p>
    {metric.state === "available" ? <>
      <dl className="mt-4 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2"><div className="bg-paper p-4"><dt className="text-xs">Positive contributors</dt><dd className="mt-2 font-serif text-2xl">{count(metric.positive, metric.positiveState)}</dd></div><div className="bg-paper p-4"><dt className="text-xs">Neutral contributors</dt><dd className="mt-2 font-serif text-2xl">{count(metric.neutral, metric.neutralState)}</dd></div><div className="bg-paper p-4"><dt className="text-xs">Concerned contributors</dt><dd className="mt-2 font-serif text-2xl">{count(metric.negative, metric.negativeState)}</dd></div><div className="bg-paper p-4"><dt className="text-xs">Average pressure observation</dt><dd className="mt-2 font-serif text-2xl">{count(metric.averagePressure, metric.pressureState)}{metric.averagePressure === null ? "" : "/100"}</dd></div></dl>
      {previous ? <div className="mt-4 border-t border-ink/10 pt-4"><p className="text-xs font-semibold">Previous month category trend</p><ul className="mt-2 grid gap-2 text-xs text-ink/65 sm:grid-cols-3">{categories.map(([label, value, state, previousValue, previousState]) => <li key={label}>{label}: {previousValue !== null && previousValue !== undefined && previousState === "available" && value !== null && state === "available" ? `${previousValue} → ${value}` : "Insufficient data in one or both months"}</li>)}</ul></div> : null}
    </> : <p role="status" className="mt-4 border-l-2 border-ink/25 bg-paper p-4 text-sm leading-6 text-ink/65">Not enough distinct approved, consented contributors in this period. MICHI does not infer sentiment.</p>}
  </section>;
}

export function DmoDashboard({ destinations, selected, month, metrics, health, unavailable, destinationsUnavailable,
  previousMonth, previousMetrics, comparison, comparisonMetrics, comparisonHealth }: {
  destinations: DmoDestination[]; selected: DmoDestination | null; month: string; metrics: DmoMetrics | null;
  health: DestinationHealthResult | null; unavailable: boolean; destinationsUnavailable: boolean;
  previousMonth: string | null; previousMetrics: DmoMetrics | null; comparison: DmoDestination | null;
  comparisonMetrics: DmoMetrics | null; comparisonHealth: DestinationHealthResult | null;
}) {
  if (destinationsUnavailable) return <ErrorState title="Destination access could not load" description="The assigned-destination list is temporarily unavailable. No analytics are shown without a verified authorization scope." returnHref="/dmo" returnLabel="Retry" />;
  if (!destinations.length) return <EmptyState title="No destination access is assigned" description="An administrator must grant this account DMO analytics access for each destination. Your DMO role alone does not grant destination access." actionHref="/destinations" actionLabel="View published destinations" />;
  return <div className="grid gap-7">
    <section className="border border-ink/15 bg-white p-5 sm:p-7">
      <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <label htmlFor="destination-select" className="grid gap-1.5 text-xs font-semibold">Authorized destination<select id="destination-select" name="destinationId" defaultValue={selected?.id ?? ""} className="min-h-11 min-w-56 border border-ink/20 bg-white px-3 text-sm">
            {destinations.map((destination) => <option value={destination.id} key={destination.id}>{destination.name}{destination.prefecture ? ` · ${destination.prefecture}` : ""}</option>)}
          </select></label>
          <label htmlFor="compare-select" className="grid gap-1.5 text-xs font-semibold">Compare with (optional)<select id="compare-select" name="compareId" defaultValue={comparison?.id ?? ""} className="min-h-11 min-w-56 border border-ink/20 bg-white px-3 text-sm"><option value="">No comparison</option>
            {destinations.filter((destination) => destination.id !== selected?.id).map((destination) => <option value={destination.id} key={destination.id}>{destination.name}</option>)}
          </select></label>
          <label className="grid gap-1.5 text-xs font-semibold" htmlFor="dmo-month">Reporting month<input id="dmo-month" type="month" name="month" defaultValue={month.slice(0, 7)} className="min-h-11 border border-ink/20 bg-white px-3 text-sm" /></label>
          <button className="min-h-11 bg-ink px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion">Update view</button>
        </form>
      <div className="mt-4 border-t border-ink/10 pt-4">
        {selected ? <p className="mt-2 text-xs text-ink/55">{selected.region ?? "Japan"} · authorized read-only analytics</p> : null}
        <p className="mt-2 text-xs leading-5 text-ink/55">All analytics describe MICHI platform activity. They are not estimates of total visitor arrivals.</p>
      </div>
    </section>
    {!selected ? <EmptyState title="Choose an authorized destination" description="Select a destination assigned to your DMO account." />
      : unavailable || !metrics ? <ErrorState title="Analytics could not load" description="The authorized aggregate service is temporarily unavailable. No partial or estimated values are displayed." returnHref="/dmo" returnLabel="Return to DMO overview" />
        : <>
          <div className="flex items-start gap-3 border-l-2 border-vermilion bg-[#fbf4f0] p-4"><CircleHelp className="mt-0.5 size-4 text-[#8a3826]" aria-hidden="true" /><p className="text-xs leading-5 text-ink/70">Small contributor groups are suppressed (minimum cohort: {metrics.minimumCohort}). Calendar months are disjoint. A suppressed value means evidence is insufficient, not zero.</p></div>
          {health ? <HealthPanel health={health} /> : null}
          <ActivityChart metrics={metrics.metrics} />
          {previousMonth ? <TrendPanel current={metrics} previous={previousMetrics} month={month} previousMonth={previousMonth} /> : null}
          <section className="border border-ink/15 bg-white p-5 sm:p-7" aria-labelledby="operations-title">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">Operational participation</p><h2 id="operations-title" className="mt-2 font-serif text-2xl">Hosts, bookings and local participation</h2>
            <p className="mt-2 text-xs leading-5 text-ink/60">Counts include only MICHI verified hosts, experiences, and recorded bookings. Booking value is an administrative proxy; MICHI does not claim it as realized revenue.</p>
            <dl className="mt-5 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">{labels.slice(5, 10).map(([key, label, description]) => {
              const metric = metrics.metrics[key] as MetricValue;
              return <div key={key} className="bg-paper p-4"><dt className="text-xs font-semibold">{label}</dt><dd className="mt-2 font-serif text-2xl tabular-nums">{show(metric, label)}</dd><p className="mt-2 text-xs leading-5 text-ink/55">{description}</p></div>;
            })}</dl>
          </section>
          {comparison ? <section className="border border-ink/15 bg-white p-5 sm:p-7" aria-labelledby="comparison-title">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">Authorized destination comparison</p><h2 id="comparison-title" className="mt-2 font-serif text-2xl">{selected.name} and {comparison.name}</h2>
            {comparisonMetrics ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[34rem] border-collapse text-left text-xs"><caption className="sr-only">MICHI platform metrics in {month.slice(0, 7)} for two authorized destinations</caption><thead><tr className="border-b border-ink/15"><th scope="col" className="py-2 pr-3">Metric</th><th scope="col" className="py-2 pr-3">{selected.name}</th><th scope="col" className="py-2">{comparison.name}</th></tr></thead><tbody>{labels.slice(0, 10).map(([key, label]) => <tr key={key} className="border-b border-ink/10"><th scope="row" className="py-3 pr-3 font-medium">{label}</th><td className="py-3 pr-3">{show(metrics.metrics[key] as MetricValue, label)}</td><td className="py-3">{show(comparisonMetrics.metrics[key] as MetricValue, label)}</td></tr>)}</tbody></table></div>
              : <p role="status" className="mt-4 text-sm text-ink/60">Comparison metrics are unavailable for this period.</p>}
            <div className="mt-6 grid gap-5 sm:grid-cols-2"><div className="border-t border-ink/10 pt-4"><p className="text-xs font-semibold">{selected.name} · Health</p><p className="mt-2 text-sm">{health?.score === null || !health ? "Insufficient current verified evidence" : `${health.score} · ${health.status}`}</p></div><div className="border-t border-ink/10 pt-4"><p className="text-xs font-semibold">{comparison.name} · Health</p><p className="mt-2 text-sm">{comparisonHealth?.score === null || !comparisonHealth ? "Insufficient current verified evidence" : `${comparisonHealth.score} · ${comparisonHealth.status}`}</p></div></div>
          </section> : null}
          <FeedbackPanel title="Community representative reports" metric={metrics.metrics.communityFeedback} previous={previousMetrics?.metrics.communityFeedback ?? null} contextLabel="Authorized community representatives" />
          <FeedbackPanel title="Host-provided observations" metric={metrics.metrics.hostObservations} previous={previousMetrics?.metrics.hostObservations ?? null} contextLabel="MICHI host-provided information" />
          <section className="border border-ink/15 bg-white p-5 sm:p-7" aria-labelledby="cultural-title">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">Cultural engagement</p><h2 id="cultural-title" className="mt-2 font-serif text-2xl">Learning and reflection</h2>
            <p className="mt-2 text-xs leading-5 text-ink/60">Only aggregate participation counts are returned. Private reflection text, identity, and individual Cultural Passport details are not available to DMO accounts.</p>
            <dl className="mt-5 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2">{labels.slice(10).map(([key, label, description]) => {
              const metric = metrics.metrics[key] as MetricValue;
              return <div key={key} className="bg-paper p-4"><dt className="text-xs font-semibold">{label}</dt><dd className="mt-2 font-serif text-2xl tabular-nums">{show(metric, label)}</dd><p className="mt-2 text-xs leading-5 text-ink/55">{description}</p></div>;
            })}</dl>
          </section>
          <section className="border-t border-ink/10 pt-5"><h2 className="font-serif text-xl">Measurement limits</h2><ul className="mt-3 grid gap-2 text-xs leading-5 text-ink/60 sm:grid-cols-2">{metrics.limitations.map((limitation) => <li key={limitation} className="border-l border-ink/20 pl-3">{limitation}</li>)}</ul></section>
        </>}
  </div>;
}
