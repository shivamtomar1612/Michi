"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, ExternalLink, Link2, LoaderCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { deleteItinerary, deleteItineraryItem, duplicateItinerary, reorderItinerary, setItinerarySharing, updateItinerary } from "@/features/itineraries/actions";

export type ManagedItinerary = {
  id: string; name: string; start_date: string | null; end_date: string | null; budget_jpy: number | null;
  visibility: "private" | "shared"; share_token: string | null;
};
export type ManagedItem = {
  id: string; title: string; item_type: string; starts_at: string | null; ends_at: string | null; sequence: number;
  rationale: string; estimated_cost_jpy: number; cost_status: string; cultural_context_snapshot: string;
  transport_estimate: { status?: string; distance_km?: number | null; duration_minutes?: number | null; source?: string | null };
  data_status: string; booking_mode: string; availability_status: string; destination_health_score: number | null;
  destination_health_status: string; recommendation_score: number | null; interest_compatibility: number | null;
  source_name: string | null; source_url: string | null; source_verified_at: string | null; availability_checked_at: string | null;
  suggestion_origin: string; destination_name: string | null;
};

export function ItineraryManager({ itinerary, initialItems }: { itinerary: ManagedItinerary; initialItems: ManagedItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState(itinerary.name);
  const [startDate, setStartDate] = useState(itinerary.start_date ?? "");
  const [endDate, setEndDate] = useState(itinerary.end_date ?? "");
  const [budget, setBudget] = useState(itinerary.budget_jpy?.toString() ?? "");
  const [shared, setShared] = useState(itinerary.visibility === "shared");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; message?: string; url?: string; shareUrl?: string }>, onSuccess?: (result: { url?: string; shareUrl?: string }) => void, onFailure?: () => void) {
    setError(""); setNotice("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) { onFailure?.(); setError(result.message ?? "The change could not be saved."); return; }
        onSuccess?.(result);
        setNotice("Saved.");
        router.refresh();
        if (result.url) router.push(result.url);
      } catch { setError("The change could not be saved. Please try again."); }
    });
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setItems(reordered);
    run(() => reorderItinerary({ itineraryId: itinerary.id, itemIds: reordered.map((item) => item.id) }), undefined, () => setItems(items));
  }

  return <div className="mt-8 space-y-10">
    <section className="border-y border-ink/15 py-6" aria-labelledby="journey-settings-title">
      <h2 id="journey-settings-title" className="font-serif text-2xl">Journey details</h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" action={(formData) => {
        const parsedBudget = String(formData.get("budget") ?? "").trim();
        run(() => updateItinerary({ itineraryId: itinerary.id, name: String(formData.get("name") ?? ""), startDate: String(formData.get("startDate") ?? ""), endDate: String(formData.get("endDate") ?? ""), budgetJpy: parsedBudget ? Number(parsedBudget) : null }));
      }}>
        <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">Journey name<Input name="name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} required /></label>
        <label className="grid gap-1.5 text-xs font-medium">Start date<Input name="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
        <label className="grid gap-1.5 text-xs font-medium">End date<Input name="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label>
        <label className="grid gap-1.5 text-xs font-medium">Experience budget (JPY)<Input name="budget" type="number" min="0" max="2000000" step="1" value={budget} onChange={(event) => setBudget(event.target.value)} /></label>
        <div className="flex items-end"><button disabled={pending} className="inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}Save details</button></div>
      </form>
      <div className="mt-6 flex flex-wrap gap-3 border-t border-ink/10 pt-5">
        <button type="button" disabled={pending} onClick={() => run(() => duplicateItinerary(itinerary.id))} className="inline-flex min-h-11 items-center gap-2 border border-ink/20 px-4 text-sm font-semibold"><Copy className="size-4" />Duplicate</button>
        <button type="button" disabled={pending} onClick={() => run(() => setItinerarySharing({ itineraryId: itinerary.id, shared: !shared }), (result) => { setShared(!shared); setShareUrl(result.shareUrl ?? ""); })} className="inline-flex min-h-11 items-center gap-2 border border-ink/20 px-4 text-sm font-semibold"><Link2 className="size-4" />{shared ? "Make private and revoke link" : "Create read-only share link"}</button>
        <button type="button" disabled={pending} onClick={() => {
          if (window.confirm("Delete this journey and its saved stops? This cannot be undone.")) run(() => deleteItinerary(itinerary.id));
        }} className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-vermilion"><Trash2 className="size-4" />Delete journey</button>
      </div>
      {shared ? <p className="mt-3 text-xs text-ink/60">Anyone with the private link can view the sanitized itinerary. Creating a new link revokes the previous one; switching to private revokes sharing.</p> : null}
      {shareUrl ? <div className="mt-3 flex flex-wrap items-center gap-2"><a className="break-all text-sm text-vermilion underline" href={shareUrl}>{shareUrl}</a><button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl).then(() => setNotice("Share link copied."), () => setNotice("Select and copy the share link."))} className="min-h-10 border border-ink/20 px-3 text-xs font-semibold">Copy link</button></div> : null}
    </section>

    <section aria-labelledby="journey-items-title"><div className="flex items-baseline justify-between gap-3"><h2 id="journey-items-title" className="font-serif text-2xl">Stops and experiences</h2><span className="text-xs text-ink/55">Drag-free reorder controls</span></div>
      {!items.length ? <p className="mt-4 border-y border-ink/10 py-5 text-sm text-ink/60">This journey has no stops yet.</p> : <ol className="mt-4 divide-y divide-ink/15">{items.map((item, index) => <li key={item.id} className="py-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge>{item.suggestion_origin === "original_preference" ? "Original Preference" : "MICHI Alternative"}</Badge><Badge>{item.data_status.replaceAll("_", " ")}</Badge>{item.booking_mode === "external" || item.booking_mode === "information_only" ? <Badge>Availability not integrated</Badge> : null}</div>
          <h3 className="mt-3 font-serif text-2xl">{item.title}</h3><p className="mt-1 text-xs text-ink/55">{item.destination_name ?? "Destination details unavailable"}{item.starts_at ? ` · ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(item.starts_at))} JST` : " · No time supplied"}</p>
          <p className="mt-3 text-sm leading-6 text-ink/70">{item.rationale || "No recommendation explanation was recorded."}</p>
          {item.cultural_context_snapshot ? <p className="mt-2 text-sm leading-6 text-ink/65">{item.cultural_context_snapshot}</p> : null}
          <dl className="mt-4 grid gap-2 text-xs text-ink/60 sm:grid-cols-2"><div><dt className="font-semibold text-ink/75">Cost</dt><dd>{item.cost_status === "unknown" ? "Not published or verified" : `¥${item.estimated_cost_jpy.toLocaleString("en-US")}`}</dd></div><div><dt className="font-semibold text-ink/75">Destination Health</dt><dd>{item.destination_health_status}{item.destination_health_score !== null ? ` · ${item.destination_health_score}/100` : " · evidence unavailable"}</dd></div><div><dt className="font-semibold text-ink/75">Transport</dt><dd>{item.transport_estimate.status === "unavailable" ? "No verified route estimate" : `${item.transport_estimate.distance_km ?? "?"} km · ${item.transport_estimate.duration_minutes ?? "?"} min`}</dd></div><div><dt className="font-semibold text-ink/75">Availability</dt><dd>{item.availability_status.replaceAll("_", " ")}{item.availability_checked_at ? ` · checked ${new Date(item.availability_checked_at).toLocaleString()}` : ""}</dd></div>{item.source_name ? <div><dt className="font-semibold text-ink/75">Source</dt><dd>{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="text-vermilion underline">{item.source_name} <ExternalLink className="inline size-3" /></a> : item.source_name}{item.source_verified_at ? ` · checked ${new Date(item.source_verified_at).toLocaleDateString()}` : ""}</dd></div> : null}</dl>
        </div><div className="flex shrink-0 items-center gap-1"><button type="button" aria-label={`Move ${item.title} up`} disabled={pending || index === 0} onClick={() => move(index, -1)} className="grid size-10 place-items-center border border-ink/20 disabled:opacity-35"><ArrowUp className="size-4" /></button><button type="button" aria-label={`Move ${item.title} down`} disabled={pending || index === items.length - 1} onClick={() => move(index, 1)} className="grid size-10 place-items-center border border-ink/20 disabled:opacity-35"><ArrowDown className="size-4" /></button><button type="button" aria-label={`Remove ${item.title}`} disabled={pending} onClick={() => run(() => deleteItineraryItem(item.id), () => setItems((current) => current.filter((entry) => entry.id !== item.id)))} className="grid size-10 place-items-center text-vermilion disabled:opacity-50"><Trash2 className="size-4" /></button></div></div>
      </li>)}</ol>}
    </section>
    {error ? <p role="alert" className="border-l-2 border-vermilion bg-[#fbf1ed] p-3 text-sm">{error}</p> : null}
    {notice ? <p role="status" className="border-l-2 border-moss bg-[#e9ece5] p-3 text-sm">{notice}</p> : null}
  </div>;
}
