import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";
import { ExperienceImageStrip } from "@/components/host-platform";

export const metadata: Metadata = { title: "Your experiences · Host workspace" };

export default async function HostExperiencesPage() {
  const { user } = await requireRole(["host"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("experiences").select("id,title,status,is_verified,is_paused,short_description,image_paths,created_at")
    .eq("host_id", user.id).order("created_at", { ascending: false });
  return <div className="mx-auto max-w-5xl">
    <p className="eyebrow">Your inventory</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-4xl">Experiences</h1><p className="mt-3 text-sm text-ink/60">Every listing is yours to shape and control.</p></div><Link href="/host/experiences/new" className="inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-sm font-semibold text-white"><Plus className="size-4" />Create experience</Link></div>
    {error ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">Your experience list could not be loaded.</p> : data?.length ? <div className="mt-8 divide-y divide-ink/15 border-y border-ink/15">{data.map((experience) => <article key={experience.id} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
      <div><div className="flex flex-wrap items-center gap-3"><h2 className="font-serif text-2xl">{experience.title}</h2><span className="border border-ink/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">{experience.status}</span></div><p className="mt-2 text-sm text-ink/60">{experience.is_verified ? "MICHI verified" : "Awaiting review"} · {experience.is_paused ? "Recommendations paused" : "Recommendations active when published"}</p><p className="mt-2 max-w-2xl text-sm leading-6">{experience.short_description}</p><ExperienceImageStrip paths={experience.image_paths ?? []} /></div>
      <Link href={`/host/experiences/${experience.id}`} className="inline-flex min-h-11 items-center gap-2 self-start border border-ink/20 px-4 text-sm font-semibold hover:border-vermilion">Edit experience <ArrowRight className="size-4" /></Link>
    </article>)}</div> : <section className="mt-9 border-y border-ink/15 py-12"><h2 className="font-serif text-2xl">No experiences yet</h2><p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">Start with a draft. A MICHI reviewer will check host authorization and listing details before it becomes bookable.</p><Link href="/host/experiences/new" className="mt-5 inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-sm font-semibold text-white"><Plus className="size-4" />Create your first experience</Link></section>}
  </div>;
}
