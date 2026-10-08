"use client";

import { useActionState } from "react";
import { submitHostApplication } from "@/features/hosts/actions";
import type { PublicExternalExperience } from "@/server/data/catalogue";

const fields = [
  ["legalName", "Your legal name"], ["organizationName", "Business or organization name"],
  ["officialWebsite", "Official website (https://, if available)"], ["contactEmail", "Contact email"],
] as const;
const details = [
  ["ownershipEvidence", "How you own or are authorized to offer the experience"],
  ["experienceDescription", "Experience description"], ["culturalRules", "Cultural and participation rules"],
  ["accessibilityDetails", "Accessibility details, including unknowns"],
  ["availabilityPlan", "How you will manage dated availability"],
  ["capacityPlan", "Capacity and group size"], ["cancellationRules", "Cancellation rules"],
] as const;

export function HostApplicationForm({ initial = {}, externalListings = [] }: { initial?: Record<string, string>; externalListings?: PublicExternalExperience[] }) {
  const [state, action, pending] = useActionState(submitHostApplication, { message: "", success: false });
  return <form action={action} className="mt-8 grid gap-5">
    <p className="text-sm leading-6 text-ink/65">Applying does not make you a verified MICHI host. An administrator checks your right to operate before any listing can be published.</p>
    <div className="grid gap-5 sm:grid-cols-2">{fields.map(([name, label]) => <label key={name} className="grid gap-2 text-sm font-semibold">{label}<input name={name} type={name === "contactEmail" ? "email" : name === "officialWebsite" ? "url" : "text"} defaultValue={initial[name] ?? ""} required={name !== "officialWebsite"} maxLength={name === "contactEmail" ? 254 : 160} className="min-h-12 border border-ink/20 bg-white px-4 font-normal" /></label>)}</div>
    <label className="grid gap-2 text-sm font-semibold">Existing MICHI external listing, if applicable<select name="externalExperienceId" defaultValue={initial.externalExperienceId ?? ""} className="min-h-12 border border-ink/20 bg-white px-4 font-normal"><option value="">No listing / not listed</option>{externalListings.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.operator_name}</option>)}</select><span className="text-xs font-normal text-ink/60">Selecting a listing does not verify ownership. MICHI will check authorization separately.</span></label>
    {details.map(([name, label]) => <label key={name} className="grid gap-2 text-sm font-semibold">{label}<textarea name={name} defaultValue={initial[name] ?? ""} required minLength={name === "ownershipEvidence" || name === "experienceDescription" ? 11 : 2} maxLength={3000} rows={3} className="border border-ink/20 bg-white p-4 font-normal" /></label>)}
    <div className="flex flex-wrap gap-3"><button type="submit" name="intent" value="draft" disabled={pending} className="min-h-11 border border-ink/30 px-5 text-sm font-semibold disabled:opacity-50">Save draft</button><button type="submit" name="intent" value="submitted" disabled={pending} className="min-h-11 bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">Submit for review</button></div>
    {state.message ? <p role="status" className={state.success ? "text-sm text-moss" : "text-sm text-vermilion"}>{state.message}</p> : null}
  </form>;
}
