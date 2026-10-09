import type { Metadata } from "next";
import { SkipLink } from "@/components/skip-link";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const metadata: Metadata = { title: "Shared journey" };
const sharedPlanSchema = z.object({
  id: z.string().uuid(), name: z.string(), start_date: z.string().nullable(), end_date: z.string().nullable(),
  items: z.array(z.object({ id: z.string().uuid(), title: z.string(), item_type: z.string(), starts_at: z.string().nullable(), ends_at: z.string().nullable(), sequence: z.number(), estimated_cost_jpy: z.number(), cost_status: z.string(), cultural_context_snapshot: z.string(), transport_estimate: z.record(z.string(), z.unknown()), data_status: z.string(), booking_mode: z.string(), availability_status: z.string(), availability_checked_at: z.string().nullable(), destination_health_score: z.number().nullable(), destination_health_status: z.string(), recommendation_score: z.number().nullable(), interest_compatibility: z.number().nullable(), suggestion_origin: z.string(), source_name: z.string().nullable(), source_url: z.string().nullable() }))
});

export default async function SharedItineraryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!z.string().uuid().safeParse(token).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_itinerary", { p_share_token: token });
  if (error || !data) notFound();
  const parsed = sharedPlanSchema.safeParse(data);
  if (!parsed.success) notFound();
  const plan = parsed.data;

  return <><SkipLink /><main id="main-content" className="min-h-screen bg-paper px-5 py-10 sm:px-10 sm:py-16">
    <article className="mx-auto max-w-3xl">
      <Link href="/" className="eyebrow">MICHI · Shared journey</Link>
      <p className="eyebrow mt-10">Read-only itinerary</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">{plan.name}</h1>
      <p className="mt-4 text-sm text-ink/60">{plan.start_date ?? "Dates not set"}{plan.end_date ? ` – ${plan.end_date}` : ""}. Shared details may be snapshots and should be rechecked before travel.</p>
      <ol className="mt-10 divide-y divide-ink/15 border-y border-ink/15">{plan.items.map((item) => <li key={item.id} className="py-6">
        <div className="flex flex-wrap gap-2"><Badge>{item.suggestion_origin === "original_preference" ? "Original Preference" : "MICHI Alternative"}</Badge><Badge>{item.data_status.replaceAll("_", " ")}</Badge>{item.booking_mode === "external" || item.booking_mode === "information_only" ? <Badge>Availability not integrated</Badge> : null}</div>
        <h2 className="mt-3 font-serif text-2xl">{item.title}</h2>
        <p className="mt-2 text-xs text-ink/55">{item.starts_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(item.starts_at)) + " JST" : "Time not supplied"} · {item.cost_status === "unknown" ? "Cost not verified" : `¥${item.estimated_cost_jpy.toLocaleString("en-US")}`}</p>
        {item.cultural_context_snapshot ? <p className="mt-3 text-sm leading-6 text-ink/70">{item.cultural_context_snapshot}</p> : null}
        <p className="mt-3 text-xs text-ink/60">Destination Health: {item.destination_health_status}{item.destination_health_score !== null ? ` · ${item.destination_health_score}/100` : " · unavailable"}. Transport estimates are not supplied.{item.availability_checked_at ? ` Slot capacity was checked ${new Date(item.availability_checked_at).toLocaleDateString()}; saving did not reserve it.` : ""}</p>
        {item.source_url && item.source_name ? <p className="mt-2 text-xs"><a href={item.source_url} target="_blank" rel="noreferrer" className="text-vermilion underline">{item.source_name} · source information</a></p> : null}
      </li>)}</ol>
      <p className="mt-8 text-xs leading-5 text-ink/55">A shared plan contains no traveler profile details or booking notes. MICHI does not reserve places through this page.</p>
    </article>
  </main></>;
}
