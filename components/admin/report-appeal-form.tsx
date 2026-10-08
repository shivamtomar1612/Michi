"use client";

import { useActionState } from "react";
import { requestReportAppeal } from "@/features/admin/actions";
import { adminActionInitialState } from "@/features/admin/state";

export function ReportAppealForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState(requestReportAppeal, adminActionInitialState);
  return <form action={action} className="mt-3 grid gap-2 border-t border-ink/10 pt-3">
    <input type="hidden" name="reportId" value={reportId} />
    <label className="grid gap-1 text-sm">Request reconsideration<textarea name="appealMessage" minLength={10} maxLength={1200} rows={3} required className="border border-ink/20 p-3" /></label>
    <button disabled={pending || state.success} className="min-h-10 justify-self-start border border-ink/25 px-4 text-sm disabled:opacity-50">{pending ? "Sending…" : state.success ? "Request sent" : "Request reconsideration"}</button>
    {state.message ? <p role={state.success ? "status" : "alert"} className="text-sm">{state.message}</p> : null}
  </form>;
}
