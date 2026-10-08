import { describe, expect, it } from "vitest";
import { rankRecommendations } from "@/features/recommendations/engine";
import { recommendationFeedbackSchema, recommendationPreferencesSchema } from "@/features/recommendations/schemas";
import type { RecommendationCandidate, RecommendationPreferences } from "@/features/recommendations/types";

const preferences: RecommendationPreferences = {
  interests: ["craft"],
  budgetJpy: 20_000,
  startDate: "2026-11-01",
  endDate: "2026-11-03",
  regions: [],
  pace: "balanced",
  accessibility: {},
  dietaryPreferences: [],
  languages: [],
  culturalInterests: ["craft"],
  crowdTolerance: 60,
};

const candidate = (overrides: Partial<RecommendationCandidate> = {}): RecommendationCandidate => ({
  id: "00000000-0000-4000-8000-000000000001",
  slug: "craft-workshop",
  title: "Craft workshop",
  shortDescription: "A host-led craft session.",
  destinationId: "00000000-0000-4000-8000-000000000002",
  destinationName: "Kanazawa",
  region: "Hokuriku",
  priceJpy: 10_000,
  durationMinutes: 90,
  interests: ["craft"],
  languages: ["English"],
  accessibility: {},
  dietaryOptions: [],
  culturalContext: "The host explains the workshop context.",
  participationRules: "Follow the guide's instructions.",
  cancellationRules: "Contact the host before cancellation.",
  photographyPolicy: "ask_host",
  status: "published",
  isVerified: true,
  isPaused: false,
  slots: [{ id: "00000000-0000-4000-8000-000000000011", startsAt: "2026-11-01T02:00:00.000Z", endsAt: "2026-11-01T03:30:00.000Z", capacity: 8, bookedCount: 2, status: "open" }],
  destinationHealth: {
    score: 80,
    status: "Healthy",
    explanation: "Current source-backed inputs.",
    componentScores: { crowdPressure: 10, remainingCapacity: 80, communityReadiness: 80, transportAccessibility: 80, seasonalSuitability: 80 },
    availableComponentScores: { crowdPressure: 10, remainingCapacity: 80, communityReadiness: 80, transportAccessibility: 80, seasonalSuitability: 80 },
    missingComponents: [],
    contributions: [],
    dataProvenance: [],
    simulationStatus: "live",
    lastUpdated: "2026-10-20T00:00:00.000Z",
  },
  sourceMetadata: {
    experience: { sourceType: "host_provided", verified: true },
    destination: { sourceName: "Official tourism source", sourceUrl: "https://tourism.example/kanazawa", verifiedAt: "2026-10-20T00:00:00.000Z" },
  },
  ...overrides,
});

describe("rankRecommendations", () => {
  it("calculates the specified weighted score and explainable factors deterministically", () => {
    const result = rankRecommendations(preferences, [candidate()]);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(93.5);
    expect(result[0].componentScores).toEqual({ personalMatch: 100, culturalDepth: 100, localBenefit: 100, accessibilityMatch: 100, availability: 75, destinationHealth: 80 });
    expect(result[0].reasons).toContain("Craft interest");
    expect(result[0].reasons).toContain("Host capacity available for your dates");
    expect(result[0].reasons).toContain("Visitor pressure is within your selected tolerance");
  });

  it("breaks equal-score ties by stable experience ID, independent of input order", () => {
    const first = candidate({ id: "00000000-0000-4000-8000-000000000003" });
    const second = candidate({ id: "00000000-0000-4000-8000-000000000004" });
    expect(rankRecommendations(preferences, [second, first]).map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it("excludes paused, unpublished, unverified, over-budget, and out-of-region experiences", () => {
    const result = rankRecommendations({ ...preferences, budgetJpy: 9_999, regions: ["Kansai"] }, [
      candidate({ isPaused: true }), candidate({ status: "draft" }), candidate({ isVerified: false }), candidate(),
    ]);
    expect(result).toEqual([]);
  });

  it("reduces availability for full and closed slots and reports the tradeoff", () => {
    const result = rankRecommendations(preferences, [candidate({ slots: [
      { id: "00000000-0000-4000-8000-000000000012", startsAt: "2026-11-01T02:00:00.000Z", endsAt: "2026-11-01T03:30:00.000Z", capacity: 8, bookedCount: 8, status: "full" },
      { id: "00000000-0000-4000-8000-000000000013", startsAt: "2026-11-02T02:00:00.000Z", endsAt: "2026-11-02T03:30:00.000Z", capacity: 8, bookedCount: 4, status: "open" },
      { id: "00000000-0000-4000-8000-000000000014", startsAt: "2026-11-03T02:00:00.000Z", endsAt: "2026-11-03T03:30:00.000Z", capacity: 8, bookedCount: 0, status: "cancelled" },
    ] })]);
    expect(result[0].componentScores.availability).toBe(17);
    expect(result[0].tradeoffs).toContain("Some requested date slots are full or unavailable.");
  });

  it("interprets traveler dates in Japan local time", () => {
    const result = rankRecommendations(preferences, [candidate({ slots: [
      { id: "00000000-0000-4000-8000-000000000015", startsAt: "2026-10-31T14:00:00.000Z", endsAt: "2026-10-31T15:30:00.000Z", capacity: 8, bookedCount: 8, status: "full" },
      { id: "00000000-0000-4000-8000-000000000016", startsAt: "2026-10-31T16:00:00.000Z", endsAt: "2026-10-31T17:30:00.000Z", capacity: 8, bookedCount: 4, status: "open" },
    ] })]);
    expect(result[0].componentScores.availability).toBe(50);
  });

  it("reweights known factors and marks missing destination health as unknown", () => {
    const [result] = rankRecommendations(preferences, [candidate({ destinationHealth: { ...candidate().destinationHealth, score: null, status: "Unavailable", componentScores: null, simulationStatus: "unavailable" } })]);
    expect(result.recommendationConfidence).toBe("partial");
    expect(result.evidenceCompleteness).toBe(80);
    expect(result.componentScores.destinationHealth).toBeNull();
    expect(result.reasons).not.toContain("Visitor pressure is within your selected tolerance");
  });

  it("requires a real open slot and confirmed requested access", () => {
    expect(rankRecommendations(preferences, [candidate({ slots: [] })])).toEqual([]);
    expect(rankRecommendations({ ...preferences, accessibility: { step_free: true } }, [candidate()])).toEqual([]);
  });

  it("uses language, dietary, accessibility, and crowd preferences in the score", () => {
    const result = rankRecommendations({
      ...preferences,
      languages: ["English", "Japanese"],
      dietaryPreferences: ["vegetarian"],
      accessibility: { step_free: true },
      crowdTolerance: 5,
    }, [candidate({
      languages: ["English"],
      dietaryOptions: ["vegetarian"],
      accessibility: { step_free: true },
      destinationHealth: { ...candidate().destinationHealth, componentScores: { ...candidate().destinationHealth.componentScores!, crowdPressure: 50 } },
    })]);
    expect(result[0].componentScores.personalMatch).toBe(81);
    expect(result[0].componentScores.accessibilityMatch).toBe(100);
    expect(result[0].tradeoffs).toContain("Visitor pressure is above your selected crowd tolerance.");
  });
});

describe("recommendation request schemas", () => {
  it("accepts validated traveler input and rejects invalid dates or extra fields", () => {
    expect(recommendationPreferencesSchema.safeParse(preferences).success).toBe(true);
    expect(recommendationPreferencesSchema.safeParse({ ...preferences, startDate: "2026-02-31" }).success).toBe(false);
    expect(recommendationPreferencesSchema.safeParse({ ...preferences, admin: true }).success).toBe(false);
  });

  it("accepts only accepted or rejected decisions for UUID-backed recommendations", () => {
    const input = {
      recommendationLogId: "00000000-0000-4000-8000-000000000001",
      experienceId: "00000000-0000-4000-8000-000000000002",
      decision: "accepted",
    };
    expect(recommendationFeedbackSchema.safeParse(input).success).toBe(true);
    expect(recommendationFeedbackSchema.safeParse({ ...input, decision: "maybe" }).success).toBe(false);
  });
});
