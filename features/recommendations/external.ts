import type { RecommendationPreferences } from "./types";

export interface ExternalDiscoveryCandidate {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: string | null;
  destinationName: string;
  region: string;
  officialUrl: string;
  sourceUrl: string;
  sourceName: string;
  lastVerifiedAt: string;
  nextVerificationAt: string | null;
  verificationStatus: "verified_official" | "verified_primary";
  bookingMode: "external" | "information_only";
  externalBookingUrl: string | null;
  priceMinJpy: number | null;
  accessibilityStatus: string;
}

export interface ExternalDiscoveryMatch extends ExternalDiscoveryCandidate {
  pathway: "external_verified";
  interestCompatibility: number;
  matchedInterests: string[];
  availabilityStatus: "not_integrated";
  destinationHealthStatus: "unavailable";
  recommendationConfidence: "limited";
  missingInformation: string[];
}

const words = (value: string): string[] => value.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const validHttps = (value: string): boolean => {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};

/** Compatibility is interest overlap only. It is never a certainty or a health score. */
export function matchExternalExperiences(
  preferences: RecommendationPreferences,
  candidates: ExternalDiscoveryCandidate[],
  now = new Date(),
): ExternalDiscoveryMatch[] {
  const interests = [...new Set(preferences.interests.map((item) => item.toLocaleLowerCase().trim()).filter(Boolean))];
  if (!interests.length) return [];
  return candidates.flatMap((candidate) => {
    if (!validHttps(candidate.officialUrl) || !validHttps(candidate.sourceUrl)) return [];
    if (candidate.verificationStatus !== "verified_official" && candidate.verificationStatus !== "verified_primary") return [];
    if (!Number.isFinite(Date.parse(candidate.lastVerifiedAt)) || Date.parse(candidate.lastVerifiedAt) > now.getTime()) return [];
    if (candidate.nextVerificationAt && (!Number.isFinite(Date.parse(candidate.nextVerificationAt)) || Date.parse(candidate.nextVerificationAt) <= now.getTime())) return [];
    if (preferences.regions.length && !preferences.regions.some((region) => region.toLocaleLowerCase().trim() === candidate.region.toLocaleLowerCase().trim())) return [];
    if (preferences.budgetJpy !== null && candidate.priceMinJpy !== null && candidate.priceMinJpy > preferences.budgetJpy) return [];
    // Requested accessibility is a hard constraint. Unknown access is not confirmed access.
    if (Object.values(preferences.accessibility).some(Boolean)) return [];
    const searchable = new Set(words(`${candidate.title} ${candidate.category ?? ""} ${candidate.shortDescription}`));
    const matchedInterests = interests.filter((interest) => words(interest).every((word) => searchable.has(word)));
    if (!matchedInterests.length) return [];
    const missingInformation = ["Date-specific availability is not integrated", "Current Destination Health evidence is unavailable"];
    if (candidate.accessibilityStatus === "unknown") missingInformation.push("Accessibility has not been confirmed");
    if (candidate.priceMinJpy === null) missingInformation.push("Current price has not been confirmed");
    if (preferences.languages.length) missingInformation.push("Requested languages have not been confirmed");
    if (preferences.dietaryPreferences.length) missingInformation.push("Dietary accommodation has not been confirmed");
    return [{
      ...candidate,
      externalBookingUrl: candidate.externalBookingUrl && validHttps(candidate.externalBookingUrl) ? candidate.externalBookingUrl : null,
      pathway: "external_verified" as const,
      interestCompatibility: Math.round(100 * matchedInterests.length / interests.length),
      matchedInterests,
      availabilityStatus: "not_integrated" as const,
      destinationHealthStatus: "unavailable" as const,
      recommendationConfidence: "limited" as const,
      missingInformation,
    }];
  }).sort((a, b) => b.interestCompatibility - a.interestCompatibility || a.id.localeCompare(b.id));
}
