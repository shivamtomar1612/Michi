import "server-only";
import { describeCatalogueError, type CatalogueFailure } from "@/lib/data-sources/catalogue-errors";
import { createClient } from "@/lib/supabase/server";
import { runCachedPublicQuery } from "@/server/data/public-catalogue-cache";

export interface PublicDestination {
  id: string;
  name: string;
  name_ja: string | null;
  slug: string;
  prefecture: string;
  region: string;
  city: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinate_source: string | null;
  coordinate_verified_at: string | null;
  source_name: string | null;
  source_url: string | null;
  source_type: string | null;
  source_authority: number | null;
  last_verified_at: string | null;
  next_verification_at: string | null;
  verification_status: string;
  data_status: string;
}

export interface PublicPlace {
  id: string;
  destination_id: string;
  name: string;
  name_ja: string | null;
  slug: string;
  place_type: string;
  short_description: string | null;
  official_url: string | null;
  address: string | null;
  opening_hours_text: string | null;
  opening_hours_verified_at: string | null;
  admission_text: string | null;
  accessibility_status: string;
  latitude: number | null;
  longitude: number | null;
  coordinate_source: string | null;
  coordinate_verified_at: string | null;
  source_name: string;
  source_url: string;
  source_type: string;
  source_authority: number;
  last_verified_at: string;
  next_verification_at: string | null;
  verification_status: string;
  data_status: string;
  image_usage_status: string;
}

export interface PublicExternalExperience {
  id: string;
  destination_id: string;
  place_id: string | null;
  operator_name: string;
  title: string;
  slug: string;
  short_description: string | null;
  category: string | null;
  duration_minutes: number | null;
  price_text: string | null;
  price_min_jpy: number | null;
  price_max_jpy: number | null;
  price_verified_at: string | null;
  external_booking_url: string | null;
  official_url: string;
  booking_mode: "external" | "information_only";
  listing_source: "external_official_listing";
  michi_booking_enabled: false;
  accessibility_status: string;
  image_usage_status: string;
  source_name: string;
  source_url: string;
  source_type: string;
  source_authority: number;
  last_verified_at: string;
  next_verification_at: string | null;
  verification_status: string;
  data_status: string;
}

export interface PublicMichiExperience {
  id: string; host_id: string; destination_id: string; title: string; slug: string;
  short_description: string; description: string; cultural_context: string; price_jpy: number;
  duration_minutes: number; max_capacity: number; accessibility: Record<string, unknown>;
  languages: string[]; interests: string[]; rules: Record<string, unknown>; photography_policy: string;
  booking_policy: Record<string, unknown>; meeting_point: string; latitude: number | null; longitude: number | null;
  image_paths: string[]; status: string; is_verified: boolean; is_paused: boolean; updated_at: string;
}

export type CatalogueResult<T> =
  | { ok: true; data: T }
  | ({ ok: false } & CatalogueFailure);

export async function listDestinations(): Promise<CatalogueResult<PublicDestination[]>> {
  return runCachedPublicQuery<PublicDestination>("destinations", (supabase) => supabase.from("destinations").select("*")
    .eq("status", "published").eq("verification_status", "verified_official")
    .eq("data_status", "official_tourism").order("name"));
}

export async function getDestination(slug: string): Promise<CatalogueResult<PublicDestination | null>> {
  const result = await listDestinations();
  return result.ok ? { ok: true, data: result.data.find((destination) => destination.slug === slug) ?? null } : result;
}

export async function listPlaces(destinationId?: string): Promise<CatalogueResult<PublicPlace[]>> {
  return runCachedPublicQuery<PublicPlace>(`places:${destinationId ?? "all"}`, (supabase) => {
    let query = supabase.from("places").select("*").eq("verification_status", "verified_official").eq("data_status", "official_tourism").order("name");
    if (destinationId) query = query.eq("destination_id", destinationId);
    return query;
  });
}

export async function getPlace(slug: string): Promise<CatalogueResult<PublicPlace | null>> {
  const result = await listPlaces();
  return result.ok ? { ok: true, data: result.data.find((place) => place.slug === slug) ?? null } : result;
}

export async function listExternalExperiences(): Promise<CatalogueResult<PublicExternalExperience[]>> {
  return runCachedPublicQuery<PublicExternalExperience>("external-experiences", (supabase) => supabase.from("external_experiences").select("*")
    .in("verification_status", ["verified_official", "verified_primary"])
    .in("data_status", ["verified_official", "verified_primary", "official_tourism"])
    .eq("michi_booking_enabled", false).order("title"));
}

export async function getExternalExperience(slug: string): Promise<CatalogueResult<PublicExternalExperience | null>> {
  const result = await listExternalExperiences();
  return result.ok ? { ok: true, data: result.data.find((experience) => experience.slug === slug) ?? null } : result;
}

export async function listMichiExperiences(): Promise<CatalogueResult<PublicMichiExperience[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("experiences").select("*")
      .eq("status", "published").eq("is_verified", true).eq("is_paused", false).order("title");
    if (error) return { ok: false, ...describeCatalogueError(error) };
    return { ok: true, data: (data ?? []) as unknown as PublicMichiExperience[] };
  } catch {
    return { ok: false, reason: "unavailable", message: "Connect the MICHI catalogue to view participating host experiences." };
  }
}

export async function getMichiExperience(slug: string): Promise<CatalogueResult<PublicMichiExperience | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("experiences").select("*")
      .eq("slug", slug).eq("status", "published").eq("is_verified", true).eq("is_paused", false).maybeSingle();
    if (error) return { ok: false, ...describeCatalogueError(error) };
    return { ok: true, data: data as unknown as PublicMichiExperience | null };
  } catch {
    return { ok: false, reason: "unavailable", message: "Connect the MICHI catalogue to view this host experience." };
  }
}
