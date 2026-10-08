import type { Metadata } from "next";
import { DmoDashboard } from "@/components/dmo-dashboard";
import { WorkspaceShell } from "@/components/workspace-shell";
import { monthStart, previousMonthStart } from "@/features/dmo/metrics";
import { requireRole } from "@/server/auth/guards";
import { getDmoDestinationMetrics, getDmoDestinations } from "@/server/dmo/service";

export const metadata: Metadata = { title: "Destination intelligence · MICHI DMO" };

export default async function DmoPage({ searchParams }: {
  searchParams: Promise<{ destinationId?: string; compareId?: string; month?: string }>;
}) {
  await requireRole(["dmo"]);
  const params = await searchParams;
  const { destinations, unavailable: destinationsUnavailable } = await getDmoDestinations();
  const selected = destinations.find((destination) => destination.id === params.destinationId) ?? destinations[0] ?? null;
  const compared = destinations.find((destination) => destination.id === params.compareId && destination.id !== selected?.id) ?? null;
  const month = monthStart(params.month);
  const previousMonth = previousMonthStart(month);
  const [result, previousResult, comparedResult] = selected ? await Promise.all([
    getDmoDestinationMetrics(selected.id, month),
    previousMonth ? getDmoDestinationMetrics(selected.id, previousMonth) : Promise.resolve({ metrics: null, health: null, unavailable: false }),
    compared ? getDmoDestinationMetrics(compared.id, month) : Promise.resolve({ metrics: null, health: null, unavailable: false }),
  ]) : [{ metrics: null, health: null, unavailable: false }, { metrics: null, health: null, unavailable: false }, { metrics: null, health: null, unavailable: false }];

  return <WorkspaceShell role="DMO" basePath="/dmo"><div className="mx-auto max-w-6xl">
    <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-vermilion">Destination management intelligence</p>
    <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-[-0.03em] sm:text-5xl">Understand what MICHI can evidence about a place.</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/65">A privacy-preserving view of destination health evidence, responsible discovery, host participation and consent-based community reports. These measures describe MICHI platform activity; they do not represent all tourism in the destination.</p>
    <div className="mt-8"><DmoDashboard destinations={destinations} selected={selected} month={month}
      metrics={result.metrics} health={result.health} unavailable={result.unavailable} destinationsUnavailable={destinationsUnavailable}
      previousMonth={previousMonth} previousMetrics={previousResult.metrics} comparison={compared}
      comparisonMetrics={comparedResult.metrics} comparisonHealth={comparedResult.health} /></div>
  </div></WorkspaceShell>;
}
