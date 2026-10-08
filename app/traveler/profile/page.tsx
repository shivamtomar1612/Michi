import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/server/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

export default async function TravelerProfilePage() {
  const { user } = await requireRole(["traveler"]);
  const supabase = await createClient();
  const { data: profile, error } = await supabase.from("profiles")
    .select("full_name,nationality,preferred_language,accessibility_preferences,dietary_preferences,created_at")
    .eq("id", user.id).maybeSingle();
  const accessibility = profile?.accessibility_preferences && typeof profile.accessibility_preferences === "object" && !Array.isArray(profile.accessibility_preferences)
    ? Object.keys(profile.accessibility_preferences as Record<string, unknown>).filter((key) => (profile.accessibility_preferences as Record<string, unknown>)[key] === true) : [];
  const dietary = Array.isArray(profile?.dietary_preferences) ? profile.dietary_preferences.filter((item): item is string => typeof item === "string") : [];
  return <WorkspaceShell role="Traveler" basePath="/traveler"><div className="mx-auto max-w-4xl">
    <p className="eyebrow">Private account details</p><h1 className="mt-3 font-serif text-4xl">Profile</h1>
    {error || !profile ? <p role="alert" className="mt-6 border-l-2 border-vermilion bg-[#fbf1ed] p-4 text-sm">Profile details could not be loaded.</p> : <dl className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
      <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]"><dt className="text-xs font-semibold uppercase tracking-wide text-ink/55">Name</dt><dd className="text-sm">{profile.full_name || "Not provided"}</dd></div>
      <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]"><dt className="text-xs font-semibold uppercase tracking-wide text-ink/55">Nationality</dt><dd className="text-sm">{profile.nationality || "Not provided"}</dd></div>
      <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]"><dt className="text-xs font-semibold uppercase tracking-wide text-ink/55">Preferred language</dt><dd className="text-sm">{profile.preferred_language || "Not provided"}</dd></div>
      <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]"><dt className="text-xs font-semibold uppercase tracking-wide text-ink/55">Accessibility preferences</dt><dd className="text-sm">{accessibility.length ? accessibility.join(", ") : "None saved"}</dd></div>
      <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]"><dt className="text-xs font-semibold uppercase tracking-wide text-ink/55">Dietary preferences</dt><dd className="text-sm">{dietary.length ? dietary.join(", ") : "None saved"}</dd></div>
    </dl>}
    <p className="mt-5 text-xs text-ink/55">Profile editing will be available in a later phase. These details are visible only to your account.</p>
  </div></WorkspaceShell>;
}
