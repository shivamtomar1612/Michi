import type { Metadata } from "next";
import { ArrowRight, BarChart3 } from "lucide-react";
import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { EmptyState } from "@/components/ui/states";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "DMO workspace" };
export default async function DmoPage() { await requireRole(["dmo"]); return <WorkspaceShell role="DMO" basePath="/dmo"><div className="mx-auto max-w-4xl">
  <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-vermilion">Destination management</p><h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">See how travel moves through place.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-ink/65">DMO views are designed for aggregated destination health, visitor dispersion, community sentiment, and local economic signals.</p>
  <div className="mt-10"><EmptyState title="No destination indicators are connected" description="There are no visitor, host, capacity, sentiment, or economic aggregates configured for this account. DMO analytics will exclude individual traveler details." /></div>
  <div className="mt-10 border-t border-ink/10 pt-6"><h2 className="font-serif text-xl">Planned destination signals</h2><div className="mt-4 flex flex-wrap gap-2">{["Visitor pressure", "Visitor dispersion", "Community sentiment", "Host capacity", "Local economic proxy", "Cultural and trust metrics"].map((item) => <span key={item} className="border border-ink/15 px-3 py-2 text-xs text-ink/70">{item}</span>)}</div></div>
  <Link href="/destinations" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-vermilion">View published destinations <ArrowRight className="size-4" /></Link>
  <div className="mt-8 flex gap-4 border-t border-ink/10 pt-6"><BarChart3 className="mt-1 size-5 text-moss" /><p className="max-w-lg text-sm leading-6 text-ink/65">Destination analytics are not connected. No simulated or live charts are shown.</p></div>
</div></WorkspaceShell>; }
