import type { HealthComponentKey } from "@/features/destination-health/types";

export function HealthVisualization({ componentScores, labels }: { componentScores: Record<HealthComponentKey, number>; labels: Record<HealthComponentKey, string> }) {
  return <figure className="mt-6 border-t border-ink/10 pt-4">
    <figcaption className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Verified inputs · 0 to 100</figcaption>
    <ul className="space-y-3">
      {(Object.keys(labels) as HealthComponentKey[]).map((key) => <li key={key} className="grid grid-cols-[minmax(8rem,1fr)_2fr_2.5rem] items-center gap-3 text-xs">
        <span>{labels[key]}</span>
        <progress aria-label={`${labels[key]}: ${componentScores[key]} out of 100`} max={100} value={componentScores[key]} className="h-2 w-full accent-moss" />
        <span className="text-right tabular-nums">{componentScores[key]}</span>
      </li>)}
    </ul>
  </figure>;
}
