import { verifiedCoordinates } from "./geospatial";
import type { MapFallbackItem, MapHealthStatus, MapPoint } from "./types";

type Destination = {
  id: string; name: string; slug: string; region: string; latitude: number | null; longitude: number | null;
  coordinate_verified_at: string | null; next_verification_at: string | null;
};
type Place = {
  id: string; destination_id: string; name: string; slug: string; latitude: number | null; longitude: number | null;
  coordinate_verified_at: string | null; next_verification_at: string | null; verification_status: string; address?: string | null;
};
type Experience = { id: string; title: string; slug: string; destination_id: string; place_id: string | null; };
type Health = { status: MapHealthStatus; score: number | null };
const isMapRecordStale = (nextVerificationAt: string | null) => Boolean(nextVerificationAt && Date.parse(nextVerificationAt) < Date.now());

export function buildCatalogueMapData({
  destinations,
  places = [],
  experiences = [],
  healthByDestination = {},
  alternativeIds = [],
}: {
  destinations: Destination[];
  places?: Place[];
  experiences?: Experience[];
  healthByDestination?: Record<string, Health>;
  alternativeIds?: string[];
}): { points: MapPoint[]; fallbackItems: MapFallbackItem[] } {
  const alternatives = new Set(alternativeIds);
  const placesById = new Map(places.map((place) => [place.id, place]));
  const experiencesByPlace = new Map<string, string[]>();
  for (const experience of experiences) {
    if (!experience.place_id) continue;
    experiencesByPlace.set(experience.place_id, [...(experiencesByPlace.get(experience.place_id) ?? []), experience.title]);
  }

  const destinationPoints = destinations.flatMap((destination) => {
    const coordinates = !isMapRecordStale(destination.next_verification_at)
      ? verifiedCoordinates({ latitude: destination.latitude, longitude: destination.longitude, verifiedAt: destination.coordinate_verified_at })
      : null;
    const health = healthByDestination[destination.id];
    if (!coordinates) return [];
    return [{
      id: `destination:${destination.id}`, name: destination.name, kind: alternatives.has(destination.id) ? "alternative" as const : "destination" as const,
      ...coordinates, href: `/destinations/${destination.slug}`, healthStatus: health?.status ?? "Unavailable", healthScore: health?.score ?? null,
      experienceTitles: experiences.filter((experience) => experience.destination_id === destination.id).map((experience) => experience.title),
      whyShown: alternatives.has(destination.id)
        ? `A separately sourced region for comparison with ${destinations.find((item) => !alternatives.has(item.id))?.name ?? "the selected destination"}; this is not a personalized recommendation.`
        : "Officially sourced destination. No personalized recommendation is implied.",
      locationLabel: `${destination.region} · coordinate checked ${new Date(destination.coordinate_verified_at!).toLocaleDateString("en")}`,
    }];
  });

  const placePoints = places.flatMap((place) => {
    const coordinates = place.verification_status === "verified_official" && !isMapRecordStale(place.next_verification_at)
      ? verifiedCoordinates({ latitude: place.latitude, longitude: place.longitude, verifiedAt: place.coordinate_verified_at })
      : null;
    if (!coordinates) return [];
    const destination = destinations.find((item) => item.id === place.destination_id);
    return [{
      id: `place:${place.id}`, name: place.name, kind: "place" as const, ...coordinates,
      href: destination ? `/destinations/${destination.slug}` : undefined, destinationName: destination?.name,
      healthStatus: healthByDestination[place.destination_id]?.status ?? "Unavailable",
      healthScore: healthByDestination[place.destination_id]?.score ?? null,
      experienceTitles: experiencesByPlace.get(place.id) ?? [],
      whyShown: "Official place record with a checked coordinate. No personalized recommendation is implied.",
      locationLabel: "Official place coordinates",
    }];
  });

  const experiencePoints = experiences.flatMap((experience) => {
    if (!experience.place_id) return [];
    const place = placesById.get(experience.place_id);
    const coordinates = place && place.verification_status === "verified_official" && !isMapRecordStale(place.next_verification_at)
      ? verifiedCoordinates({ latitude: place.latitude, longitude: place.longitude, verifiedAt: place.coordinate_verified_at })
      : null;
    if (!place || !coordinates) return [];
    const destination = destinations.find((item) => item.id === experience.destination_id);
    return [{ id: `experience:${experience.id}`, name: experience.title, kind: "experience" as const, ...coordinates,
      href: `/experiences/${experience.slug}`, destinationName: destination?.name,
      healthStatus: healthByDestination[experience.destination_id]?.status ?? "Unavailable",
      healthScore: healthByDestination[experience.destination_id]?.score ?? null,
      whyShown: "External listing linked to its official place record. Availability is not integrated.",
      locationLabel: "Official place coordinates",
    }];
  });

  const fallbackItems: MapFallbackItem[] = [
    ...destinations.map((destination) => ({
      id: `destination:${destination.id}`, name: destination.name, href: `/destinations/${destination.slug}`,
      description: `${destination.region} · ${healthByDestination[destination.id]?.status ?? "Destination Health unavailable"}`,
      locationAvailable: destinationPoints.some((point) => point.id === `destination:${destination.id}`),
      locationLabel: destination.region,
    })),
    ...experiences.map((experience) => ({
      id: `experience:${experience.id}`, name: experience.title, href: `/experiences/${experience.slug}`,
      description: "Verified external listing · availability not integrated",
      locationAvailable: experiencePoints.some((point) => point.id === `experience:${experience.id}`),
      locationLabel: placesById.get(experience.place_id ?? "")?.name ?? undefined,
    })),
    ...places.filter((place) => !experiences.some((experience) => experience.place_id === place.id)).map((place) => ({
      id: `place:${place.id}`, name: place.name, href: destinations.find((item) => item.id === place.destination_id)
        ? `/destinations/${destinations.find((item) => item.id === place.destination_id)!.slug}` : undefined,
      description: `${place.verification_status.replaceAll("_", " ")} place`,
      locationAvailable: placePoints.some((point) => point.id === `place:${place.id}`), locationLabel: place.address ?? undefined,
    })),
  ];

  return { points: [...destinationPoints, ...placePoints, ...experiencePoints], fallbackItems };
}
