import "server-only";
import { matchExternalExperiences, type ExternalDiscoveryMatch } from "@/features/recommendations/external";
import type { RecommendationPreferences } from "@/features/recommendations/types";
import { listDestinations, listExternalExperiences } from "@/server/data/catalogue";

export async function getExternalRecommendations(preferences: RecommendationPreferences): Promise<{ ok: true; matches: ExternalDiscoveryMatch[] } | { ok: false }> {
  const [destinations, experiences] = await Promise.all([listDestinations(), listExternalExperiences()]);
  if (!destinations.ok || !experiences.ok) return { ok: false };
  const destinationById = new Map(destinations.data.map((item) => [item.id, item]));
  const candidates = experiences.data.flatMap((item) => {
    const destination = destinationById.get(item.destination_id);
    if (!destination || !item.source_name || !item.source_url || !item.last_verified_at) return [];
    return [{
      id: item.id, slug: item.slug, title: item.title, shortDescription: item.short_description ?? "",
      category: item.category, destinationName: destination.name, region: destination.region,
      officialUrl: item.official_url, sourceUrl: item.source_url, sourceName: item.source_name,
      lastVerifiedAt: item.last_verified_at, nextVerificationAt: item.next_verification_at,
      verificationStatus: item.verification_status as "verified_official" | "verified_primary",
      bookingMode: item.booking_mode, externalBookingUrl: item.external_booking_url,
      priceMinJpy: item.price_min_jpy, accessibilityStatus: item.accessibility_status,
    }];
  });
  return { ok: true, matches: matchExternalExperiences(preferences, candidates).slice(0, 30) };
}
