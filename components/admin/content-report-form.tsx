"use client";

import { useActionState } from "react";
import { reportPublicContent } from "@/features/admin/actions";
import { adminActionInitialState } from "@/features/admin/state";

export function ContentReportForm({ subjectType, subjectId }: { subjectType: string; subjectId: string }) {
  const [state, action, pending] = useActionState(reportPublicContent, adminActionInitialState);
  return <form action={action} className="mt-6 grid max-w-2xl gap-4 border border-ink/15 bg-white p-5">
    <input type="hidden" name="subjectType" value={subjectType} /><input type="hidden" name="subjectId" value={subjectId} />
    <label className="grid gap-1 text-sm">Reason<select name="reasonCode" className="min-h-11 border border-ink/20 bg-white px-3">{["inaccurate", "safety", "cultural_concern", "accessibility", "misleading_commercial_claim", "privacy", "other"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
    <label className="grid gap-1 text-sm">What should our team review?<textarea required name="details" minLength={10} maxLength={1200} rows={5} className="border border-ink/20 p-3" /><span className="text-xs text-ink/55">Keep the report focused. Do not include payment details or sensitive personal information.</span></label>
    <button disabled={pending || state.success} className="min-h-11 justify-self-start bg-ink px-5 text-sm text-white disabled:opacity-50">{pending ? "Submitting…" : state.success ? "Report received" : "Submit report"}</button>
    {state.message ? <p role={state.success ? "status" : "alert"} className="text-sm">{state.message}</p> : null}
  </form>;
}
