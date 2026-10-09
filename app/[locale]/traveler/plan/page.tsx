import { getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { ItineraryBuilder } from "@/components/itinerary-builder";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { listDestinations } from "@/server/data/catalogue";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SkipLink } from "@/components/skip-link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Plan" });
  return { title: t("title") };
}

export default async function PlanPage({ searchParams, params: routeParams }: { searchParams: Promise<{ restoreGuest?: string }>; params: Promise<{ locale: string }> }) {
  const [params, { locale }] = await Promise.all([searchParams, routeParams]);
  if (!isLocale(locale)) return null;
  const t = await getTranslations({ locale, namespace: "Plan" });
  const destinationResult = await listDestinations();
  const supabase = isSupabaseConfigured() ? await createClient().catch(() => null) : null;
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  let isTraveler = false;
  let itineraries: { id: string; name: string; start_date: string | null; end_date: string | null; status: string; updated_at: string }[] | null = null;
  let itineraryError: unknown = null;
  if (user) {
      const { data: profile } = await supabase!.from("profiles").select("role").eq("id", user.id).maybeSingle();
    isTraveler = profile?.role === "traveler";
    if (isTraveler) {
      const result = await supabase!.from("itineraries").select("id,name,start_date,end_date,status,updated_at")
        .eq("traveler_id", user.id).in("status", ["draft", "planned", "completed"])
        .order("updated_at", { ascending: false }).limit(20);
      itineraries = result.data;
      itineraryError = result.error;
    }
  }

  const content = <div className="mx-auto max-w-4xl">
    <p className="eyebrow">{isTraveler ? t("travelerWorkspace") : t("guestPreview")}</p>
    <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">{t("title")}</h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/65">{t("description")}</p>
    {params.restoreGuest === "1" ? <div className="mt-6 border-l-2 border-moss bg-moss/5 p-4 text-sm" role="status">{t("restoreNotice")}</div> : null}
    {isTraveler && itineraries?.length ? <section className="mt-8 border-y border-ink/15 py-5" aria-labelledby="saved-plans-title">
      <div className="flex items-baseline justify-between gap-3"><h2 id="saved-plans-title" className="font-serif text-2xl">{t("savedJourneys")}</h2><span className="text-xs text-ink/55">{t("private")}</span></div>
      {itineraryError ? <p role="status" className="mt-3 text-sm text-vermilion">{t("refreshError")}</p> : null}
      <ul className="mt-4 divide-y divide-ink/10">{itineraries.map((itinerary) => <li key={itinerary.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="font-medium">{itinerary.name}</p><p className="mt-1 text-xs text-ink/55">{itinerary.start_date ?? t("datesUnset")}{itinerary.end_date ? ` – ${itinerary.end_date}` : ""} · {itinerary.status}</p></div>
        <Link className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-vermilion" href={`/traveler/plan/${itinerary.id}`}>{t("openJourney")} <ArrowRight className="size-4" /></Link>
      </li>)}</ul>
    </section> : null}
    <ItineraryBuilder destinations={destinationResult.ok ? destinationResult.data : []} isAuthenticated={isTraveler} restoreGuest={params.restoreGuest === "1"} />
    {!destinationResult.ok ? <p role="status" className="mt-4 text-sm text-vermilion">{t("catalogueError")}</p> : null}
  </div>;
  return isTraveler ? <WorkspaceShell role="traveler" basePath="/traveler">{content}</WorkspaceShell> : <><SkipLink /><SiteHeader /><main id="main-content" className="container-editorial py-16 sm:py-20">{content}</main><SiteFooter /></>;
}
