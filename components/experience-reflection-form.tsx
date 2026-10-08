"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, LoaderCircle } from "lucide-react";

export function ExperienceReflectionForm({ bookingId, saved = false }: { bookingId: string; saved?: boolean }) {
  const [preparationCompleted, setPreparationCompleted] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setError(null);
    setMessage(null);
    const form = new FormData(formElement);
    const preparationHelpfulness = preparationCompleted ? Number(form.get("preparationHelpfulness")) : null;
    try {
      const response = await fetch("/api/traveler/reflections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingId,
          learningReflection: String(form.get("learningReflection") ?? ""),
          culturalPreparationCompleted: preparationCompleted,
          preparationHelpfulness,
          understandingScore: Number(form.get("understandingScore")),
          hostRating: Number(form.get("hostRating")),
          culturalDepthScore: Number(form.get("culturalDepthScore")),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your reflection could not be saved.");
      setMessage("Thank you. Your reflection is saved privately in your passport.");
      setSubmitted(true);
      formElement.reset();
      setPreparationCompleted(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your reflection could not be saved.");
    } finally {
      setPending(false);
    }
  }

  if (saved || submitted) return <p className="mt-4 flex items-center gap-2 text-sm text-moss"><Check className="size-4" aria-hidden="true" />Reflection saved · <Link className="underline underline-offset-2" href="/traveler/passport">View your Cultural Passport</Link></p>;

  return <form onSubmit={(event) => void submit(event)} className="mt-5 border-t border-ink/10 pt-5">
    <h3 className="font-serif text-xl">A moment to reflect</h3>
    <p className="mt-1 text-xs leading-5 text-ink/60">Your written reflection is private to you. Hosts can see structured feedback scores and preparation status, not this text.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">What did you learn?<textarea name="learningReflection" required minLength={10} maxLength={2000} rows={3} className="border border-ink/20 bg-white px-3 py-2 text-sm font-normal leading-6 outline-none focus-visible:ring-2 focus-visible:ring-vermilion" placeholder="Share what stayed with you from the experience." /></label>
      <fieldset className="grid gap-2 text-xs sm:col-span-2"><legend className="font-semibold">Did cultural preparation help?</legend><label className="flex min-h-10 items-center gap-2 font-normal"><input type="checkbox" checked={preparationCompleted} onChange={(event) => setPreparationCompleted(event.target.checked)} className="size-4 accent-vermilion" />I completed the cultural preparation before this visit.</label>
        {preparationCompleted ? <label className="grid max-w-sm gap-1.5 font-semibold">How helpful was it?<select name="preparationHelpfulness" required defaultValue="" className="min-h-11 border border-ink/20 bg-white px-3 text-sm font-normal"><option value="" disabled>Select a rating</option>{[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} · {score === 1 ? "Not helpful" : score === 5 ? "Very helpful" : "Somewhat helpful"}</option>)}</select></label> : <p className="text-xs font-normal text-ink/55">Mark this only if you reviewed the cultural preparation before your visit.</p>}
      </fieldset>
      <ScoreSelect name="understandingScore" label="How confident are you in understanding the context?" />
      <ScoreSelect name="hostRating" label="How was the host experience?" />
      <ScoreSelect name="culturalDepthScore" label="How meaningful was the cultural context?" />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-4"><button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">{pending ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Saving…</> : "Save private reflection"}</button><span className="text-xs text-ink/50">You can submit one reflection per completed booking.</span></div>
    {message ? <p role="status" className="mt-3 text-sm text-moss">{message}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-vermilion">{error}</p> : null}
  </form>;
}

function ScoreSelect({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-1.5 text-xs font-semibold">{label}<select name={name} required defaultValue="" className="min-h-11 border border-ink/20 bg-white px-3 text-sm font-normal"><option value="" disabled>Choose 1–5</option>{[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} · {score === 1 ? "Low" : score === 5 ? "High" : ""}</option>)}</select></label>;
}
