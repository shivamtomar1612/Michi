import type { Metadata } from "next";
import { HostFeedbackForm } from "@/components/host-platform";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Community · Host workspace" };

export default async function HostCommunityPage() {
  const { user } = await requireRole(["host"]);
  const supabase = await createClient();
  const [{ data: experiences, error: experienceError }, { data: reports, error: reportError }] = await Promise.all([
    supabase.from("experiences").select("id,destination_id,title").eq("host_id", user.id),
    supabase.from("community_feedback").select("id,destination_id,sentiment,pressure_score,comment,created_at").eq("host_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const destinationIds = [...new Set((experiences ?? []).map((item) => item.destination_id))];
  const { data: destinations, error: destinationError } = destinationIds.length ? await supabase.from("destinations").select("id,name").in("id", destinationIds) : { data: [], error: null };
  const names = new Map((destinations ?? []).map((item) => [item.id, item.name]));
  return <div className="mx-auto max-w-5xl"><p className="eyebrow">Community control</p><h1 className="mt-3 font-serif text-4xl">Community and place</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">Report what you observe around your own experiences. MICHI labels this as host-provided information and does not treat it as independently verified community sentiment.</p>
    {experienceError || reportError || destinationError ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">Community information could not be loaded.</p> : <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.1fr]"><section className="border border-ink/15 bg-white p-5 sm:p-7"><h2 className="font-serif text-2xl">Share an observation</h2><p className="mt-2 text-sm leading-6 text-ink/60">Include the period and context when reporting pressure or community readiness. Avoid personal details about individual visitors or residents.</p><div className="mt-5"><HostFeedbackForm destinations={(destinations ?? []).map(({ id, name }) => ({ id, name }))} /></div></section><section><h2 className="font-serif text-2xl">Your host reports</h2>{reports?.length ? <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">{reports.map((report) => <li key={report.id} className="py-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{names.get(report.destination_id) ?? "Destination"} · {report.sentiment}</p><time className="text-xs text-ink/50">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(report.created_at))}</time></div>{report.pressure_score !== null ? <p className="mt-2 text-xs text-ink/55">Host pressure observation: {report.pressure_score}/100</p> : null}<p className="mt-2 text-sm leading-6">{report.comment}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-ink/45">Provided by host</p></li>)}</ul> : <p className="mt-4 border-y border-ink/10 py-6 text-sm text-ink/60">No host reports have been submitted.</p>}</section></div>}
  </div>;
}
