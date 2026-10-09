import type { Metadata } from "next";
import { SkipLink } from "@/components/skip-link";
import { CommunityFeedbackForm, CommunityFeedbackHistory, type CommunityReport } from "@/components/community-feedback";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Community feedback · MICHI" };

export default async function CommunityFeedbackPage() {
  const { user, role } = await requireRole(["traveler", "host", "dmo"]);
  const supabase = await createClient();
  const [assignmentsResult, experiencesResult, reportsResult] = await Promise.all([
    supabase.from("destination_access_assignments").select("destination_id")
      .eq("user_id", user.id).eq("access_scope", "community_representative").is("revoked_at", null),
    role === "host" ? supabase.from("experiences").select("destination_id").eq("host_id", user.id) : Promise.resolve({ data: [], error: null }),
    supabase.from("community_feedback").select("id,destination_id,feedback_category,contributor_context,sentiment,pressure_score,comment,moderation_status,created_at")
      .eq("author_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const destinationIds = [...new Set([
    ...(assignmentsResult.data ?? []).map((item) => item.destination_id),
    ...(experiencesResult.data ?? []).map((item) => item.destination_id),
  ])];
  const { data: destinations, error: destinationError } = destinationIds.length
    ? await supabase.from("destinations").select("id,name").in("id", destinationIds)
    : { data: [], error: null };
  const destinationNames = new Map((destinations ?? []).map((destination) => [destination.id, destination.name]));
  const reports: CommunityReport[] = (reportsResult.data ?? []).map((report) => ({
    ...report,
    destination_name: destinationNames.get(report.destination_id) ?? "Destination",
  }));
  const loadError = assignmentsResult.error || experiencesResult.error || reportsResult.error || destinationError;

  return <><SkipLink /><main id="main-content" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
    <p className="eyebrow">Community voice · access controlled</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">Share what you observe about a place.</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/65">Only verified hosts and people explicitly authorized for a destination can submit reports. Every report is reviewed before aggregate use. MICHI does not treat feedback as a definitive measure of a whole community.</p>
    {loadError ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">Community access could not be loaded. Refresh or contact a MICHI administrator.</p>
      : <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]"><section className="border border-ink/15 bg-white p-5 sm:p-7"><h2 className="font-serif text-2xl">Submit a report</h2><div className="mt-5"><CommunityFeedbackForm destinations={(destinations ?? []).map(({ id, name }) => ({ id, name }))} /></div></section>
        <section><h2 className="font-serif text-2xl">Your reports</h2><p className="mt-2 text-sm text-ink/60">Pending reports are private. Approved reports contribute only to anonymous aggregates. You can withdraw any report.</p><CommunityFeedbackHistory reports={reports} /></section></div>}
  </main></>;
}
