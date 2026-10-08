"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, ExternalLink, LoaderCircle, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { PublicDestination } from "@/server/data/catalogue";
import type { RecommendationPreferencesInput } from "@/features/recommendations/schemas";
import type { RecommendationResult } from "@/features/recommendations/types";
import type { ExternalDiscoveryMatch } from "@/features/recommendations/external";
import { saveGeneratedItinerary, recordItineraryDecision } from "@/features/itineraries/actions";
import { ProgressiveAuthDialog } from "@/components/progressive-auth-dialog";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

const steps = ["Dates", "Starting place", "Interests", "Budget", "Travel style", "Access & food", "Crowds", "Review"] as const;
const interestOptions = ["food", "craft", "history", "architecture", "nature", "tea", "traditional arts", "local lifestyle"];
const dietaryOptions = ["vegetarian", "vegan", "halal", "gluten-free", "dairy-free", "allergy-aware"];
type CandidateType = "michi_verified" | "external_verified";
type Origin = "original_preference" | "michi_alternative";
type Candidate = {
  id: string; destinationId: string; title: string; destination: string; region: string; score: number; reasons: string[]; tradeoffs?: string[];
  type: CandidateType; origin: Origin; explanation: string; recommendation: RecommendationResult | ExternalDiscoveryMatch;
};
type Selection = { selected: boolean; slotId: string | null; compare: boolean };
type BuilderResult = {
  startDestination: { id: string; name: string; region: string };
  mode: "guest" | "authenticated";
  recommendationLogId: string | null;
  organizer: "gemini_candidate_order" | "deterministic_order";
  candidates: Candidate[];
  inventoryWarnings: { michiUnavailable: boolean; externalUnavailable: boolean };
  alternativeLimitations: string;
};

function asDateText(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

function firstAvailableSlot(candidate: Candidate): string | null {
  if (candidate.type !== "michi_verified") return null;
  const item = candidate.recommendation as RecommendationResult;
  return item.slots.find((slot) => slot.status === "open" && slot.bookedCount < slot.capacity)?.id ?? null;
}

const GUEST_DRAFT_KEY = "michi.guest-itinerary.v1";
const GUEST_DRAFT_TTL = 24 * 60 * 60 * 1000;

export function ItineraryBuilder({ destinations, isAuthenticated, restoreGuest = false }: { destinations: PublicDestination[]; isAuthenticated: boolean; restoreGuest?: boolean }) {
  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDestinationId, setStartDestinationId] = useState(destinations[0]?.id ?? "");
  const [interests, setInterests] = useState<string[]>(["craft", "food"]);
  const [budget, setBudget] = useState("");
  const [travelStyle, setTravelStyle] = useState<"relaxed" | "balanced" | "packed">("balanced");
  const [accessibility, setAccessibility] = useState({ step_free: false, wheelchair_access: false });
  const [dietary, setDietary] = useState<string[]>([]);
  const [crowdTolerance, setCrowdTolerance] = useState(50);
  const [planName, setPlanName] = useState("A more considered Japan journey");
  const [result, setResult] = useState<BuilderResult | null>(null);
  const [selection, setSelection] = useState<Record<string, Selection>>({});
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const destination = destinations.find((item) => item.id === startDestinationId);
  const currentDate = new Date().toISOString().slice(0, 10);
  const preferences: RecommendationPreferencesInput | null = useMemo(() => startDate && endDate && interests.length ? ({
    interests, budgetJpy: budget ? Number(budget) : null, startDate, endDate, regions: [],
    pace: travelStyle === "packed" ? "active" : travelStyle,
    accessibility, dietaryPreferences: dietary, languages: [], culturalInterests: interests, crowdTolerance,
  }) : null, [accessibility, budget, crowdTolerance, dietary, endDate, interests, startDate, travelStyle]);

  const originals = result?.candidates.filter((candidate) => candidate.origin === "original_preference") ?? [];
  const alternatives = result?.candidates.filter((candidate) => candidate.origin === "michi_alternative") ?? [];
  const selectedCount = Object.values(selection).filter((item) => item.selected).length;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GUEST_DRAFT_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as { expiresAt?: number };
        if (!stored.expiresAt || stored.expiresAt <= Date.now()) localStorage.removeItem(GUEST_DRAFT_KEY);
      }
    } catch { localStorage.removeItem(GUEST_DRAFT_KEY); }
  }, []);

  useEffect(() => {
    if (!restoreGuest || !isAuthenticated) return;
    try {
      const raw = localStorage.getItem(GUEST_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { version?: number; expiresAt?: number; startDestinationId?: string; preferences?: RecommendationPreferencesInput; travelStyle?: "relaxed" | "balanced" | "packed"; name?: string; selected?: Array<{ candidateId: string; candidateType: CandidateType; slotId: string | null; suggestionOrigin: Origin }> };
      if (draft.version !== 1 || !draft.expiresAt || draft.expiresAt <= Date.now() || !draft.startDestinationId || !draft.preferences || !draft.travelStyle || !Array.isArray(draft.selected)) {
        localStorage.removeItem(GUEST_DRAFT_KEY);
        setMessage("The guest draft expired or could not be restored. Your choices were not saved.");
        return;
      }
      const start = destinations.find((item) => item.id === draft.startDestinationId);
      if (!start) { setMessage("The saved starting destination is no longer available. Review your choices and generate a fresh preview."); return; }
      const nextPreferences = draft.preferences;
      setStartDestinationId(draft.startDestinationId); setStartDate(nextPreferences.startDate); setEndDate(nextPreferences.endDate);
      setInterests(nextPreferences.interests); setBudget(nextPreferences.budgetJpy === null ? "" : String(nextPreferences.budgetJpy));
      setTravelStyle(draft.travelStyle); setAccessibility({ step_free: Boolean(nextPreferences.accessibility.step_free), wheelchair_access: Boolean(nextPreferences.accessibility.wheelchair_access) });
      setDietary(nextPreferences.dietaryPreferences); setCrowdTolerance(nextPreferences.crowdTolerance); setPlanName(draft.name ?? "A more considered Japan journey");
      setBusy(true);
      void fetch("/api/itineraries/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recommendationLogId: null, startDestinationId: draft.startDestinationId, preferences: nextPreferences, travelStyle: draft.travelStyle }) })
        .then(async (response) => {
          const payload = await response.json() as BuilderResult & { error?: string };
          if (!response.ok) throw new Error(payload.error ?? "The guest itinerary could not be restored.");
          setResult(payload);
          const savedSelection = new Map(draft.selected!.map((item) => [item.candidateId, item]));
          setSelection(Object.fromEntries(payload.candidates.map((candidate) => {
            const saved = savedSelection.get(candidate.id);
            return [candidate.id, { selected: Boolean(saved && saved.candidateType === candidate.type), slotId: saved?.slotId ?? firstAvailableSlot(candidate), compare: false }];
          })));
          setLocalOrder(draft.selected!.map((item) => item.candidateId).filter((id) => payload.candidates.some((candidate) => candidate.id === id)));
          setMessage("Guest itinerary restored. Review the options, then choose Save this journey to add it to your account.");
        })
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The guest itinerary could not be restored."))
        .finally(() => setBusy(false));
    } catch {
      localStorage.removeItem(GUEST_DRAFT_KEY);
      setError("The guest itinerary could not be restored. Your private information was not sent or saved.");
    }
  }, [destinations, isAuthenticated, restoreGuest]);

  function toggleTag(list: string[], setter: (value: string[]) => void, value: string) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function validateStep() {
    if (step === 0 && (!startDate || !endDate || endDate < startDate || startDate < currentDate)) return "Choose a future date range with an end after the start.";
    if (step === 1 && !startDestinationId) return "Choose a verified starting destination.";
    if (step === 2 && !interests.length) return "Choose at least one interest.";
    return null;
  }

  function moveNext() {
    const issue = validateStep();
    if (issue) { setError(issue); return; }
    setError(null);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function moveBack() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function buildPlan() {
    const issue = validateStep();
    if (issue || !preferences || !destination) { setError(issue ?? "Complete the required choices first."); return; }
    setBusy(true); setError(null); setMessage(null); setResult(null); setSelection({});
    try {
      const recommendationResponse = await fetch("/api/recommendations", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(preferences),
      });
      const recommendationPayload = await recommendationResponse.json() as { logId?: string | null; error?: string };
      if (!recommendationResponse.ok) throw new Error(recommendationPayload.error ?? "Recommendations could not be loaded.");
      const organizeResponse = await fetch("/api/itineraries/generate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ recommendationLogId: recommendationPayload.logId ?? null, startDestinationId, preferences, travelStyle }),
      });
      const organizePayload = await organizeResponse.json() as BuilderResult & { error?: string };
      if (!organizeResponse.ok) throw new Error(organizePayload.error ?? "The itinerary could not be organized.");
      setResult(organizePayload);
      const includedDestinations = [...new Set(organizePayload.candidates.map((candidate) => candidate.destinationId))];
      for (const destinationId of includedDestinations) {
        trackAnalyticsEvent({ eventName: "recommendation_generated", destinationId, recommendationCount: organizePayload.candidates.length });
        trackAnalyticsEvent({ eventName: "itinerary_generated", destinationId, experienceCount: organizePayload.candidates.length });
      }
      setSelection(Object.fromEntries(organizePayload.candidates.map((candidate) => [candidate.id, {
        selected: false, slotId: firstAvailableSlot(candidate), compare: false,
      }])));
      setLocalOrder([]);
      setMessage(organizePayload.candidates.length
        ? `Found ${organizePayload.candidates.length} eligible sourced option${organizePayload.candidates.length === 1 ? "" : "s"}.`
        : "No current recommendations match all of these preferences. Adjust your choices or browse verified listings.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The planner is temporarily unavailable.");
    } finally { setBusy(false); }
  }

  async function decision(candidate: Candidate, type: "accepted" | "rejected" | "compared" | "kept_original") {
    if (!result || !isAuthenticated || !result.recommendationLogId) return;
    const response = await recordItineraryDecision({
      recommendationLogId: result.recommendationLogId, candidateId: candidate.id, candidateType: candidate.type,
      decision: type, suggestionOrigin: candidate.origin,
    });
    if (!response.success) throw new Error(response.message);
  }

  async function choose(candidate: Candidate, selected: boolean) {
    if (candidate.origin === "michi_alternative") {
      trackAnalyticsEvent({ eventName: "alternative_considered", destinationId: candidate.destinationId });
    }
    const existing = selection[candidate.id] ?? { selected: false, slotId: firstAvailableSlot(candidate), compare: false };
    setBusy(true); setError(null);
    try {
      await decision(candidate, selected ? candidate.origin === "original_preference" ? "kept_original" : "accepted" : "rejected");
      setSelection((current) => ({ ...current, [candidate.id]: { ...existing, selected } }));
      setLocalOrder((current) => selected ? [...current.filter((id) => id !== candidate.id), candidate.id] : current.filter((id) => id !== candidate.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your choice could not be saved."); }
    finally { setBusy(false); }
  }

  async function compare(candidate: Candidate) {
    const existing = selection[candidate.id] ?? { selected: false, slotId: firstAvailableSlot(candidate), compare: false };
    setSelection((current) => ({ ...current, [candidate.id]: { ...existing, compare: !existing.compare } }));
    try { await decision(candidate, "compared"); } catch (cause) { setError(cause instanceof Error ? cause.message : "The comparison could not be recorded."); }
  }

  async function savePlan() {
    if (!result || !preferences || !startDestinationId) return;
    const chosenIds = [...localOrder, ...result.candidates.map((candidate) => candidate.id).filter((id) => !localOrder.includes(id))];
    const selected = chosenIds.flatMap((id) => {
      const candidate = result.candidates.find((item) => item.id === id);
      if (!candidate || !selection[id]?.selected) return [];
      return [{
      candidateId: candidate.id, candidateType: candidate.type,
      slotId: candidate.type === "michi_verified" ? selection[candidate.id]?.slotId ?? null : null,
      suggestionOrigin: candidate.origin,
      }];
    });
    if (!selected.length) { setError("Choose at least one experience or activity before saving."); return; }
    if (selected.some((item) => item.candidateType === "michi_verified" && !item.slotId)) { setError("Choose an available MICHI slot for every selected host experience."); return; }
    if (!isAuthenticated) {
      try {
        localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify({
          version: 1, expiresAt: Date.now() + GUEST_DRAFT_TTL, startDestinationId, preferences, travelStyle, name: planName,
          selected: selected.map((item) => ({ ...item })),
        }));
        setAuthOpen(true);
      } catch { setError("This browser could not keep your draft. Try again or create an account before leaving this page."); }
      return;
    }
    setBusy(true); setError(null);
    try {
      const saved = await saveGeneratedItinerary({ recommendationLogId: result.recommendationLogId, startDestinationId,
        preferences, travelStyle, name: planName, selected });
      if (!saved.success) throw new Error(saved.message);
      localStorage.removeItem(GUEST_DRAFT_KEY);
      if (saved.url) window.location.assign(saved.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The itinerary could not be saved."); }
    finally { setBusy(false); }
  }

  function candidateCard(candidate: Candidate) {
    const current = selection[candidate.id] ?? { selected: false, slotId: firstAvailableSlot(candidate), compare: false };
    const isMichi = candidate.type === "michi_verified";
    const officialUrl = candidate.type === "external_verified"
      ? (candidate.recommendation as ExternalDiscoveryMatch).externalBookingUrl ?? (candidate.recommendation as ExternalDiscoveryMatch).officialUrl
      : null;
    const currentHealth = isMichi ? (candidate.recommendation as RecommendationResult).destinationHealth : null;
    return <article key={`${candidate.type}:${candidate.id}`} className="border-y border-ink/15 py-5" aria-label={`${candidate.origin === "original_preference" ? "Original Preference" : "MICHI Alternative"}: ${candidate.title}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Badge>{candidate.origin === "original_preference" ? "Original Preference" : "MICHI Alternative"}</Badge><p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink/55">{candidate.destination} · {candidate.region}</p><h3 className="mt-1 font-serif text-2xl">{candidate.title}</h3></div>
        <p className="text-right text-sm font-semibold">{isMichi ? `${candidate.score}% match` : `${candidate.score}% interest compatibility`}<span className="mt-1 block text-xs font-normal text-ink/55">{isMichi ? "Deterministic match score" : "Not availability or certainty"}</span></p>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/70">{candidate.explanation}</p>
      {isMichi ? <p className="mt-2 text-sm leading-6 text-ink/65">{(candidate.recommendation as RecommendationResult).shortDescription}</p>
        : <p className="mt-2 text-sm leading-6 text-ink/65">{(candidate.recommendation as ExternalDiscoveryMatch).shortDescription || "No additional description was published in the verified source record."}</p>}
      {isMichi ? <div className="mt-3 flex flex-wrap gap-2"><Badge>MICHI verified host</Badge><Badge>{currentHealth?.status ?? "Destination Health unavailable"}</Badge><Badge>Capacity listed for dates</Badge></div>
        : <div className="mt-3 flex flex-wrap gap-2"><Badge>Verified external listing</Badge><Badge>Availability not integrated</Badge><Badge>Destination Health unavailable</Badge></div>}
      {isMichi && (candidate.recommendation as RecommendationResult).slots.length ? <label className="mt-4 grid max-w-md gap-1.5 text-xs font-medium">Available host time<select aria-label={`Time for ${candidate.title}`} className="min-h-11 border border-ink/20 bg-white px-3 text-sm" value={current.slotId ?? ""} onChange={(event) => setSelection((state) => ({ ...state, [candidate.id]: { ...current, slotId: event.target.value || null } }))}>
        {(candidate.recommendation as RecommendationResult).slots.filter((slot) => slot.status === "open" && slot.bookedCount < slot.capacity).map((slot) => <option key={slot.id} value={slot.id}>{asDateText(slot.startsAt)} · {new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(slot.startsAt))} JST · capacity listed when checked</option>)}
      </select></label> : null}
      {candidate.tradeoffs?.length ? <details className="mt-4"><summary className="min-h-10 cursor-pointer content-center text-sm font-semibold">Tradeoffs and unknowns</summary><ul className="list-disc pl-5 text-sm leading-6 text-ink/65">{candidate.tradeoffs.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
      {candidate.type === "external_verified" ? <p className="mt-3 text-xs text-ink/60">Official source: <a className="editorial-link text-vermilion" href={(candidate.recommendation as ExternalDiscoveryMatch).sourceUrl} target="_blank" rel="noreferrer">{(candidate.recommendation as ExternalDiscoveryMatch).sourceName}</a> · last checked {asDateText((candidate.recommendation as ExternalDiscoveryMatch).lastVerifiedAt)}</p> : null}
      {candidate.origin === "michi_alternative" ? <p className="mt-3 text-xs text-ink/55">This is outside your chosen starting destination. MICHI has not calculated the travel distance or claimed this is a lower-pressure alternative.</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void choose(candidate, !current.selected)} className={`min-h-11 px-4 text-sm font-semibold ${current.selected ? "border border-moss bg-[#e9ece5] text-ink" : "bg-ink text-white hover:bg-ink/90"}`}>
          {current.selected ? <><Check className="mr-2 inline size-4" />Added to plan</> : candidate.origin === "original_preference" ? "Keep Original" : "Accept Alternative"}
        </button>
        <button type="button" onClick={() => void compare(candidate)} className="min-h-11 border border-ink/20 px-4 text-sm font-semibold hover:border-vermilion">{current.compare ? "Compared" : "Compare"}</button>
        {officialUrl ? <a href={officialUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-vermilion underline underline-offset-4">View official information<ExternalLink className="size-4" /><span className="sr-only">(opens in a new tab)</span></a> : null}
      </div>
      {current.compare ? <div className="mt-4 border-l-2 border-moss bg-[#e9ece5] p-4" aria-label={`Comparison for ${candidate.title}`}>
        <h4 className="text-sm font-semibold">Compare with your original starting choice</h4>
        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2"><div><dt className="font-semibold text-ink/75">Starting destination</dt><dd className="mt-1">{result?.startDestination.name}</dd></div><div><dt className="font-semibold text-ink/75">Candidate destination</dt><dd className="mt-1">{candidate.destination}{candidate.destinationId === result?.startDestination.id ? " · same destination" : " · different destination"}</dd></div><div><dt className="font-semibold text-ink/75">Candidate fit measure</dt><dd className="mt-1">{isMichi ? `${candidate.score}% deterministic match` : `${candidate.score}% interest compatibility only`}</dd></div><div><dt className="font-semibold text-ink/75">Evidence status</dt><dd className="mt-1">{isMichi ? (currentHealth?.score === null ? "Current destination health unavailable" : currentHealth?.status ?? "Current destination health unavailable") : "Date availability and destination health are not integrated"}</dd></div></dl>
        <p className="mt-3 text-xs text-ink/55">MICHI does not calculate a score for a destination without an eligible database experience, and does not infer travel time or low visitor pressure.</p>
      </div> : null}
    </article>;
  }

  function moveSelected(id: string, direction: -1 | 1) {
    setLocalOrder((current) => {
      const ids = [...current];
      const index = ids.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= ids.length) return current;
      [ids[index], ids[target]] = [ids[target], ids[index]];
      return ids;
    });
  }

  return <div className="mt-8">
    <div className="border-y border-ink/15 py-4"><div className="flex items-center justify-between gap-3"><p className="eyebrow">Your itinerary · Step {step + 1} of {steps.length}</p><span className="text-xs text-ink/55">{steps[step]}</span></div><div className="mt-3 h-1 bg-ink/10"><div className="h-1 bg-vermilion transition-[width]" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></div>
    <div className="min-h-[22rem] py-7">
      {step === 0 ? <section aria-labelledby="plan-dates-title"><h2 id="plan-dates-title" className="font-serif text-2xl">When are you traveling?</h2><p className="mt-2 text-sm text-ink/60">Dates are used to check genuine MICHI-host slots.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-medium">Start date<Input type="date" min={currentDate} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="grid gap-1.5 text-xs font-medium">End date<Input type="date" min={startDate || currentDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div></section> : null}
      {step === 1 ? <section aria-labelledby="plan-place-title"><h2 id="plan-place-title" className="font-serif text-2xl">Where would you like to begin?</h2><p className="mt-2 text-sm text-ink/60">Choose a current, officially sourced destination. Eligible candidates elsewhere in Japan may appear as alternatives.</p><label className="mt-5 grid max-w-xl gap-1.5 text-xs font-medium">Starting destination<select className="min-h-12 border border-ink/20 bg-white px-3 text-sm" value={startDestinationId} onChange={(event) => setStartDestinationId(event.target.value)}><option value="">Select a destination</option>{destinations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.region}</option>)}</select></label>{!destinations.length ? <p role="status" className="mt-4 text-sm text-vermilion">No verified destinations are available to start from.</p> : null}</section> : null}
      {step === 2 ? <section aria-labelledby="plan-interests-title"><h2 id="plan-interests-title" className="font-serif text-2xl">What would you like to spend time with?</h2><div className="mt-5 grid gap-2 sm:grid-cols-2">{interestOptions.map((interest) => <label key={interest} className="flex min-h-12 items-center gap-3 border-b border-ink/10 px-2 text-sm capitalize"><input type="checkbox" checked={interests.includes(interest)} onChange={() => toggleTag(interests, setInterests, interest)} className="size-4 accent-[#a43c2b]" />{interest}</label>)}</div></section> : null}
      {step === 3 ? <section aria-labelledby="plan-budget-title"><h2 id="plan-budget-title" className="font-serif text-2xl">What budget should MICHI respect?</h2><p className="mt-2 text-sm text-ink/60">This is a per-experience ceiling in Japanese yen. Leave blank for no price ceiling.</p><label className="mt-5 grid max-w-sm gap-1.5 text-xs font-medium">Maximum per experience (JPY)<Input type="number" min="0" max="2000000" step="1000" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="No set limit" /></label></section> : null}
      {step === 4 ? <section aria-labelledby="plan-style-title"><h2 id="plan-style-title" className="font-serif text-2xl">What pace feels right?</h2><div className="mt-5 grid gap-3 sm:grid-cols-3">{([{ id: "relaxed", label: "Relaxed", detail: "Fewer, longer pauses" }, { id: "balanced", label: "Balanced", detail: "Room to explore" }, { id: "packed", label: "Packed", detail: "More activity options" }] as const).map((option) => <label key={option.id} className={`border p-4 ${travelStyle === option.id ? "border-vermilion bg-[#fbf1ed]" : "border-ink/15"}`}><input className="mr-2 accent-[#a43c2b]" type="radio" name="travel-style" checked={travelStyle === option.id} onChange={() => setTravelStyle(option.id)} /><span className="font-semibold">{option.label}</span><span className="mt-2 block text-xs text-ink/60">{option.detail}</span></label>)}</div></section> : null}
      {step === 5 ? <section aria-labelledby="plan-access-title"><h2 id="plan-access-title" className="font-serif text-2xl">What should the plan account for?</h2><p className="mt-2 text-sm text-ink/60">Only confirmed accessibility details count as a match. Unknown details are not treated as accessible.</p><fieldset className="mt-5"><legend className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Accessibility</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{[{ key: "step_free" as const, label: "Confirmed step-free access" }, { key: "wheelchair_access" as const, label: "Confirmed wheelchair access" }].map((item) => <label key={item.key} className="flex min-h-12 items-center gap-3 border-b border-ink/10 px-2 text-sm"><input type="checkbox" checked={accessibility[item.key]} onChange={(event) => setAccessibility((value) => ({ ...value, [item.key]: event.target.checked }))} className="size-4 accent-[#a43c2b]" />{item.label}</label>)}</div></fieldset><fieldset className="mt-6"><legend className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Dietary preferences</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{dietaryOptions.map((item) => <label key={item} className="flex min-h-11 items-center gap-2 text-sm capitalize"><input type="checkbox" checked={dietary.includes(item)} onChange={() => toggleTag(dietary, setDietary, item)} className="size-4 accent-[#a43c2b]" />{item}</label>)}</div><p className="mt-2 text-xs text-ink/55">MICHI will not infer food safety or guarantee accommodations from an unverified listing.</p></fieldset></section> : null}
      {step === 6 ? <section aria-labelledby="plan-crowds-title"><h2 id="plan-crowds-title" className="font-serif text-2xl">How much visitor pressure are you comfortable with?</h2><p className="mt-2 text-sm text-ink/60">The recommendation engine uses verified health evidence when present. Missing health evidence remains unknown.</p><label className="mt-8 block max-w-xl text-sm">Crowd tolerance <strong className="ml-2">{crowdTolerance}/100</strong><input type="range" min="0" max="100" value={crowdTolerance} onChange={(event) => setCrowdTolerance(Number(event.target.value))} className="mt-4 w-full accent-[#a43c2b]" /><span className="flex justify-between text-xs text-ink/50"><span>Prefer lower pressure</span><span>Comfortable with busy places</span></span></label></section> : null}
      {step === 7 ? <section aria-labelledby="plan-review-title"><h2 id="plan-review-title" className="font-serif text-2xl">Review your preferences</h2><dl className="mt-5 grid gap-3 border-y border-ink/10 py-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-ink/55">Dates</dt><dd className="mt-1">{startDate || "Choose dates"} – {endDate || "Choose dates"}</dd></div><div><dt className="text-xs text-ink/55">Starting place</dt><dd className="mt-1">{destination?.name ?? "Choose a destination"}</dd></div><div><dt className="text-xs text-ink/55">Interests</dt><dd className="mt-1 capitalize">{interests.join(", ") || "Choose at least one"}</dd></div><div><dt className="text-xs text-ink/55">Experience budget</dt><dd className="mt-1">{budget ? `¥${Number(budget).toLocaleString("en-US")}` : "No ceiling"}</dd></div><div><dt className="text-xs text-ink/55">Travel style</dt><dd className="mt-1 capitalize">{travelStyle}</dd></div><div><dt className="text-xs text-ink/55">Access and food</dt><dd className="mt-1">{Object.values(accessibility).some(Boolean) ? "Access requirements selected" : "No access requirement selected"}; {dietary.length ? dietary.join(", ") : "no dietary preference"}</dd></div></dl><p className="mt-4 text-xs leading-5 text-ink/55">First MICHI ranks eligible database candidates deterministically. Gemini may reorder only these candidates and choose among their listed reasons. It receives interest tags and travel style; dates, accessibility, dietary preferences, and budget are not sent to Gemini.</p></section> : null}
    </div>

    {error ? <p role="alert" className="mb-4 flex items-start gap-2 border-l-2 border-vermilion bg-[#fbf1ed] p-3 text-sm"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p> : null}
    {message ? <p role="status" className="mb-4 flex items-start gap-2 border-l-2 border-moss bg-[#e9ece5] p-3 text-sm"><Check className="mt-0.5 size-4 shrink-0" />{message}</p> : null}
    <div className="flex flex-wrap justify-between gap-3 border-t border-ink/15 pt-4"><button type="button" onClick={moveBack} disabled={step === 0 || busy} className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold disabled:opacity-40"><ArrowLeft className="size-4" />Back</button>
      {step < steps.length - 1 ? <button type="button" onClick={moveNext} className="inline-flex min-h-11 items-center gap-2 bg-ink px-5 text-sm font-semibold text-white">Continue<ArrowRight className="size-4" /></button>
        : <button type="button" onClick={() => void buildPlan()} disabled={busy || !preferences || !destination} className="inline-flex min-h-11 items-center gap-2 bg-vermilion px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Find responsible options</button>}</div>

    {result ? <section className="mt-12 border-t-2 border-ink pt-8" aria-labelledby="plan-options-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">{result.organizer === "gemini_candidate_order" ? "Verified candidates · Gemini organized" : "Verified candidates · Deterministic order"}</p><h2 id="plan-options-title" className="mt-2 font-serif text-3xl">Choose what belongs in your plan</h2></div>{result.organizer === "gemini_candidate_order" ? <Badge><Sparkles className="mr-1 size-3" />Candidate order only</Badge> : <Badge>AI ordering unavailable</Badge>}</div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">Candidate eligibility and scores come from MICHI's deterministic engine. Gemini cannot add records or create reasons. Each selected MICHI slot is checked again before saving and is not booked by saving this itinerary.</p>
      <div className="mt-5 flex flex-wrap gap-2"><Badge><MapPin className="mr-1 size-3" />Starting place: {result.startDestination.name}</Badge><Badge><Clock3 className="mr-1 size-3" />Route time estimate unavailable</Badge></div>
      {result.alternativeLimitations ? <p className="mt-3 text-xs text-ink/55">{result.alternativeLimitations}</p> : null}
      {result.inventoryWarnings.michiUnavailable ? <p className="mt-4 text-sm text-ink/65">MICHI host inventory is currently unavailable; external verified listings may still appear.</p> : null}
      {!result.inventoryWarnings.michiUnavailable && !result.candidates.some((candidate) => candidate.type === "michi_verified") ? <p className="mt-4 text-sm text-ink/65">No MICHI-host experience matched these dates and preferences. Verified external listings, when available, link to the operator and cannot be booked through MICHI.</p> : null}
      {originals.length ? <div className="mt-8"><p className="eyebrow">Original Preference · {result.startDestination.name}</p>{originals.map(candidateCard)}</div> : <p className="mt-8 border-l-2 border-ink/25 pl-4 text-sm text-ink/60">No eligible experience matches are currently available at your starting destination.</p>}
      {alternatives.length ? <div className="mt-8"><p className="eyebrow">MICHI Alternatives · other destinations</p>{alternatives.map(candidateCard)}</div> : null}
      {!result.candidates.length ? <div className="mt-6 border-y border-ink/15 py-6 text-sm text-ink/65">No current options fit all hard constraints. Adjust your dates or preferences, or explore the verified catalogue directly.</div> : null}
      {selectedCount ? <section className="mt-8 border-y border-ink/15 py-5" aria-labelledby="itinerary-preview-title"><div className="flex flex-wrap items-baseline justify-between gap-3"><h3 id="itinerary-preview-title" className="font-serif text-2xl">Itinerary preview</h3><p className="text-xs text-ink/55">Reorder locally with the controls. No booking is made.</p></div><ol className="mt-3 divide-y divide-ink/10">{localOrder.filter((id) => selection[id]?.selected).map((id, index, items) => { const item = result.candidates.find((candidate) => candidate.id === id); if (!item) return null; return <li key={id} className="flex items-center gap-3 py-3"><span className="w-7 text-xs tabular-nums text-ink/50">{index + 1}</span><span className="min-w-0 flex-1 text-sm font-medium">{item.title}<span className="ml-2 text-xs font-normal text-ink/55">{item.destination} · {item.type === "external_verified" ? "external information" : "MICHI host"}</span></span><button type="button" aria-label={`Move ${item.title} earlier`} disabled={index === 0} onClick={() => moveSelected(id, -1)} className="min-h-10 min-w-10 border border-ink/15 text-sm disabled:opacity-40">↑</button><button type="button" aria-label={`Move ${item.title} later`} disabled={index === items.length - 1} onClick={() => moveSelected(id, 1)} className="min-h-10 min-w-10 border border-ink/15 text-sm disabled:opacity-40">↓</button></li>; })}</ol></section> : null}
      {result.candidates.length ? <div className="mt-10 border-t border-ink/15 pt-6"><label className="grid max-w-xl gap-1.5 text-xs font-medium">Itinerary name<Input value={planName} maxLength={80} onChange={(event) => setPlanName(event.target.value)} /></label><div className="mt-4 flex flex-wrap items-center gap-4"><button type="button" onClick={() => void savePlan()} disabled={busy || selectedCount === 0} className="min-h-11 bg-vermilion px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : isAuthenticated ? `Save this journey${selectedCount ? ` · ${selectedCount} selected` : ""}` : `Save journey${selectedCount ? ` · ${selectedCount} selected` : ""}`}</button><span className="text-xs text-ink/55">{isAuthenticated ? "External listings save without a time or booking. Host availability is rechecked and not reserved." : "After you choose Save journey, this browser keeps the draft for 24 hours so you can return after sign-in. Sign in is needed to save it to your account."}</span></div></div> : null}
    </section> : null}
    <div className="mt-10 border-t border-ink/10 pt-5"><Link href={isAuthenticated ? "/traveler" : "/discover"} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-vermilion">{isAuthenticated ? "Back to traveler workspace" : "Explore destinations and experiences"}<ArrowRight className="size-4" /></Link></div>
    <ProgressiveAuthDialog open={authOpen} onOpenChange={setAuthOpen} nextPath="/traveler/plan?restoreGuest=1" />
  </div>;
}
