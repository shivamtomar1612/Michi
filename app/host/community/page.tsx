import type { Metadata } from "next";
import { CommunityFeedbackForm, CommunityFeedbackHistory, type CommunityReport } from "@/components/community-feedback";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Community · Host workspace" };

export default async function HostCommunityPage() {
  const { user } = await requireRole(["host"]);
  const supabase = await createClient();
  const [{ data: experiences, error: experienceError }, { data: reportRows, error: reportError }] = await Promise.all([
    supabase.from("experiences").select("destination_id").eq("host_id", user.id),
    supabase.from("community_feedback").select("id,destination_id,feedback_category,contributor_context,sentiment,pressure_score,comment,moderation_status,created_at")
      .eq("author_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const destinationIds = [...new Set((experiences ?? []).map((item) => item.destination_id))];
  const { data: destinations, error: destinationError } = destinationIds.length
    ? await supabase.from("destinations").select("id,name").in("id", destinationIds)
    : { data: [], error: null };
  const names = new Map((destinations ?? []).map((destination) => [destination.id, destination.name]));
  const reports: CommunityReport[] = (reportRows ?? []).map((report) => ({ ...report, destination_name: names.get(report.destination_id) ?? "Destination" }));
  const loadError = experienceError || reportError || destinationError;

  return <div className="mx-auto max-w-5xl"><p className="eyebrow">Community control</p><h1 className="mt-3 font-serif text-4xl">Community and place</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">Share observations connected to the destinations where you host. Reports are labeled host-provided, reviewed, and never presented as independent resident sentiment.</p>
    {loadError ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">Community information could not be loaded.</p> : <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <section className="border border-ink/15 bg-white p-5 sm:p-7"><h2 className="font-serif text-2xl">Share a host observation</h2><p className="mt-2 text-sm leading-6 text-ink/60">Avoid personal details about individual visitors or residents. Your report stays private until reviewed.</p><div className="mt-5"><CommunityFeedbackForm destinations={(destinations ?? []).map(({ id, name }) => ({ id, name }))} hostOnly /></div></section>
      <section><h2 className="font-serif text-2xl">Your host reports</h2><CommunityFeedbackHistory reports={reports} /></section>
    </div>}
  </div>;
}
