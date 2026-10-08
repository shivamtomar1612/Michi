"use client";

import { useState } from "react";
import { CULTURAL_CATEGORIES, type CulturalConfidence } from "@/features/cultural-knowledge/types";
import { ConfidenceBadge, SourceBadge, StaleWarning, VerificationBadge } from "@/components/cultural-knowledge-badges";

type Evidence = { id: string; title: string; content: string; summary: string | null; sourceName: string; sourceUrl: string; sourceType: string; verificationStatus: string; authorityLevel: number; lastVerifiedAt: string | null; stale: boolean; confidence: CulturalConfidence; limitations: string[]; matchedTerms: string[] };
type Result = { evidence: Evidence[]; confidence: CulturalConfidence; error?: string };

export function CulturalEvidencePanel({ destinationId, placeName }: { destinationId?: string; placeName: string }) {
  const [query, setQuery] = useState("Visiting " + placeName + " respectfully");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setResult(null);
    try {
      const response = await fetch("/api/cultural/evidence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, destinationId, category: category || undefined, language: "en", limit: 5 }) });
      const data = await response.json() as Result;
      if (!response.ok) throw new Error(data.error ?? "Cultural evidence is unavailable.");
      setResult(data);
    } catch (error) { setResult({ evidence: [], confidence: "low", error: error instanceof Error ? error.message : "Cultural evidence is unavailable." }); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="cultural-evidence-title" className="mt-10 border-t border-ink/15 pt-7">
    <p className="eyebrow">Cultural intelligence · cited evidence</p><h2 id="cultural-evidence-title" className="mt-2 font-serif text-2xl">Prepare with local context.</h2>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70">MICHI retrieves approved source material and shows the original page. It does not generate cultural rules or fill gaps with guesses.</p>
    <form onSubmit={search} className="mt-4 grid gap-3 sm:grid-cols-[1fr_13rem_auto]">
      <label className="grid gap-1 text-sm">Question<input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={500} minLength={2} required className="min-h-11 border border-ink/20 bg-white px-3" /></label>
      <label className="grid gap-1 text-sm">Topic<select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 border border-ink/20 bg-white px-3"><option value="">Any topic</option>{CULTURAL_CATEGORIES.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
      <button disabled={busy} className="mt-auto min-h-11 bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Searching…" : "Find guidance"}</button>
    </form>
    {result ? <div aria-live="polite" className="mt-5">{result.error ? <p role="alert" className="border-l-2 border-vermilion bg-[#fbf1ed] p-3 text-sm">{result.error}</p> : result.evidence.length ? <><div className="flex flex-wrap items-center gap-2"><ConfidenceBadge confidence={result.confidence} /><span className="text-xs text-ink/55">Confidence describes evidence quality and freshness.</span></div><div className="mt-3 grid gap-3">{result.evidence.map((item) => <article key={item.id} className="border border-ink/15 bg-white p-4"><div className="flex flex-wrap gap-2"><SourceBadge sourceType={item.sourceType} sourceName={item.sourceName} /><VerificationBadge status={item.verificationStatus} /><ConfidenceBadge confidence={item.confidence} /></div><h3 className="mt-3 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-ink/75">{item.summary || item.content}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-xs text-vermilion underline">{item.sourceName} · authority {item.authorityLevel}/5 · view source<span className="sr-only"> (opens in a new tab)</span></a><p className="mt-2 text-xs text-ink/55">Last verified: {item.lastVerifiedAt ? new Date(item.lastVerifiedAt).toLocaleDateString() : "not recorded"}</p><StaleWarning record={{ stale: item.stale, lastVerifiedAt: item.lastVerifiedAt, limitations: item.limitations }} />{item.limitations.length ? <ul className="mt-2 list-disc pl-5 text-xs text-ink/65">{item.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul> : null}</article>)}</div></> : <p className="border border-ink/10 bg-white p-4 text-sm text-ink/65">No approved evidence matched this question. MICHI will not guess; check the official operator information above.</p>}</div> : null}
  </section>;
}
