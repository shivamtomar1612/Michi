import type { Metadata } from "next";
import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { EmptyState } from "@/components/ui/states";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { requireRole } from "@/server/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { MapExplorer } from "@/components/map-explorer";
import { isValidCoordinates, straightLineDistanceKm, verifiedCoordinates } from "@/features/maps/geospatial";
import type { MapFallbackItem, MapPoint } from "@/features/maps/types";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";

export const metadata: Metadata = { title: "Traveler workspace" };
export default async function TravelerPage() {
  const { user } = await requireRole(["traveler"]);
  const supabase = await createClient();
  const { data: itineraries } = await supabase.from("itineraries").select("id,name")
    .eq("traveler_id", user.id).in("status", ["draft", "planned"]).order("updated_at", { ascending: false }).limit(1);
  const itinerary = itineraries?.[0];
  const { data: items } = itinerary
    ? await supabase.from("itinerary_items").select("id,title,item_type,sequence,destination_id,experience_id")
      .eq("itinerary_id", itinerary.id).order("sequence").limit(100)
    : { data: [] };
  const destinationIds = [...new Set((items ?? []).map((item) => item.destination_id).filter((id): id is string => Boolean(id)))];
  const experienceIds = [...new Set((items ?? []).map((item) => item.experience_id).filter((id): id is string => Boolean(id)))];
  const [destinationRows, experienceRows] = await Promise.all([
    destinationIds.length ? supabase.from("destinations").select("id,name,slug,latitude,longitude,coordinate_verified_at,next_verification_at")
      .in("id", destinationIds).eq("status", "published").eq("verification_status", "verified_official").eq("data_status", "official_tourism") : Promise.resolve({ data: [] }),
    experienceIds.length ? supabase.from("experiences").select("id,title,destination_id,latitude,longitude,meeting_point,is_verified,status,is_paused")
      .in("id", experienceIds).eq("is_verified", true).eq("status", "published").eq("is_paused", false) : Promise.resolve({ data: [] }),
  ]);
  const health = await getDestinationHealthForDestinations(destinationIds);
  const destinationById = new Map((destinationRows.data ?? []).map((item) => [item.id, item]));
  const experienceById = new Map((experienceRows.data ?? []).map((item) => [item.id, item]));
  const itineraryPoints: MapPoint[] = (items ?? []).flatMap((item) => {
    const destination = item.destination_id ? destinationById.get(item.destination_id) : undefined;
    const experience = item.experience_id ? experienceById.get(item.experience_id) : undefined;
    const coords = destination
      ? verifiedCoordinates({ latitude: destination.latitude, longitude: destination.longitude, verifiedAt: destination.coordinate_verified_at })
      : experience && isValidCoordinates({ latitude: experience.latitude, longitude: experience.longitude })
        ? { latitude: Number(experience.latitude), longitude: Number(experience.longitude) }
        : null;
    if (!coords) return [];
    const placeDestinationId = destination?.id ?? experience?.destination_id;
    return [{
      id: item.id, name: item.title, kind: experience ? "meeting-point" as const : "itinerary-stop" as const,
      ...coords, href: destination ? `/destinations/${destination.slug}` : undefined,
      destinationName: experience ? destinationById.get(experience.destination_id)?.name : undefined,
      healthStatus: placeDestinationId ? health[placeDestinationId]?.status ?? "Unavailable" : "Unavailable",
      healthScore: placeDestinationId ? health[placeDestinationId]?.score ?? null : null,
      whyShown: experience ? "Saved host experience. Its coordinate is host-provided; confirm the meeting point with the host." : "Saved verified destination stop.",
      locationLabel: experience?.meeting_point || (destination ? "Official destination coordinates" : undefined), sequence: item.sequence,
    }];
  });
  for (let index = 1; index < itineraryPoints.length; index += 1) {
    const previous = itineraryPoints[index - 1];
    const current = itineraryPoints[index];
    const distance = straightLineDistanceKm(previous, current);
    if (distance !== null) current.straightLineDistanceFromPreviousKm = distance;
  }
  const itineraryFallback: MapFallbackItem[] = (items ?? []).map((item) => ({
    id: item.id, name: item.title,
    description: item.item_type.replaceAll("_", " "),
    href: item.destination_id && destinationById.has(item.destination_id) ? `/destinations/${destinationById.get(item.destination_id)!.slug}` : undefined,
    locationAvailable: itineraryPoints.some((point) => point.id === item.id),
    locationLabel: item.experience_id ? "Host coordinate, if provided" : undefined,
  }));
  return <WorkspaceShell role="Traveler" basePath="/traveler"><div className="mx-auto max-w-4xl">
    <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-vermilion">Traveler workspace</p><h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">Make room for discovery.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-ink/65">Shape recommendations around your interests, pace, access needs, and comfort with crowds.</p>
    <RecommendationPanel />
    {itinerary ? <div className="mt-10"><MapExplorer title={itinerary.name} description="Stops follow your saved sequence. Google Maps calculates directions after you open them; MICHI does not show estimated travel times." points={itineraryPoints} fallbackItems={itineraryFallback} listTitle="Saved itinerary stops" directions /></div> : null}
    <div className="mt-8 border-t border-ink/10 pt-6"><p className="text-sm text-ink/65">Operate a cultural experience in Japan?</p><Link href="/traveler/host-application" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-vermilion">Apply to host on MICHI <ArrowRight className="size-4" /></Link></div>
    {!itinerary ? <div className="mt-10"><EmptyState title="Your journey starts with a point of view" description="There is no itinerary or booking on your account yet. Explore source-backed places and external operator listings." /><Link href="/discover" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-vermilion">Explore discovery <ArrowRight className="size-4" /></Link></div> : null}
    <div className="mt-10 flex gap-4 border-t border-ink/10 pt-6"><Compass className="mt-1 size-5 text-moss" /><p className="max-w-lg text-sm leading-6 text-ink/65">{itinerary ? "Your map only includes verified destination coordinates and host-provided coordinates for your own saved experiences." : "Create a guest itinerary preview from Discover, or use this account to save journeys, manage bookings, and keep your Cultural Passport."}</p></div>
  </div></WorkspaceShell>;
}
