"use client";

import { useActionState } from "react";
import { updateDestination } from "@/features/admin/actions";
import { adminActionInitialState } from "@/features/admin/state";

type Destination = { id: string; name: string; description: string; cultural_summary: string; status: string; prefecture: string; verification_status: string; source_url: string | null; last_verified_at: string | null };

export function DestinationEditor({ destination }: { destination: Destination }) {
  const [state, action, pending] = useActionState(updateDestination, adminActionInitialState);
  return <form action={action} className="grid gap-3 border border-ink/15 bg-white p-4">
    <input type="hidden" name="destinationId" value={destination.id} />
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-xl">{destination.name}</h2><p className="text-xs text-ink/60">{destination.prefecture} · {destination.verification_status} · {destination.last_verified_at ? `verified ${new Date(destination.last_verified_at).toLocaleDateString()}` : "not verified"}</p></div>{destination.source_url ? <a href={destination.source_url} target="_blank" rel="noreferrer" className="text-xs text-vermilion underline">Current source</a> : null}</div>
    <label className="grid gap-1 text-sm">Destination name<input name="name" required maxLength={120} defaultValue={destination.name} className="min-h-10 border border-ink/20 px-3" /></label>
    <label className="grid gap-1 text-sm">Description<textarea name="description" maxLength={3000} rows={3} defaultValue={destination.description} className="border border-ink/20 p-3" /></label>
    <label className="grid gap-1 text-sm">Cultural summary<textarea name="culturalSummary" maxLength={3000} rows={3} defaultValue={destination.cultural_summary} className="border border-ink/20 p-3" /></label>
    <label className="grid gap-1 text-sm">Publication status<select name="status" defaultValue={destination.status} className="min-h-10 border border-ink/20 bg-white px-3"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
    <p className="text-xs text-ink/55">The editor preserves existing source provenance and health signals. Publishing requires verified official provenance. Crowd or health values are not editable here.</p>
    <button disabled={pending} className="min-h-10 justify-self-start bg-ink px-4 text-sm text-white disabled:opacity-50">{pending ? "Saving…" : "Save destination"}</button>
    {state.message ? <p role={state.success ? "status" : "alert"} className="text-sm">{state.message}</p> : null}
  </form>;
}
