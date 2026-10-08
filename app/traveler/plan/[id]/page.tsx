import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ItineraryManager, type ManagedItem, type ManagedItinerary } from "@/components/itinerary-manager";
import { requireRole } from "@/server/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved journey" };

export default async function SavedPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireRole(["traveler"]);
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: itinerary }, { data: rows, error: itemError }] = await Promise.all([
    supabase.from("itineraries").select("id,name,start_date,end_date,budget_jpy,visibility,share_token")
      .eq("id", id).eq("traveler_id", user.id).maybeSingle(),
    supabase.from("itinerary_items").select("id,title,item_type,starts_at,ends_at,sequence,rationale,estimated_cost_jpy,cost_status,cultural_context_snapshot,transport_estimate,data_status,booking_mode,availability_status,destination_health_score,destination_health_status,recommendation_score,interest_compatibility,source_name,source_url,source_verified_at,availability_checked_at,suggestion_origin,destination_id")
      .eq("itinerary_id", id).order("sequence").limit(100),
  ]);
  if (!itinerary) notFound();
  const destinationIds = [...new Set((rows ?? []).flatMap((item) => item.destination_id ? [item.destination_id] : []))];
  const { data: destinations } = destinationIds.length
    ? await supabase.from("destinations").select("id,name").in("id", destinationIds)
    : { data: [] };
  const destinationNames = new Map((destinations ?? []).map((destination) => [destination.id, destination.name]));
  const managedItems: ManagedItem[] = (rows ?? []).map((item) => ({
    ...item, destination_name: item.destination_id ? destinationNames.get(item.destination_id) ?? null : null,
    transport_estimate: item.transport_estimate && typeof item.transport_estimate === "object" && !Array.isArray(item.transport_estimate)
      ? item.transport_estimate as ManagedItem["transport_estimate"] : { status: "unavailable" },
  }));
  const managedItinerary: ManagedItinerary = {
    id: itinerary.id, name: itinerary.name, start_date: itinerary.start_date, end_date: itinerary.end_date,
    budget_jpy: itinerary.budget_jpy, visibility: itinerary.visibility, share_token: itinerary.share_token,
  };

  return <WorkspaceShell role="Traveler" basePath="/traveler"><article className="mx-auto max-w-4xl">
    <Link href="/traveler/plan" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-vermilion"><ArrowLeft className="size-4" />All journeys</Link>
    <p className="eyebrow mt-7">Saved journey · {itinerary.visibility}</p>
    <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{itinerary.name}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">Source, availability, health, and route details are snapshots from when this journey was saved. MICHI does not reserve a place unless you complete a separate booking.</p>
    {itemError ? <p role="alert" className="mt-6 border-l-2 border-vermilion bg-[#fbf1ed] p-3 text-sm">Journey items could not load.</p> : null}
    <ItineraryManager itinerary={managedItinerary} initialItems={managedItems} />
  </article></WorkspaceShell>;
}
