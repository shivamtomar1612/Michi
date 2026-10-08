"use client";

import { useActionState } from "react";
import { reviewContentReport } from "@/features/admin/actions";
import { adminActionInitialState } from "@/features/admin/state";

export function ReviewReportForm({ reportId, status }: { reportId: string; status: string }) {
  const [state, action, pending] = useActionState(reviewContentReport, adminActionInitialState);
  return <form action={action} className="mt-4 grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-2">
    <input type="hidden" name="reportId" value={reportId} />
    <label className="grid gap-1 text-sm">Decision<select name="status" defaultValue={status === "pending" ? "under_review" : status} className="min-h-10 border border-ink/20 bg-white px-3"><option value="under_review">Under review</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></label>
    <label className="grid gap-1 text-sm">Reason code<select name="reason" className="min-h-10 border border-ink/20 bg-white px-3">{["inaccurate", "safety", "cultural_concern", "accessibility", "misleading_commercial_claim", "privacy", "other"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
    <label className="grid gap-1 text-sm sm:col-span-2">Private review note<textarea name="reviewerNote" rows={3} maxLength={1200} className="border border-ink/20 p-3" /></label>
    <button disabled={pending} className="min-h-10 justify-self-start bg-ink px-4 text-sm text-white disabled:opacity-50">{pending ? "Saving…" : "Save review"}</button>
    {state.message ? <p role={state.success ? "status" : "alert"} className="self-center text-sm">{state.message}</p> : null}
  </form>;
}
