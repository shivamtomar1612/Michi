import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { HostExperienceForm } from "@/components/host-platform";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Create an experience · Host workspace" };

export default async function NewHostExperiencePage() {
  const { user } = await requireRole(["host"]);
  const supabase = await createClient();
  const { data: destinations, error } = await supabase.from("destinations").select("id,name")
    .eq("status", "published").order("name");
  return <div className="mx-auto max-w-3xl"><p className="eyebrow">New listing · draft</p><h1 className="mt-3 font-serif text-4xl">Create an experience</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">Describe the experience in your own words. MICHI keeps your submission in draft until your host authorization and listing have been reviewed.</p>
    {error ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">Destinations could not be loaded.</p> : destinations?.length ? <div className="mt-8"><HostExperienceForm destinations={destinations} hostId={user.id} /></div> : <section className="mt-8 border border-ink/15 p-5"><h2 className="font-serif text-xl">No publishable destinations</h2><p className="mt-2 text-sm text-ink/60">A destination must be reviewed and published before you can create a listing for it.</p><Link href="/host/experiences" className="mt-4 inline-block text-sm font-semibold underline">Return to experiences</Link></section>}
  </div>;
}
