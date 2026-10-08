"use client";

import { useActionState } from "react";
import { dmoAdminInitialState, grantDestinationAccess, revokeDestinationAccess, reviewCommunityFeedback, type DmoAdminActionState } from "@/features/dmo/admin-actions";

const field = "min-h-11 w-full border border-ink/20 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion";
type Option = { id: string; label: string };

function Result({ state }: { state: DmoAdminActionState }) {
  return state.message ? <p role="status" className={`text-sm ${state.success ? "text-moss" : "text-vermilion"}`}>{state.message}</p> : null;
}

export function DestinationAccessGrantForm({ users, destinations }: { users: Option[]; destinations: Option[] }) {
  const [state, action, pending] = useActionState(grantDestinationAccess, dmoAdminInitialState);
  return <form action={action} className="grid gap-4 border border-ink/15 bg-white p-5 sm:grid-cols-2 sm:p-6">
    <label className="grid gap-1.5 text-xs font-semibold">Existing account<select name="userId" required defaultValue="" className={field}><option value="" disabled>Select an account</option>{users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</select></label>
    <label className="grid gap-1.5 text-xs font-semibold">Destination<select name="destinationId" required defaultValue="" className={field}><option value="" disabled>Select a published destination</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.label}</option>)}</select></label>
    <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Access scope<select name="scope" className={field}><option value="dmo_analytics">DMO aggregate analytics</option><option value="community_representative">Community representative feedback</option></select></label>
    <div className="sm:col-span-2"><p className="mb-3 text-xs leading-5 text-ink/60">Only existing accounts can be assigned. Granting DMO analytics promotes a traveler profile to the DMO role atomically. Host or admin roles cannot be promoted this way.</p><button disabled={pending || !users.length || !destinations.length} className="min-h-11 bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Grant access"}</button></div>
    <div className="sm:col-span-2"><Result state={state} /></div>
  </form>;
}

export function RevokeDestinationAccessForm({ assignmentId }: { assignmentId: string }) {
  const [state, action, pending] = useActionState(revokeDestinationAccess, dmoAdminInitialState);
  return <form action={action} className="mt-3 grid justify-items-start gap-2"><input type="hidden" name="assignmentId" value={assignmentId} /><button disabled={pending} className="min-h-9 text-xs font-semibold text-vermilion underline underline-offset-4">{pending ? "Revoking…" : "Revoke access"}</button><Result state={state} /></form>;
}

export function CommunityReviewForm({ feedbackId }: { feedbackId: string }) {
  const [state, action, pending] = useActionState(reviewCommunityFeedback, dmoAdminInitialState);
  return <form action={action} className="mt-4 flex flex-wrap items-center gap-3"><input type="hidden" name="feedbackId" value={feedbackId} /><button name="decision" value="approved" disabled={pending} className="min-h-10 bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">Approve for aggregates</button><button name="decision" value="rejected" disabled={pending} className="min-h-10 border border-ink/20 px-4 text-xs font-semibold disabled:opacity-50">Reject</button><Result state={state} /></form>;
}
