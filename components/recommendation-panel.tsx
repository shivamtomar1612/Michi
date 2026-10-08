"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressiveAuthDialog } from "@/components/progressive-auth-dialog";
import { Input } from "@/components/ui/input";
import type { RecommendationResult } from "@/features/recommendations/types";
import type { ExternalDiscoveryMatch } from "@/features/recommendations/external";
import type { RecommendationPreferencesInput } from "@/features/recommendations/schemas";

type Decision = "accepted" | "rejected";
type ResultPayload = { mode: "guest" | "authenticated"; logId: string | null; recommendations: RecommendationResult[]; externalRecommendations: ExternalDiscoveryMatch[]; michiInventoryUnavailable: boolean; externalInventoryUnavailable: boolean };

function ExternalMatchCard({ match }: { match: ExternalDiscoveryMatch }) {
  return <article className="border border-ink/15 bg-white p-5 sm:p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">{match.destinationName} · {match.region} · Official source listing</p>
    <h4 className="mt-2 font-serif text-2xl">{match.title}</h4>
    <p className="mt-3 text-sm leading-6 text-ink/70">{match.shortDescription}</p>
    <p className="mt-4 text-sm font-semibold">{match.interestCompatibility}% interest compatibility</p>
    <p className="mt-1 text-xs text-ink/60">Based on {match.matchedInterests.join(", ")} overlap. This percentage is not a verification, availability, or crowd score.</p>
    <div className="mt-4 flex flex-wrap gap-2"><Badge>Verified external listing</Badge><Badge>Availability not integrated</Badge><Badge>Destination Health unavailable</Badge></div>
    <details className="mt-5 border-y border-ink/10 py-3"><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">Why this discovery match?</summary>
      <div className="pb-3 pt-2 text-sm leading-6 text-ink/70"><p>Source: <a className="editorial-link text-vermilion" href={match.sourceUrl} target="_blank" rel="noreferrer">{match.sourceName}</a> · last checked {formatJapanDate(match.lastVerifiedAt) ?? "unknown"}</p>
        <p className="mt-2">Recommendation confidence: limited because capacity and current destination conditions are not integrated.</p>
        <ul className="mt-2 list-disc pl-5">{match.missingInformation.map((missing) => <li key={missing}>{missing}</li>)}</ul>
      </div>
    </details>
    <a className="mt-5 inline-flex min-h-11 items-center bg-ink px-4 text-sm font-semibold text-white" href={match.externalBookingUrl ?? match.officialUrl} target="_blank" rel="noreferrer">View official {match.externalBookingUrl ? "booking information" : "experience information"}<span className="sr-only"> (opens in a new tab)</span></a>
  </article>;
}

function formatJapanDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(date);
}

function splitTags(value: FormDataEntryValue | null): string[] {
  return typeof value === "string" ? [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))] : [];
}

function RecommendationCard({
  recommendation,
  decision,
  onDecision,
  onRequireAuth,
  guest,
}: {
  recommendation: RecommendationResult;
  decision: Decision | null;
  onDecision: (id: string, value: Decision) => Promise<void>;
  onRequireAuth: () => void;
  guest: boolean;
}) {
  const [saving, setSaving] = useState<Decision | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState(recommendation.slots.find((slot) => slot.status === "open" && slot.bookedCount < slot.capacity)?.id ?? "");
  const [bookingPending, setBookingPending] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const money = new Intl.NumberFormat("en", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(recommendation.priceJpy);

  async function choose(value: Decision) {
    setSaving(value);
    setError(null);
    try {
      await onDecision(recommendation.id, value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your choice could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  async function requestBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBookingPending(true);
    setBookingMessage(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slotId: String(form.get("slotId")), guests: Number(form.get("guests")), acknowledged: form.get("acknowledged") === "on", notes: "" }),
      });
      const result = await response.json() as { error?: string; status?: string };
      if (response.status === 401) { onRequireAuth(); return; }
      if (!response.ok) throw new Error(result.error ?? "This booking request could not be completed.");
      setBookingMessage("Request sent. Capacity is reserved while the host reviews it; confirmation is not yet complete.");
    } catch (cause) {
      setBookingMessage(cause instanceof Error ? cause.message : "This booking request could not be completed.");
    } finally { setBookingPending(false); }
  }

  const availableSlots = recommendation.slots.filter((slot) => slot.status === "open" && slot.bookedCount < slot.capacity);

  return <article className="border border-ink/15 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">{recommendation.destinationName} · {recommendation.region}</p><h3 className="mt-2 font-serif text-2xl">{recommendation.title}</h3></div>
      <div className="text-right"><p className="font-serif text-3xl tabular-nums">{Math.round(recommendation.score)}%</p><p className="text-[10px] uppercase tracking-[0.12em] text-ink/55">preference fit</p></div>
    </div>
    <p className="mt-3 text-sm leading-6 text-ink/70">{recommendation.shortDescription}</p>
    <div className="mt-4 flex flex-wrap gap-2"><Badge>{money} per person</Badge><Badge>{recommendation.durationMinutes} min</Badge><Badge>Host provided</Badge><Badge>{recommendation.destinationHealth.status} · {recommendation.destinationHealth.simulationStatus === "live" ? "Live signals" : recommendation.destinationHealth.simulationStatus === "simulated" ? "Simulated signals" : recommendation.destinationHealth.simulationStatus === "snapshot" ? "Verified snapshot" : "Health unavailable"}</Badge><Badge>{recommendation.evidenceCompleteness}% scoring evidence</Badge></div>

    <details className="mt-5 border-y border-ink/10 py-3">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">Why this recommendation?</summary>
      <div className="pb-3 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55">Why MICHI recommends this</p>
        {recommendation.reasons.length ? <ul className="mt-3 space-y-2">{recommendation.reasons.map((reason) => <li key={reason} className="flex gap-2 text-sm leading-5"><Check className="mt-0.5 size-4 shrink-0 text-moss" aria-hidden="true" /><span>{reason}</span></li>)}</ul> : <p className="mt-2 text-sm text-ink/65">The factor scores are shown below; no additional preference match was found.</p>}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink/10 pt-3 text-xs sm:grid-cols-3">
          {Object.entries(recommendation.componentScores).map(([name, score]) => <div key={name}><dt className="text-ink/55">{name.replace(/([A-Z])/g, " $1")}</dt><dd className="mt-0.5 font-semibold tabular-nums">{score === null ? "Unknown" : `${score}/100`}</dd></div>)}
        </dl>
        {recommendation.tradeoffs.length ? <div className="mt-4 border-t border-ink/10 pt-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55">Tradeoffs</p><ul className="mt-2 space-y-2">{recommendation.tradeoffs.map((tradeoff) => <li key={tradeoff} className="flex gap-2 text-sm leading-5"><CircleAlert className="mt-0.5 size-4 shrink-0 text-vermilion" aria-hidden="true" /><span>{tradeoff}</span></li>)}</ul></div> : null}
        <p className="mt-4 border-t border-ink/10 pt-3 text-xs leading-5 text-ink/60">Destination information: {recommendation.sourceMetadata.destination.sourceName} · verified {formatJapanDate(recommendation.sourceMetadata.destination.verifiedAt) ?? "date unavailable"} · <a href={recommendation.sourceMetadata.destination.sourceUrl} target="_blank" rel="noreferrer" className="editorial-link text-vermilion">Open source<span className="sr-only"> (opens in a new tab)</span></a></p>
        {recommendation.destinationHealth.lastUpdated ? <p className="mt-2 text-xs text-ink/55">Oldest health signal used: {formatJapanDate(recommendation.destinationHealth.lastUpdated)} (Japan time)</p> : null}
        {recommendation.healthProvenance.length ? <ul className="mt-2 space-y-1 text-xs text-ink/55">{recommendation.healthProvenance.map((source) => <li key={`${source.component}:${source.sourceUrl}`}>{source.component}: <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">{source.sourceName}</a> · observed {formatJapanDate(source.observedAt)} · verified {formatJapanDate(source.verifiedAt)}</li>)}</ul> : null}
      </div>
    </details>

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" disabled={saving !== null} aria-pressed={decision === "accepted"} onClick={() => void choose("accepted")} className="min-h-11 border border-moss bg-moss px-4 text-sm font-semibold text-white hover:bg-moss/90 disabled:opacity-60">{saving === "accepted" ? "Saving…" : decision === "accepted" ? "Accepted" : "Save this idea"}</button>
      <button type="button" disabled={saving !== null} aria-pressed={decision === "rejected"} onClick={() => void choose("rejected")} className="min-h-11 border border-ink/20 px-4 text-sm font-semibold text-ink/75 hover:border-ink/50 disabled:opacity-60">{saving === "rejected" ? "Saving…" : decision === "rejected" ? "Not for me" : "Not for me"}</button>
      {decision ? <span className="text-xs text-ink/55" role="status">{guest ? "Choice kept for this page only." : "Your choice is saved. You can change it."}</span> : null}
    </div>
    {error ? <p role="alert" className="mt-3 text-sm text-vermilion">{error}</p> : null}
    <p className="mt-4 text-xs leading-5 text-ink/55">Host-led benefit is a proxy based on this MICHI host listing; MICHI does not estimate host earnings.</p>
    <details className="mt-5 border-t border-ink/10 pt-3"><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">Read host rules and booking terms</summary>
      <div className="space-y-2 py-2 text-sm leading-6 text-ink/70"><p><strong>Participation:</strong> {recommendation.participationRules}</p><p><strong>Photography:</strong> {recommendation.photographyPolicy.replaceAll("_", " ")}</p><p><strong>Cancellation:</strong> {recommendation.cancellationRules}</p></div>
    </details>
    {availableSlots.length ? <form onSubmit={(event) => void requestBooking(event)} className="mt-5 grid gap-3 border-t border-ink/10 pt-4">
      <p className="text-sm font-semibold">Request a MICHI booking</p>
      <label className="grid gap-1 text-xs font-semibold">Available host slot<select name="slotId" value={bookingSlotId} onChange={(event) => setBookingSlotId(event.target.value)} required className="min-h-11 border border-ink/20 bg-white px-3 text-sm">{availableSlots.map((slot) => <option key={slot.id} value={slot.id}>{formatJapanDate(slot.startsAt)} · {slot.capacity - slot.bookedCount} places remaining</option>)}</select></label>
      <label className="grid max-w-xs gap-1 text-xs font-semibold">Guests<input name="guests" type="number" min={1} max={Math.min(100, availableSlots.find((slot) => slot.id === bookingSlotId)?.capacity ?? 1)} defaultValue={1} required className="min-h-11 border border-ink/20 px-3 text-sm" /></label>
      <label className="flex min-h-11 items-start gap-2 text-xs leading-5"><input name="acknowledged" type="checkbox" required className="mt-1 size-4 accent-vermilion" />I have read and agree to the participation, photography, and cancellation terms above.</label>
      <button type="submit" disabled={bookingPending} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{bookingPending ? "Sending request…" : "Request booking"}</button>
      {bookingMessage ? <p role="status" className="text-sm text-ink/70">{bookingMessage}</p> : null}
    </form> : null}
  </article>;
}

export function RecommendationPanel() {
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crowdTolerance, setCrowdTolerance] = useState(50);
  const [authOpen, setAuthOpen] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPayload(null);
    setDecisions({});
    const form = new FormData(event.currentTarget);
    const accessibility = Object.fromEntries(["step_free", "wheelchair_access", "quiet_space", "hearing_support", "visual_support"]
      .filter((key) => form.get(key) === "on").map((key) => [key, true]));
    const preferences: RecommendationPreferencesInput = {
      interests: splitTags(form.get("interests")),
      budgetJpy: form.get("budgetJpy") ? Number(form.get("budgetJpy")) : null,
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? ""),
      regions: splitTags(form.get("regions")),
      pace: String(form.get("pace")) as RecommendationPreferencesInput["pace"],
      accessibility,
      dietaryPreferences: splitTags(form.get("dietaryPreferences")),
      languages: splitTags(form.get("languages")),
      culturalInterests: splitTags(form.get("culturalInterests")),
      crowdTolerance: Number(form.get("crowdTolerance")),
    };

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const result = await response.json() as ResultPayload | { error: string };
      if (!response.ok) throw new Error("error" in result ? result.error : "Recommendations could not be loaded.");
      setPayload(result as ResultPayload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Recommendations could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDecision(experienceId: string, decision: Decision) {
    if (!payload) throw new Error("Run recommendations again before saving a choice.");
    if (!payload.logId) {
      setDecisions((current) => ({ ...current, [experienceId]: decision }));
      return;
    }
    const response = await fetch("/api/recommendations/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recommendationLogId: payload.logId, experienceId, decision }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(result?.error ?? "Your choice could not be saved.");
    }
    setDecisions((current) => ({ ...current, [experienceId]: decision }));
  }

  return <section id="recommendations" aria-labelledby="recommendations-title" className="mt-8 border-y border-ink/15 py-8 sm:py-10">
    <div className="max-w-3xl"><p className="eyebrow inline-flex items-center gap-2"><Sparkles className="size-3.5" aria-hidden="true" />Responsible discovery</p><h2 id="recommendations-title" className="mt-3 font-serif text-3xl">A good match should respect the place, too.</h2><p className="mt-3 text-sm leading-6 text-ink/65">Find sourced local experiences by interest. External listings show interest compatibility only; their capacity and destination conditions remain unknown until verified evidence is available.</p></div>

    <form onSubmit={(event) => void submit(event)} className="mt-7 grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium">Interests <span className="font-normal text-ink/55">Comma separated</span><Input name="interests" required placeholder="craft, food, gardens" /></label>
        <label className="grid gap-1.5 text-xs font-medium">Preferred regions <span className="font-normal text-ink/55">Optional; comma separated</span><Input name="regions" placeholder="Hokuriku, Kansai" /></label>
        <label className="grid gap-1.5 text-xs font-medium">Budget per person (JPY) <span className="font-normal text-ink/55">Optional</span><Input name="budgetJpy" type="number" min={0} max={2000000} step={1000} placeholder="No limit" /></label>
        <label className="grid gap-1.5 text-xs font-medium">Travel pace<select name="pace" defaultValue="balanced" className="min-h-12 border border-ink/20 bg-white px-4 text-sm"><option value="relaxed">Relaxed · shorter or unhurried experiences</option><option value="balanced">Balanced</option><option value="active">Active · longer experiences are fine</option></select></label>
        <label className="grid gap-1.5 text-xs font-medium">From date<Input name="startDate" type="date" required /></label>
        <label className="grid gap-1.5 text-xs font-medium">To date<Input name="endDate" type="date" required /></label>
        <label className="grid gap-1.5 text-xs font-medium">Dietary preferences <span className="font-normal text-ink/55">Optional; comma separated</span><Input name="dietaryPreferences" placeholder="vegetarian, halal" /></label>
        <label className="grid gap-1.5 text-xs font-medium">Languages <span className="font-normal text-ink/55">Optional; comma separated</span><Input name="languages" placeholder="English, Japanese" /></label>
        <label className="grid gap-1.5 text-xs font-medium md:col-span-2">Cultural interests <span className="font-normal text-ink/55">Optional; comma separated</span><Input name="culturalInterests" placeholder="ceramics, tea culture, traditional textiles" /></label>
      </div>

      <fieldset className="border-t border-ink/10 pt-5"><legend className="text-xs font-semibold">Accessibility needs</legend><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
        ["step_free", "Step-free route"], ["wheelchair_access", "Wheelchair access"], ["quiet_space", "Quiet space"], ["hearing_support", "Hearing support"], ["visual_support", "Visual support"],
      ].map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name={key} className="size-4 accent-vermilion" />{label}</label>)}</div><p className="mt-2 text-xs text-ink/55">Listings without confirmed requested access are excluded from matches.</p></fieldset>

      <label className="grid gap-2 border-t border-ink/10 pt-5 text-xs font-semibold">Crowd tolerance <span className="flex items-center justify-between font-normal"><span>Prefer quieter places</span><output htmlFor="crowdTolerance">{crowdTolerance}/100</output><span>Comfortable with crowds</span></span><input id="crowdTolerance" name="crowdTolerance" type="range" min={0} max={100} value={crowdTolerance} onChange={(event) => setCrowdTolerance(Number(event.target.value))} className="w-full accent-vermilion" /><span className="sr-only">Crowd tolerance from 0 to 100</span></label>
      <div><button type="submit" disabled={loading} className="inline-flex min-h-12 items-center gap-2 bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:cursor-wait disabled:opacity-60">{loading ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Finding source-backed matches…</> : "Find responsible recommendations"}</button></div>
    </form>

    {error ? <p role="alert" className="mt-5 border-l-2 border-vermilion bg-paper-deep p-4 text-sm text-vermilion">{error}{error.toLowerCase().includes("sign in") ? <> <Link href="/auth/login" className="font-semibold underline underline-offset-2">Sign in</Link>.</> : null}</p> : null}
    {payload ? <div className="mt-9 space-y-10" aria-live="polite">
      {payload.mode === "guest" ? <p className="border-l-2 border-moss bg-moss/5 px-4 py-3 text-sm text-ink/75">Exploring as a guest. Your preferences are used for this search and are not saved to an account.</p> : null}
      <section aria-label="Available through MICHI"><h3 className="font-serif text-2xl">Available through MICHI</h3>{payload.recommendations.length ? <div className="mt-4 grid gap-5">{payload.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} decision={decisions[recommendation.id] ?? null} onDecision={saveDecision} onRequireAuth={() => setAuthOpen(true)} guest={payload.mode === "guest"} />)}</div> : <p className="mt-3 text-sm leading-6 text-ink/65">{payload.michiInventoryUnavailable ? "MICHI host inventory could not be checked." : "No verified MICHI host experiences with complete evidence match this search."}</p>}</section>
      <section aria-label="Explore verified local experiences"><h3 className="font-serif text-2xl">Explore verified local experiences</h3><p className="mt-2 text-sm text-ink/60">External operators are not MICHI partners. Check dates, access, price, and booking terms with the operator.</p>{payload.externalRecommendations.length ? <div className="mt-4 grid gap-5">{payload.externalRecommendations.map((match) => <ExternalMatchCard key={match.id} match={match} />)}</div> : <p className="mt-3 text-sm text-ink/65">{payload.externalInventoryUnavailable ? "External listings could not be checked." : "No current sourced external listings match these interests and constraints."}</p>}</section>
    </div> : null}
    <ProgressiveAuthDialog open={authOpen} onOpenChange={setAuthOpen} nextPath="/discover" title="Sign in to request this booking." description="You can review the real host slots first. A traveler account is required to send a booking request." />
  </section>;
}
