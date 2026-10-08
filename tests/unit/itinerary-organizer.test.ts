import { describe, expect, it } from "vitest";
import { deterministicPlanOrder, stableJson, validateOrganizerOrder } from "@/features/itineraries/organizer";
import { itineraryGenerateSchema, saveItinerarySchema } from "@/features/itineraries/schemas";

const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
const candidates = [
  { id: a, score: 83, reasons: ["Craft match", "Host rules available"] },
  { id: b, score: 91, reasons: ["Food match"] },
];

describe("itinerary candidate organization", () => {
  it("uses deterministic score and stable ID tie breaking", () => {
    expect(deterministicPlanOrder(candidates).map(({ id }) => id)).toEqual([b, a]);
    expect(deterministicPlanOrder([{ ...candidates[1], score: 83 }, candidates[0]]).map(({ id }) => id)).toEqual([a, b]);
  });

  it("accepts only a complete, unique list of supplied candidate IDs and reason choices", () => {
    expect(validateOrganizerOrder(candidates, [
      { candidateId: b, reasonIndex: 0 }, { candidateId: a, reasonIndex: 1 },
    ])?.map(({ explanation }) => explanation)).toEqual(["Food match", "Host rules available"]);
    expect(validateOrganizerOrder(candidates, [{ candidateId: "00000000-0000-4000-8000-000000000099", reasonIndex: 0 }])).toBeNull();
    expect(validateOrganizerOrder(candidates, [{ candidateId: a, reasonIndex: 0 }, { candidateId: a, reasonIndex: 1 }])).toBeNull();
    expect(validateOrganizerOrder(candidates, [{ candidateId: a, reasonIndex: 99 }, { candidateId: b, reasonIndex: 0 }])).toBeNull();
    expect(validateOrganizerOrder(candidates, [{ candidateId: a, reasonIndex: 0 }])).toBeNull();
  });

  it("compares nested request context independent of object key order", () => {
    expect(stableJson({ b: [1, { y: true, x: "x" }], a: null }))
      .toBe(stableJson({ a: null, b: [1, { x: "x", y: true }] }));
  });
});

describe("itinerary request schemas", () => {
  const preferences = { interests: ["craft"], budgetJpy: null, startDate: "2027-03-01", endDate: "2027-03-04", regions: [], pace: "balanced", accessibility: {}, dietaryPreferences: [], languages: [], culturalInterests: ["craft"], crowdTolerance: 50 };
  it("validates both account-linked and guest plan contexts", () => {
    const valid = { recommendationLogId: a, startDestinationId: b, preferences, travelStyle: "balanced" };
    expect(itineraryGenerateSchema.safeParse(valid).success).toBe(true);
    expect(itineraryGenerateSchema.safeParse({ ...valid, recommendationLogId: null }).success).toBe(true);
    expect(itineraryGenerateSchema.safeParse({ startDestinationId: b, preferences, travelStyle: "balanced" }).success).toBe(true);
    expect(itineraryGenerateSchema.safeParse({ ...valid, travelStyle: "reckless" }).success).toBe(false);
    expect(itineraryGenerateSchema.safeParse({ ...valid, preferences: { ...preferences, startDate: "2027-02-31" } }).success).toBe(false);
  });

  it("rejects duplicate or invalid candidate selections before persistence", () => {
    const base = { recommendationLogId: a, startDestinationId: b, preferences, travelStyle: "balanced", name: "Kyoto" };
    const choice = { candidateId: a, candidateType: "external_verified", slotId: null, suggestionOrigin: "original_preference" };
    expect(saveItinerarySchema.safeParse({ ...base, selected: [choice] }).success).toBe(true);
    expect(saveItinerarySchema.safeParse({ ...base, recommendationLogId: null, selected: [choice] }).success).toBe(true);
    expect(saveItinerarySchema.safeParse({ ...base, selected: [choice, choice] }).success).toBe(false);
    expect(saveItinerarySchema.safeParse({ ...base, selected: [{ ...choice, candidateType: "invented" }] }).success).toBe(false);
  });
});
