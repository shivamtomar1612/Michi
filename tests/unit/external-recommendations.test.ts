import { describe, expect, it } from "vitest";
import { matchExternalExperiences, type ExternalDiscoveryCandidate } from "@/features/recommendations/external";
import type { RecommendationPreferences } from "@/features/recommendations/types";

const preferences: RecommendationPreferences = {
  interests: ["craft"], budgetJpy: 10000, startDate: "2026-11-01", endDate: "2026-11-02",
  regions: [], pace: "balanced", accessibility: {}, dietaryPreferences: [], languages: [],
  culturalInterests: [], crowdTolerance: 40,
};
const candidate: ExternalDiscoveryCandidate = {
  id: "a", slug: "real-workshop", title: "Pottery workshop", shortDescription: "A traditional craft workshop",
  category: "craft", destinationName: "Kanazawa", region: "Hokuriku",
  officialUrl: "https://operator.example/workshop", sourceUrl: "https://official.example/workshop",
  sourceName: "Official listing", lastVerifiedAt: "2026-10-07T00:00:00Z",
  nextVerificationAt: "2026-10-14T00:00:00Z", verificationStatus: "verified_primary",
  bookingMode: "external", externalBookingUrl: null, priceMinJpy: null, accessibilityStatus: "unknown",
};
const now = new Date("2026-10-08T00:00:00Z");

describe("verified external discovery", () => {
  it("returns an interest match without inventing availability or health", () => {
    const [match] = matchExternalExperiences(preferences, [candidate], now);
    expect(match.interestCompatibility).toBe(100);
    expect(match.availabilityStatus).toBe("not_integrated");
    expect(match.destinationHealthStatus).toBe("unavailable");
    expect(match.missingInformation).toContain("Date-specific availability is not integrated");
  });
  it("does not imply confirmed access from unknown access", () => {
    expect(matchExternalExperiences({ ...preferences, accessibility: { step_free: true } }, [candidate], now)).toEqual([]);
  });
  it("excludes stale, insecure, over-budget, and unrelated listings", () => {
    expect(matchExternalExperiences(preferences, [
      { ...candidate, id: "stale", nextVerificationAt: "2026-10-07T00:00:00Z" },
      { ...candidate, id: "insecure", officialUrl: "http://operator.example/workshop" },
      { ...candidate, id: "over-budget", priceMinJpy: 10001 },
      { ...candidate, id: "unrelated", title: "Garden walk", category: "garden", shortDescription: "A botanical walk" },
    ], now)).toEqual([]);
  });
  it("orders equal matches deterministically", () => {
    expect(matchExternalExperiences(preferences, [{ ...candidate, id: "b" }, candidate], now).map((x) => x.id)).toEqual(["a", "b"]);
  });
});
