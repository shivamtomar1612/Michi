"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { buildResponsibleNudge } from "@/features/destination-health/engine";
import type { DestinationHealthResult, RankedAlternative } from "@/features/destination-health/types";
import { trackDestinationHealthEvent } from "@/lib/analytics/client";

export function DestinationComparison({
  destinationId,
  destinationName,
  health,
  alternatives,
}: {
  destinationId: string;
  destinationName: string;
  health: DestinationHealthResult;
  alternatives: Array<RankedAlternative & { slug: string }>;
}) {
  const lastShownKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${destinationId}:${alternatives.length}`;
    if (!alternatives.length || lastShownKey.current === key) return;
    lastShownKey.current = key;
    trackDestinationHealthEvent({ eventName: "alternative_shown", destinationId, alternativeCount: alternatives.length });
  }, [alternatives.length, destinationId]);

  const nudge = buildResponsibleNudge(destinationName, health, alternatives.length);
  return <section aria-labelledby="destination-comparison-title" className="mt-6 border-t border-ink/15 pt-6">
    <p className="eyebrow">Compare destinations</p>
    <h2 id="destination-comparison-title" className="mt-2 font-serif text-2xl">Keep the choice yours.</h2>
    {nudge ? <p className="mt-4 border-l-2 border-vermilion bg-paper-deep p-4 text-sm leading-6 text-ink/75">{nudge}</p> : null}
    {alternatives.length ? <>
      <p className="mt-4 text-sm leading-6 text-ink/65">Alternatives are ranked from verified interest, cultural, geographic, capacity, accessibility, community, and health evidence. Choosing this destination remains available.</p>
      <ol className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
        {alternatives.map((alternative) => <li key={alternative.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-medium">{alternative.name}</p><p className="mt-1 text-xs text-ink/60">{alternative.distanceKm} km · match {alternative.score}/100 · capacity {alternative.remainingCapacity}/100</p></div><Link href={`/destinations/${alternative.slug}`} aria-label={`View ${alternative.name} as an alternative`} onClick={() => trackDestinationHealthEvent({ eventName: "alternative_selected", destinationId: alternative.id, targetDestinationId: destinationId })} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-vermilion">View<ArrowUpRight className="size-4" aria-hidden="true" /></Link></li>)}
      </ol>
    </> : <p className="mt-3 text-sm leading-6 text-ink/65">No verified alternative set is available for this destination yet. MICHI will not invent capacity, access, cultural relevance, or travel distance to create a comparison.</p>}
    <Link href="#places" onClick={() => trackDestinationHealthEvent({ eventName: "popular_destination_retained", destinationId })} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-ink/25 underline-offset-4">Continue exploring {destinationName}</Link>
  </section>;
}
