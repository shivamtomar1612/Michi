import type { Metadata } from "next";
import { HostSettingsForm } from "@/components/host-platform";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Settings · Host workspace" };

export default async function HostSettingsPage() {
  const { user } = await requireRole(["host"]);
  const supabase = await createClient();
  const [{ data: profile, error }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("full_name,preferred_language").eq("id", user.id).maybeSingle(),
    supabase.from("host_applications").select("organization_name,official_website,status,contact_email").eq("applicant_id", user.id).eq("status", "verified").maybeSingle(),
  ]);
  return <div className="mx-auto max-w-4xl"><p className="eyebrow">Account and host profile</p><h1 className="mt-3 font-serif text-4xl">Settings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">Manage the account details MICHI uses in your workspace. Private contact information is not displayed in public listings.</p>
    {error ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">Account settings could not be loaded.</p> : <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1fr]"><section className="border border-ink/15 bg-white p-5 sm:p-7"><h2 className="mb-5 font-serif text-2xl">Account preferences</h2><HostSettingsForm fullName={profile?.full_name ?? ""} preferredLanguage={profile?.preferred_language ?? "en"} /></section><section className="border-t border-ink/15 pt-6"><h2 className="font-serif text-2xl">Verified host details</h2>{application ? <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-ink/55">Organization</dt><dd className="mt-1 font-semibold">{application.organization_name}</dd></div><div><dt className="text-xs text-ink/55">Host status</dt><dd className="mt-1 font-semibold">{application.status}</dd></div>{application.official_website ? <div><dt className="text-xs text-ink/55">Official website</dt><dd className="mt-1"><a href={application.official_website} target="_blank" rel="noreferrer" className="underline underline-offset-4">{application.official_website}</a></dd></div> : null}<div><dt className="text-xs text-ink/55">Private contact</dt><dd className="mt-1">{application.contact_email}</dd></div></dl> : <p className="mt-3 text-sm text-ink/60">Verified host details are not available on this account.</p>}<p className="mt-6 border-t border-ink/10 pt-4 text-xs leading-5 text-ink/55">To update legal identity or ownership evidence, contact MICHI support for a reviewed host-application update.</p></section></div>}
  </div>;
}
