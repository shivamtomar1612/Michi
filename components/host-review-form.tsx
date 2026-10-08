"use client";

import { useActionState } from "react";
import { reviewHostApplication } from "@/features/hosts/actions";

export function HostReviewForm({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState(reviewHostApplication, { message: "", success: false });
  return <form action={action} className="mt-4 grid gap-3 border-t border-ink/10 pt-4">
    <input type="hidden" name="applicationId" value={applicationId} />
    <label className="grid gap-1 text-sm font-semibold">Decision<select name="status" defaultValue="under_review" className="min-h-11 border border-ink/20 bg-white px-3 font-normal"><option value="under_review">Under review</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option></select></label>
    <label className="grid gap-1 text-sm font-semibold">Review note<textarea name="note" rows={2} maxLength={4000} className="border border-ink/20 bg-white p-3 font-normal" /></label>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input name="ownershipChecked" type="checkbox" className="size-4 accent-vermilion" />I independently verified the applicant’s right to operate this experience (required for approval).</label>
    <button type="submit" disabled={pending} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save review"}</button>
    {state.message ? <p role="status" className={state.success ? "text-sm text-moss" : "text-sm text-vermilion"}>{state.message}</p> : null}
  </form>;
}
