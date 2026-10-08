"use client";

import { useActionState } from "react";
import { communityActionInitialState, submitCommunityFeedback, withdrawCommunityFeedback, type CommunityActionState } from "@/features/community/actions";

const field = "min-h-11 w-full border border-ink/20 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion";
const textarea = "w-full border border-ink/20 bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion";

type DestinationOption = { id: string; name: string };
export type CommunityReport = {
  id: string; destination_id: string; feedback_category: string; contributor_context: string;
  sentiment: string; pressure_score: number | null; comment: string; moderation_status: string; created_at: string;
  destination_name: string;
};

function ActionMessage({ state }: { state: CommunityActionState }) {
  return state.message ? <p role="status" className={`text-sm ${state.success ? "text-moss" : "text-vermilion"}`}>{state.message}</p> : null;
}

export function CommunityFeedbackForm({ destinations, hostOnly = false }: { destinations: DestinationOption[]; hostOnly?: boolean }) {
  const [state, action, pending] = useActionState(submitCommunityFeedback, communityActionInitialState);
  return <form action={action} className="grid gap-4 border-t border-ink/10 pt-5">
    <p className="text-sm leading-6 text-ink/65">{hostOnly ? "This is recorded as host-provided context, not independent resident sentiment. " : "Only explicitly authorized community representatives can submit a report. "}Reports are kept private while reviewed. Only approved reports with your consent may contribute to anonymous destination aggregates. DMO users never receive names or narrative comments. Raw reports are retained for up to 25 months; withdrawal clears narrative details immediately.</p>
    <label className="grid gap-1.5 text-sm font-semibold">Destination<select name="destinationId" required className={field}><option value="">Choose an authorized destination</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold">Feedback dimension<select name="feedbackCategory" className={field}><option value="community_readiness">Community readiness</option><option value="visitor_pressure">Visitor pressure</option><option value="cultural_respect">Cultural respect</option><option value="operational_strain">Operational strain</option><option value="local_economic_benefit">Local economic benefit</option><option value="environmental_concern">Environmental concern</option></select></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold">Overall observation<select name="sentiment" className={field}><option value="positive">Positive</option><option value="neutral">Mixed or neutral</option><option value="negative">Concerned</option></select></label><label className="grid gap-1.5 text-sm font-semibold">Pressure observation (optional, 0–100)<input name="pressureScore" type="number" min={0} max={100} className={field} /></label></div>
    <label className="grid gap-1.5 text-sm font-semibold">Optional context<textarea name="comment" maxLength={1000} rows={4} className={textarea} /><span className="text-xs font-normal text-ink/55">Avoid names, contact details, or information about individual visitors.</span></label>
    <label className="flex items-start gap-3 text-xs leading-5 text-ink/70"><input name="consent" type="checkbox" required className="mt-1 size-4 accent-[#a63f2c]" /><span>I agree MICHI may include this report in anonymous destination-level aggregates after review. My identity and narrative will not be shown to DMO users. I can withdraw this report later.</span></label>
    {!destinations.length ? <p role="status" className="text-sm text-ink/60">No destination access is assigned to this account.</p> : null}
    <button type="submit" disabled={pending || !destinations.length} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Submitting…" : "Submit for review"}</button><ActionMessage state={state} />
  </form>;
}

function WithdrawButton({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState(withdrawCommunityFeedback, communityActionInitialState);
  return <form action={action} className="mt-3 grid justify-items-start gap-2">
    <input type="hidden" name="feedbackId" value={reportId} />
    <button type="submit" disabled={pending} className="min-h-9 text-xs font-semibold text-vermilion underline underline-offset-4 disabled:opacity-50">{pending ? "Withdrawing…" : "Withdraw this report"}</button>
    <ActionMessage state={state} />
  </form>;
}

export function CommunityFeedbackHistory({ reports }: { reports: CommunityReport[] }) {
  if (!reports.length) return <p className="mt-4 border-y border-ink/10 py-6 text-sm text-ink/60">No feedback reports have been submitted by this account.</p>;
  return <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">{reports.map((report) => <li key={report.id} className="py-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">{report.destination_name} · {report.feedback_category.replaceAll("_", " ")}</p><time className="text-xs text-ink/50">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(report.created_at))}</time></div>
    <p className="mt-2 text-xs text-ink/60">{report.sentiment} · {report.contributor_context === "host" ? "Host-provided" : "Community representative"} · {report.moderation_status.replaceAll("_", " ")}</p>
    {report.pressure_score !== null ? <p className="mt-2 text-xs text-ink/55">Pressure observation: {report.pressure_score}/100</p> : null}
    {report.comment ? <p className="mt-2 text-sm leading-6">{report.comment}</p> : null}
    {report.moderation_status !== "withdrawn" ? <WithdrawButton reportId={report.id} /> : null}
  </li>)}</ul>;
}
