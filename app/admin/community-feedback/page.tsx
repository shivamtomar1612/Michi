import type { Metadata } from "next";
import { CommunityReviewForm } from "@/components/dmo-access-admin";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Community feedback review · MICHI admin" };

export default async function CommunityFeedbackReviewPage() {
  await requireRole(["admin"]);
  const admin = await createAdminClient();
  const { data: reports, error } = await admin.from("community_feedback")
    .select("id,destination_id,feedback_category,contributor_context,sentiment,pressure_score,comment,consent_to_aggregate,created_at")
    .eq("moderation_status", "pending").is("withdrawn_at", null).order("created_at", { ascending: true }).limit(100);
  const ids = [...new Set((reports ?? []).map((report) => report.destination_id))];
  const { data: destinations, error: destinationError } = ids.length
    ? await admin.from("destinations").select("id,name").in("id", ids)
    : { data: [], error: null };
  const names = new Map((destinations ?? []).map((destination) => [destination.id, destination.name]));
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-5xl">
    <p className="eyebrow">Community governance</p><h1 className="mt-3 font-serif text-4xl">Review community reports</h1>
    <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/65">Review content for relevance, respectful language, and personal information before approval. Approved reports contribute only to anonymous aggregates; narrative text and contributor identity stay out of the DMO portal.</p>
    {error || destinationError ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">The moderation queue could not be loaded.</p>
      : reports?.length ? <div className="mt-8 grid gap-4">{reports.map((report) => <article key={report.id} className="border border-ink/15 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-serif text-xl">{names.get(report.destination_id) ?? "Destination"} · {report.feedback_category.replaceAll("_", " ")}</h2><time className="text-xs text-ink/50">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.created_at))}</time></div>
        <p className="mt-2 text-xs text-ink/60">{report.contributor_context === "host" ? "Host-provided" : "Authorized community representative"} · {report.sentiment} · {report.consent_to_aggregate ? "Aggregate consent recorded" : "No aggregate consent"}</p>
        {report.pressure_score !== null ? <p className="mt-3 text-sm">Pressure observation: {report.pressure_score}/100</p> : null}
        {report.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{report.comment}</p> : <p className="mt-3 text-sm italic text-ink/55">No narrative provided.</p>}
        <CommunityReviewForm feedbackId={report.id} />
      </article>)}</div>
        : <p className="mt-8 border-y border-ink/10 py-8 text-sm text-ink/60">No community reports are awaiting review.</p>}
  </div></WorkspaceShell>;
}
