"use client";

import { useCallback, useEffect, useState } from "react";
import { CULTURAL_CATEGORIES } from "@/features/cultural-knowledge/types";
import { isCulturalRecordStale } from "@/features/cultural-knowledge/model";
import { SourceBadge, StaleWarning, VerificationBadge } from "@/components/cultural-knowledge-badges";

type Source = { id: string; name: string; base_url: string; source_type: string; authority_level: number; language: string; is_active: boolean; allow_automatic_ingestion: boolean; approved_domains: string[]; approved_urls: string[]; terms_reviewed_at: string | null; notes: string };
type Content = { id: string; title: string; summary: string | null; content: string; category: string; source_id: string; source_name: string; source_url: string; source_type: string; verification_status: string; authority_level: number; last_verified_at: string | null; next_verification_at: string | null; is_time_sensitive: boolean; is_active: boolean; created_at: string; metadata: Record<string, unknown> | null; hasConflict?: boolean };
type Chunk = { heading: string; text: string; kind: string; contentHash: string; sequence: number };
type Preview = { source: { id: string; name: string; sourceType: string; authorityLevel: number }; selectedUrl: string; fetched: { url: string; retrievedAt: string; contentType: string }; chunks: Chunk[] };

async function post(payload: unknown) {
  const response = await fetch("/api/admin/knowledge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const result = await response.json() as { error?: string; [key: string]: unknown };
  if (!response.ok) throw new Error(result.error ?? "Knowledge action failed.");
  return result;
}

export function CulturalKnowledgeAdmin({ view }: { view: "overview" | "sources" | "content" | "review" }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [counts, setCounts] = useState<{ activeSources: number | null; staleContent: number | null; awaitingReview: number | null } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      const requestedView = view === "sources" ? "sources" : view === "review" ? "review" : "overview";
      const response = await fetch("/api/admin/knowledge?view=" + requestedView, { cache: "no-store" });
      const result = await response.json() as { error?: string; sources?: Source[]; content?: Content[]; counts?: typeof counts };
      if (!response.ok) throw new Error(result.error ?? "Knowledge records could not be loaded.");
      setSources(result.sources ?? []); setContent(result.content ?? []); setCounts(result.counts ?? null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Knowledge records could not be loaded."); }
    finally { setLoading(false); }
  }, [view]);
  useEffect(() => { void load(); }, [load]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(success); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Action failed."); }
    finally { setBusy(false); }
  }

  if (view === "overview") return <div className="mt-7">
    <div className="grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3">{[["Active sources", counts?.activeSources], ["Stale content", counts?.staleContent], ["Awaiting review", counts?.awaitingReview]].map(([label, value]) => <div key={String(label)} className="bg-paper p-5"><p className="text-xs text-ink/60">{label}</p><p className="mt-2 font-serif text-3xl">{value ?? "Loading"}</p></div>)}</div>
    <nav aria-label="Knowledge administration" className="mt-7 flex flex-wrap gap-3">{[["Sources", "/admin/knowledge/sources"], ["Content", "/admin/knowledge/content"], ["Review queue", "/admin/knowledge/review"]].map(([label, href]) => <a key={href} href={href} className="border border-ink/20 px-4 py-3 text-sm underline underline-offset-4">{label}</a>)}</nav>
    <div className="mt-8"><h2 className="font-serif text-2xl">Recent knowledge records</h2><ContentList content={content.slice(0, 8)} loading={loading} /></div>
    <StatusMessage error={error} message={message} />
  </div>;

  if (view === "sources") return <div className="mt-7 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
    <section><h2 className="font-serif text-2xl">Register a cultural source</h2><form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await post({ action: "create_source", source: { name: data.get("name"), baseUrl: data.get("baseUrl"), sourceType: data.get("sourceType"), authorityLevel: Number(data.get("authorityLevel")), language: data.get("language"), notes: data.get("notes") } }); form.reset(); }, "Source added in inactive state."); }}>
      <Field label="Source name" name="name" required maxLength={160} /><Field label="Official base URL" name="baseUrl" required type="url" placeholder="https://example.jp/" />
      <label className="grid gap-1 text-sm">Source type<select name="sourceType" className="min-h-11 border border-ink/20 bg-white px-3">{["government", "national_tourism_board", "prefecture", "municipality", "dmo", "cultural_institution", "temple_shrine", "museum", "host", "editorial"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm">Authority<select name="authorityLevel" className="min-h-11 border border-ink/20 bg-white px-3">{[5, 4, 3, 2, 1].map((level) => <option key={level} value={level}>{level}</option>)}</select></label><Field label="Language" name="language" defaultValue="en" /></div>
      <label className="grid gap-1 text-sm">Notes<textarea name="notes" rows={3} maxLength={2000} className="border border-ink/20 bg-white p-3" /></label><button disabled={busy} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">Add inactive source</button>
    </form></section>
    <section><h2 className="font-serif text-2xl">Source registry</h2><p className="mt-2 text-sm text-ink/60">Automatic ingestion is off. A source and each page URL need explicit administrator approval.</p>
      <div className="mt-4 grid gap-4">{sources.length ? sources.map((source) => <article key={source.id} className="border border-ink/15 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-serif text-lg">{source.name}</h3><p className="mt-1 break-all text-xs text-ink/60">{source.base_url}</p></div><SourceBadge sourceType={source.source_type} /></div><p className="mt-2 text-xs">Authority {source.authority_level}/5 · {source.is_active ? "Active source" : "Inactive source"} · automatic ingestion {source.allow_automatic_ingestion ? "enabled" : "off"}</p>
        {!source.terms_reviewed_at || !source.is_active ? <form className="mt-3 border-t border-ink/10 pt-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(() => post({ action: "approve_domain", sourceId: source.id, confirmTermsReviewed: data.get("confirm") === "on", notes: data.get("notes") }), source.is_active ? "Domain approval recorded." : "Terms reviewed and source reactivated."); }}><label className="flex gap-2 text-sm"><input required name="confirm" type="checkbox" />I reviewed the source terms, robots policy and permitted access.</label><input name="notes" aria-label="Access review notes" placeholder="Review notes (optional)" className="mt-2 min-h-10 w-full border border-ink/20 px-3 text-sm" /><button disabled={busy} className="mt-2 min-h-10 bg-ink px-4 text-sm text-white disabled:opacity-50">{source.is_active ? "Approve domain" : "Review and reactivate"}</button></form> : <p className="mt-3 text-xs text-moss">Terms reviewed {new Date(source.terms_reviewed_at).toLocaleDateString()} by an administrator.</p>}
        {source.is_active ? <button type="button" disabled={busy} onClick={() => void run(() => post({ action: "disable_source", sourceId: source.id }), "Source disabled.")} className="mt-3 min-h-9 border border-vermilion/35 px-3 text-xs text-vermilion disabled:opacity-50">Disable source</button> : null}
        <UrlApproval source={source} busy={busy} run={run} setPreview={setPreview} />
        {source.approved_urls.length ? <ManualEntry source={source} busy={busy} run={run} /> : null}
      </article>) : <p className="border border-ink/10 bg-white p-4 text-sm text-ink/65">Loading sources or no sources are registered.</p>}</div>
      {preview ? <PreviewChunks preview={preview} busy={busy} run={run} /> : null}
    </section><StatusMessage error={error} message={message} />
  </div>;

  return <div className="mt-7"><StatusMessage error={error} message={message} /><ContentList content={content} loading={loading} review={view === "review"} busy={busy} run={run} onReviewed={load} /></div>;
}

function Field(props: { label: string; name: string; required?: boolean; type?: string; placeholder?: string; defaultValue?: string; maxLength?: number }) {
  return <label className="grid gap-1 text-sm">{props.label}<input name={props.name} type={props.type ?? "text"} required={props.required} placeholder={props.placeholder} defaultValue={props.defaultValue} maxLength={props.maxLength} className="min-h-11 border border-ink/20 bg-white px-3" /></label>;
}
function StatusMessage({ error, message }: { error: string; message: string }) {
  return <>{error ? <p role="alert" className="mt-4 border-l-2 border-vermilion bg-[#fbf1ed] p-3 text-sm">{error}</p> : null}{message ? <p role="status" className="mt-4 border-l-2 border-moss bg-white p-3 text-sm">{message}</p> : null}</>;
}
function UrlApproval({ source, busy, run, setPreview }: { source: Source; busy: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<void>; setPreview: (preview: Preview | null) => void }) {
  const [url, setUrl] = useState("");
  const [approvedUrl, setApprovedUrl] = useState("");
  return <div className="mt-4 border-t border-ink/10 pt-3"><label className="grid gap-1 text-sm">Selected page URL<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://approved-domain.jp/specific-page" className="min-h-10 border border-ink/20 px-3" /></label>
    <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy || !source.is_active || !source.terms_reviewed_at || !url} onClick={() => void run(async () => { const result = await post({ action: "approve_url", sourceId: source.id, url }); setApprovedUrl(String(result.url)); }, "Exact page URL approved.")} className="min-h-10 border border-ink/20 px-3 text-xs disabled:opacity-50">Approve exact URL</button>
      <button type="button" disabled={busy || !source.is_active || !source.terms_reviewed_at || !approvedUrl} onClick={() => void run(async () => { const response = await fetch("/api/admin/knowledge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "preview_url", sourceId: source.id, url: approvedUrl }) }); const result = await response.json() as Preview & { error?: string }; if (!response.ok) throw new Error(result.error ?? "Preview failed."); setPreview(result); }, "Source preview loaded.")} className="min-h-10 bg-ink px-3 text-xs text-white disabled:opacity-50">Preview approved page</button></div>
  </div>;
}
function PreviewChunks({ preview, busy, run }: { preview: Preview; busy: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [category, setCategory] = useState("local_custom");
  const [conflictKey, setConflictKey] = useState("");
  const [timeSensitive, setTimeSensitive] = useState(false);
  const [saved, setSaved] = useState<number[]>([]);
  return <section className="mt-6 border border-ink/20 bg-paper p-4"><h3 className="font-serif text-lg">Previewed content · {preview.source.name}</h3><p className="mt-1 break-all text-xs text-ink/60">{preview.fetched.url} · {new Date(preview.fetched.retrievedAt).toLocaleString()} · {preview.fetched.contentType}</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Content category<select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-10 border border-ink/20 bg-white px-3">{CULTURAL_CATEGORIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><label className="grid gap-1 text-sm">Conflict key (optional)<input value={conflictKey} onChange={(event) => setConflictKey(event.target.value)} className="min-h-10 border border-ink/20 bg-white px-3" /></label></div>
    <label className="mt-3 flex gap-2 text-sm"><input type="checkbox" checked={timeSensitive} onChange={(event) => setTimeSensitive(event.target.checked)} />High time sensitivity (hours, closures, events, capacity)</label>
    <div className="mt-4 grid gap-3">{preview.chunks.map((chunk) => <article key={chunk.contentHash} className="border border-ink/15 bg-white p-3"><p className="text-xs text-ink/55">Chunk {chunk.sequence + 1} · {chunk.kind}</p><h4 className="mt-1 font-semibold">{chunk.heading || "Source text"}</h4><p className="mt-2 text-sm leading-6">{chunk.text}</p><button type="button" disabled={busy || saved.includes(chunk.sequence)} onClick={() => void run(async () => { await post({ action: "submit_chunk", content: { sourceId: preview.source.id, title: chunk.heading || "Source information", summary: chunk.text.slice(0, 280), content: chunk.text, category, language: "en", sourceUrl: preview.selectedUrl, isTimeSensitive: timeSensitive, retrievedAt: preview.fetched.retrievedAt, metadata: { conflictKey: conflictKey.trim() || undefined, canonicalUrl: preview.fetched.url } } }); setSaved((current) => [...current, chunk.sequence]); }, "Chunk staged for administrator review.")} className="mt-3 min-h-9 border border-ink/20 px-3 text-xs disabled:opacity-50">{saved.includes(chunk.sequence) ? "Staged" : "Submit for review"}</button></article>)}</div>
    {!preview.chunks.length ? <p className="mt-4 text-sm text-ink/65">No meaningful headings, paragraphs or lists were extracted. Use manual entry or choose a better source page.</p> : null}
  </section>;
}
function ContentList({ content, loading = false, review = false, busy = false, run, onReviewed }: { content: Content[]; loading?: boolean; review?: boolean; busy?: boolean; run?: (action: () => Promise<unknown>, success: string) => Promise<void>; onReviewed?: () => Promise<void> }) {
  if (!content.length) return <p className="mt-5 border border-ink/10 bg-white p-5 text-sm text-ink/65">{loading ? "Loading cultural knowledge records…" : review ? "No cultural content is awaiting review." : "No cultural knowledge records are available."}</p>;
  return <div className="mt-5 grid gap-4">{content.map((item) => <article key={item.id} className="border border-ink/15 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-serif text-xl">{item.title}</h3><p className="mt-1 text-xs text-ink/60">{item.category?.replaceAll("_", " ")} · authority {item.authority_level}/5</p></div><div className="flex flex-wrap gap-2"><SourceBadge sourceType={item.source_type} sourceName={item.source_name} /><VerificationBadge status={item.verification_status} /></div></div><p className="mt-3 text-sm leading-6 text-ink/75">{item.summary || item.content.slice(0, 420)}</p>{item.source_url.startsWith("michi://") ? <p className="mt-3 text-xs text-ink/60">Supplied by the verified host within MICHI.</p> : <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-xs text-vermilion underline">{item.source_name} · source page</a>}<p className="mt-2 text-xs text-ink/55">Last verified: {item.last_verified_at ? new Date(item.last_verified_at).toLocaleString() : "not verified"} · {item.is_time_sensitive ? "time-sensitive" : "standard freshness"} · {item.is_active ? "active" : "inactive"}</p>
    {item.hasConflict ? <p role="status" className="mt-3 border-l-2 border-vermilion bg-[#fbf1ed] px-3 py-2 text-xs">Equal-authority records share this topic. Review the source wording before approving or disabling either record.</p> : null}
    <StaleWarning record={{ stale: isCulturalRecordStale({ category: item.category as never, isTimeSensitive: item.is_time_sensitive, lastVerifiedAt: item.last_verified_at, nextVerificationAt: item.next_verification_at }), lastVerifiedAt: item.last_verified_at, limitations: [] }} />
    {review && run ? <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-ink/10 pt-4"><label className="grid gap-1 text-xs">Set verification<select id={"verification-" + item.id} defaultValue={item.source_type === "host" ? "community_verified" : "official_verified"} className="min-h-10 border border-ink/20 bg-white px-2"><option value="official_verified">Officially verified</option>{item.source_type === "host" ? <option value="community_verified">Community verified</option> : null}</select></label><button disabled={busy || item.source_type === "editorial" || item.authority_level < 3} onClick={() => void run(async () => { const verificationStatus = (document.getElementById("verification-" + item.id) as HTMLSelectElement | null)?.value; await post({ action: "review_content", content: { id: item.id, decision: "approve", verificationStatus } }); await onReviewed?.(); }, "Knowledge record reverified and approved.")} className="min-h-10 bg-ink px-4 text-xs text-white disabled:opacity-50">Approve / reverify</button><button disabled={busy} onClick={() => void run(async () => { await post({ action: "review_content", content: { id: item.id, decision: "reject" } }); await onReviewed?.(); }, "Knowledge record rejected.")} className="min-h-10 border border-vermilion/40 px-4 text-xs text-vermilion disabled:opacity-50">Reject</button><button disabled={busy} onClick={() => void run(async () => { await post({ action: "review_content", content: { id: item.id, decision: "disable" } }); await onReviewed?.(); }, "Knowledge record disabled.")} className="min-h-10 border border-ink/20 px-4 text-xs disabled:opacity-50">Disable</button></div> : null}
  </article>)}</div>;
}

function ManualEntry({ source, busy, run }: { source: Source; busy: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  return <details className="mt-3 border-t border-ink/10 pt-3"><summary className="cursor-pointer text-sm font-semibold">Enter verified content manually</summary><form className="mt-3 grid gap-3" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await post({ action: "submit_chunk", content: { sourceId: source.id, title: data.get("title"), summary: data.get("summary"), content: data.get("content"), category: data.get("category"), language: data.get("language"), sourceUrl: data.get("sourceUrl"), isTimeSensitive: data.get("sensitive") === "on", metadata: { conflictKey: data.get("conflictKey") || undefined, manualEntry: true } } }); form.reset(); }, "Manual content staged for review."); }}>
    <Field label="Title" name="title" required maxLength={300} /><Field label="Summary" name="summary" maxLength={1000} />
    <label className="grid gap-1 text-sm">Verified source page<select name="sourceUrl" required className="min-h-10 border border-ink/20 bg-white px-3">{source.approved_urls.map((url) => <option key={url} value={url}>{url}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm">Category<select name="category" className="min-h-10 border border-ink/20 bg-white px-3">{CULTURAL_CATEGORIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><Field label="Language" name="language" defaultValue={source.language || "en"} /></div>
    <Field label="Conflict key (optional)" name="conflictKey" />
    <label className="grid gap-1 text-sm">Evidence text<textarea name="content" minLength={20} maxLength={12000} required rows={5} className="border border-ink/20 bg-white p-3" /></label>
    <label className="flex gap-2 text-sm"><input name="sensitive" type="checkbox" />Time sensitive</label>
    <button disabled={busy || !source.is_active || !source.terms_reviewed_at} className="min-h-10 justify-self-start bg-ink px-4 text-xs text-white disabled:opacity-50">Submit for review</button>
  </form></details>;
}
