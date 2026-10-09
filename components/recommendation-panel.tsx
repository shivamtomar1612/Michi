"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { Check, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressiveAuthDialog } from "@/components/progressive-auth-dialog";
import { Input } from "@/components/ui/input";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatDateTime } from "@/i18n/formatters";
import type { Locale } from "@/i18n/routing";
import type { RecommendationComponentScores, RecommendationResult } from "@/features/recommendations/types";
import type { ExternalDiscoveryMatch } from "@/features/recommendations/external";
import type { RecommendationPreferencesInput } from "@/features/recommendations/schemas";

type Decision = "accepted" | "rejected";
type ResultPayload = { mode: "guest" | "authenticated"; logId: string | null; recommendations: RecommendationResult[]; externalRecommendations: ExternalDiscoveryMatch[]; michiInventoryUnavailable: boolean; externalInventoryUnavailable: boolean };

function ExternalMatchCard({ match, locale }: { match: ExternalDiscoveryMatch; locale: Locale }) {
  const t = useTranslations("Recommendations");
  return <article className="border border-ink/15 bg-white p-5 sm:p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">{match.destinationName} · {match.region} · {t("officialSourceListing")}</p>
    <h4 className="mt-2 font-serif text-2xl">{match.title}</h4>
    <p className="mt-3 text-sm leading-6 text-ink/70">{match.shortDescription}</p>
    <p className="mt-4 text-sm font-semibold">{t("interestCompatibility", { score: match.interestCompatibility })}</p>
    <p className="mt-1 text-xs text-ink/60">{t("compatibilityDisclosure", { interests: match.matchedInterests.join(", ") })}</p>
    <div className="mt-4 flex flex-wrap gap-2"><Badge>{t("verifiedExternal")}</Badge><Badge>{t("availabilityNotIntegrated")}</Badge><Badge>{t("healthUnavailable")}</Badge></div>
    <details className="mt-5 border-y border-ink/10 py-3"><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">{t("whyMatch")}</summary>
      <div className="pb-3 pt-2 text-sm leading-6 text-ink/70"><p>{t("source")} <a className="editorial-link text-vermilion" href={match.sourceUrl} target="_blank" rel="noreferrer">{match.sourceName}</a> · {t("lastChecked")} {formatJapanDate(match.lastVerifiedAt, locale) ?? t("unknown")}</p>
        <p className="mt-2">{t("confidenceLimited")}</p>
        <p className="mt-2 font-semibold">{t("missingInformation")}</p><ul className="mt-2 list-disc pl-5">{match.missingInformation.map((missing) => <li key={missing}>{missing}</li>)}</ul>
      </div>
    </details>
    <a className="mt-5 inline-flex min-h-11 items-center bg-ink px-4 text-sm font-semibold text-white" href={match.externalBookingUrl ?? match.officialUrl} target="_blank" rel="noreferrer">{match.externalBookingUrl ? t("officialBooking") : t("officialExperience")}<span className="sr-only"> ({t("externalLinkOpens")})</span></a>
  </article>;
}

function formatJapanDate(value: string | null, locale: Locale): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return formatDateTime(date, locale);
}

function splitTags(value: FormDataEntryValue | null): string[] {
  return typeof value === "string" ? [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))] : [];
}

function translateReason(value: string, t: ReturnType<typeof useTranslations<"Recommendations">>): string {
  if (value.endsWith(" interest")) return t("reasonInterest", { interest: value.slice(0, -" interest".length) });
  if (value.endsWith(" listed by the host")) return t("reasonLanguage", { language: value.slice(0, -" listed by the host".length) });
  const entries: Record<string, "reasonCapacity" | "reasonCrowd" | "reasonLocal" | "reasonContext"> = {
    "Host capacity available for your dates": "reasonCapacity",
    "Visitor pressure is within your selected tolerance": "reasonCrowd",
    "Host-led experience supports its host; this is not an earnings estimate": "reasonLocal",
    "The host has provided cultural context": "reasonContext",
  };
  return entries[value] ? t(entries[value]) : value;
}

function translateTradeoff(value: string, t: ReturnType<typeof useTranslations<"Recommendations">>): string {
  const entries: Record<string, "tradeoffBudget" | "tradeoffNoSlots" | "tradeoffFullSlots" | "tradeoffLanguage" | "tradeoffAccess" | "tradeoffCrowd" | "tradeoffContext" | "tradeoffHealth" | "tradeoffPace"> = {
    "Price is close to your budget limit.": "tradeoffBudget",
    "No available slots are listed for your dates.": "tradeoffNoSlots",
    "Some requested date slots are full or unavailable.": "tradeoffFullSlots",
    "Some requested languages are not listed by the host.": "tradeoffLanguage",
    "Some requested accessibility details are not confirmed by the host.": "tradeoffAccess",
    "Visitor pressure is above your selected crowd tolerance.": "tradeoffCrowd",
    "Host-provided cultural context is not available for this experience.": "tradeoffContext",
    "A current, complete Destination Health score is unavailable; no low-pressure claim is made.": "tradeoffHealth",
    "The experience duration is outside your preferred pace range.": "tradeoffPace",
  };
  return entries[value] ? t(entries[value]) : value;
}

function RecommendationCard({
  recommendation,
  decision,
  onDecision,
  onRequireAuth,
  guest,
  locale,
}: {
  recommendation: RecommendationResult;
  decision: Decision | null;
  onDecision: (id: string, value: Decision) => Promise<void>;
  onRequireAuth: () => void;
  guest: boolean;
  locale: Locale;
}) {
  const t = useTranslations("Recommendations");
  const [saving, setSaving] = useState<Decision | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState(recommendation.slots.find((slot) => slot.status === "open" && slot.bookedCount < slot.capacity)?.id ?? "");
  const [bookingPending, setBookingPending] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const money = formatCurrency(recommendation.priceJpy, locale);

  async function choose(value: Decision) {
    setSaving(value);
    setError(null);
    try {
      await onDecision(recommendation.id, value);
    } catch (cause) {
      void cause;
      setError(t("choiceSaveFailed"));
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
      await response.json();
      if (response.status === 401) { onRequireAuth(); return; }
      if (!response.ok) throw new Error(t("bookingRequestFailed"));
      setBookingMessage(t("bookingRequestSent"));
    } catch (cause) {
      void cause;
      setBookingMessage(t("bookingRequestFailed"));
    } finally { setBookingPending(false); }
  }

  const availableSlots = recommendation.slots.filter((slot) => slot.status === "open" && slot.bookedCount < slot.capacity);

  return <article className="border border-ink/15 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">{recommendation.destinationName} · {recommendation.region}</p><h3 className="mt-2 font-serif text-2xl">{recommendation.title}</h3></div>
      <div className="text-right"><p className="font-serif text-3xl tabular-nums">{Math.round(recommendation.score)}%</p><p className="text-[10px] uppercase tracking-[0.12em] text-ink/55">{t("preferenceFit")}</p></div>
    </div>
    <p className="mt-3 text-sm leading-6 text-ink/70">{recommendation.shortDescription}</p>
    <div className="mt-4 flex flex-wrap gap-2"><Badge>{money} {t("pricePerPerson")}</Badge><Badge>{t("minutes", { count: recommendation.durationMinutes })}</Badge><Badge>{t("hostProvided")}</Badge><Badge>{recommendation.destinationHealth.status} · {recommendation.destinationHealth.simulationStatus === "live" ? t("liveSignals") : recommendation.destinationHealth.simulationStatus === "simulated" ? t("simulatedSignals") : recommendation.destinationHealth.simulationStatus === "snapshot" ? t("verifiedSnapshot") : t("healthUnavailable")}</Badge><Badge>{t("evidencePercent", { count: recommendation.evidenceCompleteness })}</Badge></div>

    <details className="mt-5 border-y border-ink/10 py-3">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">{t("whyRecommendation")}</summary>
      <div className="pb-3 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55">{t("whyMichi")}</p>
        {recommendation.reasons.length ? <ul className="mt-3 space-y-2">{recommendation.reasons.map((reason) => <li key={reason} className="flex gap-2 text-sm leading-5"><Check className="mt-0.5 size-4 shrink-0 text-moss" aria-hidden="true" /><span>{translateReason(reason, t)}</span></li>)}</ul> : <p className="mt-2 text-sm text-ink/65">{t("noExtraMatch")}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink/10 pt-3 text-xs sm:grid-cols-3">
          {Object.entries(recommendation.componentScores).map(([name, score]) => <div key={name}><dt className="text-ink/55">{t(({ personalMatch: "scorePersonal", culturalDepth: "scoreCultural", localBenefit: "scoreLocal", accessibilityMatch: "scoreAccess", availability: "scoreAvailability", destinationHealth: "scoreHealth" } as const)[name as keyof RecommendationComponentScores] ?? "unknown")}</dt><dd className="mt-0.5 font-semibold tabular-nums">{score === null ? t("unknown") : `${score}/100`}</dd></div>)}
        </dl>
        {recommendation.tradeoffs.length ? <div className="mt-4 border-t border-ink/10 pt-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/55">{t("tradeoffs")}</p><ul className="mt-2 space-y-2">{recommendation.tradeoffs.map((tradeoff) => <li key={tradeoff} className="flex gap-2 text-sm leading-5"><CircleAlert className="mt-0.5 size-4 shrink-0 text-vermilion" aria-hidden="true" /><span>{translateTradeoff(tradeoff, t)}</span></li>)}</ul></div> : null}
        <p className="mt-4 border-t border-ink/10 pt-3 text-xs leading-5 text-ink/60">{t("destinationInfo")} {recommendation.sourceMetadata.destination.sourceName} · {t("verified")} {formatJapanDate(recommendation.sourceMetadata.destination.verifiedAt, locale) ?? t("dateUnavailable")} · <a href={recommendation.sourceMetadata.destination.sourceUrl} target="_blank" rel="noreferrer" className="editorial-link text-vermilion">{t("openSource")}<span className="sr-only"> ({t("externalLinkOpens")})</span></a></p>
        {recommendation.destinationHealth.lastUpdated ? <p className="mt-2 text-xs text-ink/55">{t("oldestSignal")} {formatJapanDate(recommendation.destinationHealth.lastUpdated, locale)} ({t("japanTime")})</p> : null}
        {recommendation.healthProvenance.length ? <ul className="mt-2 space-y-1 text-xs text-ink/55">{recommendation.healthProvenance.map((source) => <li key={`${source.component}:${source.sourceUrl}`}>{source.component}: <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">{source.sourceName}</a> · {t("observed")} {formatJapanDate(source.observedAt, locale)} · {t("verified")} {formatJapanDate(source.verifiedAt, locale)}</li>)}</ul> : null}
      </div>
    </details>

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" disabled={saving !== null} aria-pressed={decision === "accepted"} onClick={() => void choose("accepted")} className="min-h-11 border border-moss bg-moss px-4 text-sm font-semibold text-white hover:bg-moss/90 disabled:opacity-60">{saving === "accepted" ? t("saving") : decision === "accepted" ? t("accepted") : t("saveIdea")}</button>
      <button type="button" disabled={saving !== null} aria-pressed={decision === "rejected"} onClick={() => void choose("rejected")} className="min-h-11 border border-ink/20 px-4 text-sm font-semibold text-ink/75 hover:border-ink/50 disabled:opacity-60">{saving === "rejected" ? t("saving") : t("notForMe")}</button>
      {decision ? <span className="text-xs text-ink/55" role="status">{guest ? t("guestChoice") : t("savedChoice")}</span> : null}
    </div>
    {error ? <p role="alert" className="mt-3 text-sm text-vermilion">{error}</p> : null}
    <p className="mt-4 text-xs leading-5 text-ink/55">{t("hostBenefitDisclosure")}</p>
    <details className="mt-5 border-t border-ink/10 pt-3"><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">{t("bookingTerms")}</summary>
      <div className="space-y-2 py-2 text-sm leading-6 text-ink/70"><p><strong>{t("participation")}</strong> {recommendation.participationRules}</p><p><strong>{t("photography")}</strong> {recommendation.photographyPolicy.replaceAll("_", " ")}</p><p><strong>{t("cancellation")}</strong> {recommendation.cancellationRules}</p></div>
    </details>
    {availableSlots.length ? <form onSubmit={(event) => void requestBooking(event)} className="mt-5 grid gap-3 border-t border-ink/10 pt-4">
      <p className="text-sm font-semibold">{t("requestMichiBooking")}</p>
      <label className="grid gap-1 text-xs font-semibold">{t("availableSlot")}<select name="slotId" value={bookingSlotId} onChange={(event) => setBookingSlotId(event.target.value)} required className="min-h-11 border border-ink/20 bg-white px-3 text-sm">{availableSlots.map((slot) => <option key={slot.id} value={slot.id}>{formatJapanDate(slot.startsAt, locale)} · {t("placesRemaining", { count: slot.capacity - slot.bookedCount })}</option>)}</select></label>
      <label className="grid max-w-xs gap-1 text-xs font-semibold">{t("guests")}<input name="guests" type="number" min={1} max={Math.min(100, availableSlots.find((slot) => slot.id === bookingSlotId)?.capacity ?? 1)} defaultValue={1} required className="min-h-11 border border-ink/20 px-3 text-sm" /></label>
      <label className="flex min-h-11 items-start gap-2 text-xs leading-5"><input name="acknowledged" type="checkbox" required className="mt-1 size-4 accent-vermilion" />{t("acknowledgeRules")}</label>
      <button type="submit" disabled={bookingPending} className="min-h-11 justify-self-start bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{bookingPending ? t("sendingRequest") : t("requestBooking")}</button>
      {bookingMessage ? <p role="status" className="text-sm text-ink/70">{bookingMessage}</p> : null}
    </form> : null}
  </article>;
}

export function RecommendationPanel() {
  const locale = useLocale() as Locale;
  const t = useTranslations("Recommendations");
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
      if (!response.ok) throw new Error(t("recommendationsFailed"));
      setPayload(result as ResultPayload);
    } catch (cause) {
      void cause;
      setError(t("recommendationsFailed"));
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
      throw new Error(t("saveDecisionFailed"));
    }
    setDecisions((current) => ({ ...current, [experienceId]: decision }));
  }

  return <section id="recommendations" aria-labelledby="recommendations-title" className="mt-8 border-y border-ink/15 py-8 sm:py-10">
    <div className="max-w-3xl"><p className="eyebrow inline-flex items-center gap-2"><Sparkles className="size-3.5" aria-hidden="true" />{t("responsibleDiscovery")}</p><h2 id="recommendations-title" className="mt-3 font-serif text-3xl">{t("heading")}</h2><p className="mt-3 text-sm leading-6 text-ink/65">{t("intro")}</p></div>

    <form onSubmit={(event) => void submit(event)} className="mt-7 grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium">{t("interests")} <span className="font-normal text-ink/55">{t("commaSeparated")}</span><Input name="interests" required placeholder={t("interestsPlaceholder")} /></label>
        <label className="grid gap-1.5 text-xs font-medium">{t("regions")} <span className="font-normal text-ink/55">{t("optionalComma")}</span><Input name="regions" placeholder={t("regionsPlaceholder")} /></label>
        <label className="grid gap-1.5 text-xs font-medium">{t("budget")} <span className="font-normal text-ink/55">{t("optional")}</span><Input name="budgetJpy" type="number" min={0} max={2000000} step={1000} placeholder={t("noLimit")} /></label>
        <label className="grid gap-1.5 text-xs font-medium">{t("pace")}<select name="pace" defaultValue="balanced" className="min-h-12 border border-ink/20 bg-white px-4 text-sm"><option value="relaxed">{t("relaxed")}</option><option value="balanced">{t("balanced")}</option><option value="active">{t("active")}</option></select></label>
        <label className="grid gap-1.5 text-xs font-medium">{t("fromDate")}<Input name="startDate" type="date" required /></label>
        <label className="grid gap-1.5 text-xs font-medium">{t("toDate")}<Input name="endDate" type="date" required /></label>
        <label className="grid gap-1.5 text-xs font-medium">{t("dietary")} <span className="font-normal text-ink/55">{t("optionalComma")}</span><Input name="dietaryPreferences" placeholder={t("dietaryPlaceholder")} /></label>
        <label className="grid gap-1.5 text-xs font-medium">{t("languages")} <span className="font-normal text-ink/55">{t("optionalComma")}</span><Input name="languages" placeholder={t("languagesPlaceholder")} /></label>
        <label className="grid gap-1.5 text-xs font-medium md:col-span-2">{t("culturalInterests")} <span className="font-normal text-ink/55">{t("optionalComma")}</span><Input name="culturalInterests" placeholder={t("culturalInterestsPlaceholder")} /></label>
      </div>

      <fieldset className="border-t border-ink/10 pt-5"><legend className="text-xs font-semibold">{t("accessNeeds")}</legend><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
        ["step_free", t("stepFree")], ["wheelchair_access", t("wheelchair")], ["quiet_space", t("quietSpace")], ["hearing_support", t("hearingSupport")], ["visual_support", t("visualSupport")],
      ].map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name={key} className="size-4 accent-vermilion" />{label}</label>)}</div><p className="mt-2 text-xs text-ink/55">{t("accessDisclosure")}</p></fieldset>

      <label className="grid gap-2 border-t border-ink/10 pt-5 text-xs font-semibold">{t("crowdTolerance")} <span className="flex items-center justify-between font-normal"><span>{t("quietPlaces")}</span><output htmlFor="crowdTolerance">{crowdTolerance}/100</output><span>{t("comfortableCrowds")}</span></span><input id="crowdTolerance" name="crowdTolerance" type="range" min={0} max={100} value={crowdTolerance} onChange={(event) => setCrowdTolerance(Number(event.target.value))} className="w-full accent-vermilion" /><span className="sr-only">{t("crowdValue")}</span></label>
      <div><button type="submit" disabled={loading} className="inline-flex min-h-12 items-center gap-2 bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:cursor-wait disabled:opacity-60">{loading ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{t("searching")}</> : t("search")}</button></div>
    </form>

    {error ? <p role="alert" className="mt-5 border-l-2 border-vermilion bg-paper-deep p-4 text-sm text-vermilion">{error}{error.toLowerCase().includes("sign in") ? <> <Link href="/auth/login" className="font-semibold underline underline-offset-2">Sign in</Link>.</> : null}</p> : null}
    {payload ? <div className="mt-9 space-y-10" aria-live="polite">
      {payload.mode === "guest" ? <p className="border-l-2 border-moss bg-moss/5 px-4 py-3 text-sm text-ink/75">{t("guestDisclosure")}</p> : null}
      <section aria-label={t("availableMichi")}><h3 className="font-serif text-2xl">{t("availableMichi")}</h3>{payload.recommendations.length ? <div className="mt-4 grid gap-5">{payload.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} decision={decisions[recommendation.id] ?? null} onDecision={saveDecision} onRequireAuth={() => setAuthOpen(true)} guest={payload.mode === "guest"} locale={locale} />)}</div> : <p className="mt-3 text-sm leading-6 text-ink/65">{payload.michiInventoryUnavailable ? t("inventoryUnavailable") : t("noHostMatches")}</p>}</section>
      <section aria-label={t("externalTitle")}><h3 className="font-serif text-2xl">{t("externalTitle")}</h3><p className="mt-2 text-sm text-ink/60">{t("externalDisclosure")}</p>{payload.externalRecommendations.length ? <div className="mt-4 grid gap-5">{payload.externalRecommendations.map((match) => <ExternalMatchCard key={match.id} match={match} locale={locale} />)}</div> : <p className="mt-3 text-sm text-ink/65">{payload.externalInventoryUnavailable ? t("externalUnavailable") : t("noExternalMatches")}</p>}</section>
    </div> : null}
    <ProgressiveAuthDialog open={authOpen} onOpenChange={setAuthOpen} nextPath="/discover" title={t("signInBookingTitle")} description={t("signInBookingDescription")} />
  </section>;
}
