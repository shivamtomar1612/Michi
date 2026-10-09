import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { EmptyState } from "@/components/ui/states";
import { requireRole } from "@/server/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PassportShareCard } from "@/components/passport-share-card";
import { passportDemoAchievements } from "@/features/passport/demo-data";

export const metadata: Metadata = { title: "Cultural Passport" };

export default async function CulturalPassportPage() {
  const { user } = await requireRole(["traveler"]);
  const supabase = await createClient();
  const [achievementResult, metricResult] = await Promise.all([
    supabase.from("passport_achievements").select("id,type,title,description,earned_at").eq("traveler_id", user.id).order("earned_at", { ascending: false }).limit(100),
    supabase.rpc("get_cultural_passport_metrics"),
  ]);
  const metrics = metricResult.data?.[0];
  const loadError = achievementResult.error || metricResult.error;
  return <WorkspaceShell role="Traveler" basePath="/traveler"><div className="mx-auto max-w-5xl">
    <header className="max-w-3xl pb-8"><p className="eyebrow">Reflection · held by you</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">Cultural Passport</h1>
      <p className="mt-4 text-sm leading-6 text-ink/65">A record of experiences, care, and learning. MICHI recognizes participation and reflection, never sacred practices or cultural expertise.</p></header>
    {loadError || !metrics ? <p role="alert" className="border-l-2 border-vermilion bg-[#fbf1ed] p-4 text-sm">Your passport and its verified activity counts could not be loaded. Please try again later.</p> : <>
      <PassportShareCard metrics={metrics} achievements={(achievementResult.data ?? []).map((item) => item.title)} />
      <section className="mt-10" aria-labelledby="earned-achievements-title"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-4"><div><p className="eyebrow">Milestones</p><h2 id="earned-achievements-title" className="mt-2 font-serif text-2xl">Earned acknowledgments</h2></div><p className="text-xs text-ink/55">Granted from completed MICHI visits and your choices</p></div>
        {achievementResult.data?.length ? <ol className="mt-2 divide-y divide-ink/10">{achievementResult.data.map((item) => <li key={item.id} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:items-start"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-moss">{item.type.replaceAll("_", " ")}</p><h3 className="mt-1 font-serif text-xl">{item.title}</h3>{item.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{item.description}</p> : null}</div><time className="text-xs text-ink/50" dateTime={item.earned_at}>Earned {new Date(item.earned_at).toLocaleDateString()}</time></li>)}</ol> : <div className="mt-5"><EmptyState title="Your first milestone will follow a real experience" description="After a completed MICHI visit, share a reflection or complete cultural preparation to begin your private passport." actionHref="/discover" actionLabel="Discover a MICHI experience" /></div>}
      </section>
      <aside className="mt-10 border-t border-ink/15 pt-7" aria-labelledby="demo-achievement-title"><p className="eyebrow">One illustrative example · demo only</p><article className="mt-3 grid gap-3 border border-dashed border-ink/20 bg-white/60 p-5 sm:grid-cols-[auto_1fr] sm:items-center"><span className="grid size-12 place-items-center border border-vermilion/30 font-serif text-lg text-vermilion" aria-hidden="true">壱</span><div><div className="flex flex-wrap items-center gap-2"><h2 id="demo-achievement-title" className="font-serif text-xl">{passportDemoAchievements[0].title}</h2><span className="border border-vermilion/30 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-vermilion">Demo example</span></div><p className="mt-1 text-sm leading-6 text-ink/65">{passportDemoAchievements[0].description}</p><p className="mt-1 text-xs text-ink/50">Illustrative only · not earned, not counted, and not stored in your account.</p></div></article></aside>
      <p className="mt-8 border-t border-ink/10 pt-5 text-xs leading-5 text-ink/55">This passport is private. Shared summaries contain totals and earned acknowledgment names only. Your itinerary, booking details, and written reflections stay private.</p>
    </>}
  </div></WorkspaceShell>;
}
