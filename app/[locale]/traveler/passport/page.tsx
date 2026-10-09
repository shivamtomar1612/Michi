import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { EmptyState } from "@/components/ui/states";
import { requireRole } from "@/server/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PassportShareCard } from "@/components/passport-share-card";
import { passportDemoAchievements } from "@/features/passport/demo-data";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

export const metadata: Metadata = { title: "Cultural Passport" };

export default async function CulturalPassportPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Passport" });
  const { user } = await requireRole(["traveler"]);
  const supabase = await createClient();
  const [achievementResult, metricResult] = await Promise.all([
    supabase.from("passport_achievements").select("id,type,title,description,earned_at").eq("traveler_id", user.id).order("earned_at", { ascending: false }).limit(100),
    supabase.rpc("get_cultural_passport_metrics"),
  ]);
  const metrics = metricResult.data?.[0];
  const loadError = achievementResult.error || metricResult.error;
  return <WorkspaceShell role="Traveler" basePath="/traveler"><div className="mx-auto max-w-5xl">
    <header className="max-w-3xl pb-8"><p className="eyebrow">{t("eyebrow")}</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 text-sm leading-6 text-ink/65">{t("description")}</p></header>
    {loadError || !metrics ? <p role="alert" className="border-l-2 border-vermilion bg-[#fbf1ed] p-4 text-sm">{t("loadError")}</p> : <>
      <PassportShareCard metrics={metrics} achievements={(achievementResult.data ?? []).map((item) => item.title)} />
      <section className="mt-10" aria-labelledby="earned-achievements-title"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-4"><div><p className="eyebrow">{t("milestones")}</p><h2 id="earned-achievements-title" className="mt-2 font-serif text-2xl">{t("earned")}</h2></div><p className="text-xs text-ink/55">{t("granted")}</p></div>
        {achievementResult.data?.length ? <ol className="mt-2 divide-y divide-ink/10">{achievementResult.data.map((item) => <li key={item.id} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:items-start"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-moss">{item.type.replaceAll("_", " ")}</p><h3 className="mt-1 font-serif text-xl">{item.title}</h3>{item.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{item.description}</p> : null}</div><time className="text-xs text-ink/50" dateTime={item.earned_at}>{t("earnedDate", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date(item.earned_at)) })}</time></li>)}</ol> : <div className="mt-5"><EmptyState title={t("firstTitle")} description={t("firstDescription")} actionHref="/discover" actionLabel={t("discover")} /></div>}
      </section>
      <aside className="mt-10 border-t border-ink/15 pt-7" aria-labelledby="demo-achievement-title"><p className="eyebrow">{t("demoEyebrow")}</p><article className="mt-3 grid gap-3 border border-dashed border-ink/20 bg-white/60 p-5 sm:grid-cols-[auto_1fr] sm:items-center"><span className="grid size-12 place-items-center border border-vermilion/30 font-serif text-lg text-vermilion" aria-hidden="true">壱</span><div><div className="flex flex-wrap items-center gap-2"><h2 id="demo-achievement-title" className="font-serif text-xl">{passportDemoAchievements[0].title}</h2><span className="border border-vermilion/30 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-vermilion">{t("demoTag")}</span></div><p className="mt-1 text-sm leading-6 text-ink/65">{passportDemoAchievements[0].description}</p><p className="mt-1 text-xs text-ink/50">{t("demoNote")}</p></div></article></aside>
      <p className="mt-8 border-t border-ink/10 pt-5 text-xs leading-5 text-ink/55">{t("privacy")}</p>
    </>}
  </div></WorkspaceShell>;
}
