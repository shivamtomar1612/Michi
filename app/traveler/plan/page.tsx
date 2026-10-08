import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ItineraryBuilder } from "@/components/itinerary-builder";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { listDestinations } from "@/server/data/catalogue";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Plan a journey" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ restoreGuest?: string }> }) {
  const params = await searchParams;
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
    <p className="eyebrow">{isTraveler ? "Traveler workspace" : "Open itinerary preview"}</p>
    <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">Plan a more considered journey.</h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/65">MICHI scores eligible, verified records first. Gemini can arrange those database candidates, but it cannot add experiences or make up availability, health, prices, or travel times.</p>
    {params.restoreGuest === "1" ? <div className="mt-6 border-l-2 border-moss bg-moss/5 p-4 text-sm" role="status">Your guest itinerary is ready to review. Choose “Save this journey” below when you are ready to add it to your account.</div> : null}
    {isTraveler && itineraries?.length ? <section className="mt-8 border-y border-ink/15 py-5" aria-labelledby="saved-plans-title">
      <div className="flex items-baseline justify-between gap-3"><h2 id="saved-plans-title" className="font-serif text-2xl">Your saved journeys</h2><span className="text-xs text-ink/55">Private unless you choose to share</span></div>
      {itineraryError ? <p role="status" className="mt-3 text-sm text-vermilion">Saved journeys could not be refreshed.</p> : null}
      <ul className="mt-4 divide-y divide-ink/10">{itineraries.map((itinerary) => <li key={itinerary.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="font-medium">{itinerary.name}</p><p className="mt-1 text-xs text-ink/55">{itinerary.start_date ?? "Dates not set"}{itinerary.end_date ? ` – ${itinerary.end_date}` : ""} · {itinerary.status}</p></div>
        <Link className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-vermilion" href={`/traveler/plan/${itinerary.id}`}>Open journey <ArrowRight className="size-4" /></Link>
      </li>)}</ul>
    </section> : null}
    <ItineraryBuilder destinations={destinationResult.ok ? destinationResult.data : []} isAuthenticated={isTraveler} restoreGuest={params.restoreGuest === "1"} />
    {!destinationResult.ok ? <p role="status" className="mt-4 text-sm text-vermilion">Verified destinations could not load. Planning will be available when the source-backed catalogue responds.</p> : null}
  </div>;
  return isTraveler ? <WorkspaceShell role="Traveler" basePath="/traveler">{content}</WorkspaceShell> : <><SiteHeader /><main id="main-content" className="container-editorial py-16 sm:py-20">{content}</main><SiteFooter /></>;
}
