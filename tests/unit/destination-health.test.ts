import { describe, expect, it } from "vitest";
import { buildResponsibleNudge, calculateDestinationHealth, rankDestinationAlternatives } from "@/features/destination-health/engine";
import type { HealthInput, AlternativeCandidate } from "@/features/destination-health/types";

const makeInput = (overrides: Partial<HealthInput> = {}): HealthInput => ({
  crowdPressure: { value: 20, mode: "live", sourceName: "City source", sourceUrl: "https://city.example/health", sourceType: "official_city_tourism", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
  remainingCapacity: { value: 80, mode: "live", sourceName: "City source", sourceUrl: "https://city.example/capacity", sourceType: "official_city_tourism", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
  communityReadiness: { value: 70, mode: "live", sourceName: "Community source", sourceUrl: "https://community.example/readiness", sourceType: "community_feedback", sourceAuthority: null, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "community" },
  transportAccessibility: { value: 60, mode: "live", sourceName: "Transit source", sourceUrl: "https://transit.example/access", sourceType: "official_transit", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
  seasonalSuitability: { value: 50, mode: "live", sourceName: "Season source", sourceUrl: "https://season.example/suitability", sourceType: "official_city_tourism", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
  ...overrides,
});

describe("calculateDestinationHealth", () => {
  it("applies the weighted formula and reports component provenance", () => {
    const result = calculateDestinationHealth(makeInput());
    expect(result.score).toBe(72);
    expect(result.status).toBe("Good");
    expect(result.simulationStatus).toBe("live");
    expect(result.componentScores?.crowdPressure).toBe(20);
    expect(result.dataProvenance).toHaveLength(5);
    expect(result.lastUpdated).toBe(new Date("2026-10-07T10:00:00Z").toISOString());
  });

  it.each([
    [100, "Healthy"], [80, "Healthy"], [79, "Good"], [60, "Good"],
    [59, "Moderate Pressure"], [40, "Moderate Pressure"], [39, "High Pressure"],
    [20, "High Pressure"], [19, "Critical Pressure"], [0, "Critical Pressure"],
  ])("classifies score %s as %s", (score, status) => {
    const input = makeInput({
      crowdPressure: { value: 100 - Number(score), mode: "live", sourceName: "s", sourceUrl: "https://s.example", sourceType: "official", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
      remainingCapacity: { value: Number(score), mode: "live", sourceName: "s", sourceUrl: "https://s.example", sourceType: "official", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
      communityReadiness: { value: Number(score), mode: "live", sourceName: "s", sourceUrl: "https://s.example", sourceType: "official", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
      transportAccessibility: { value: Number(score), mode: "live", sourceName: "s", sourceUrl: "https://s.example", sourceType: "official", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
      seasonalSuitability: { value: Number(score), mode: "live", sourceName: "s", sourceUrl: "https://s.example", sourceType: "official", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
    });
    expect(calculateDestinationHealth(input).status).toBe(status);
  });

  it("returns unavailable instead of calculating when any input or provenance is missing", () => {
    const result = calculateDestinationHealth(makeInput({ crowdPressure: null }));
    expect(result.score).toBeNull();
    expect(result.status).toBe("Unavailable");
    expect(result.simulationStatus).toBe("unavailable");
    expect(result.missingComponents).toEqual(["crowdPressure"]);
    expect(result.availableComponentScores.remainingCapacity).toBe(80);
    expect(result.dataProvenance).toHaveLength(4);
  });

  it("keeps a forecast distinct from a live observation", () => {
    const input = makeInput({ crowdPressure: { ...makeInput().crowdPressure!, dataStatus: "forecast_official", mode: "live" } });
    expect(calculateDestinationHealth(input).score).toBeNull();
    expect(calculateDestinationHealth(input).missingComponents).toContain("crowdPressure");
  });

  it("never labels any simulated component as live", () => {
    const input = makeInput({
      crowdPressure: { value: 20, mode: "simulated", sourceName: "Simulation", sourceUrl: "https://simulation.example", sourceType: "simulation", sourceAuthority: null, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "simulated" },
    });
    expect(calculateDestinationHealth(input).simulationStatus).toBe("simulated");
  });

  it("rejects a simulated value presented as official live data", () => {
    const input = makeInput({
      crowdPressure: { value: 20, mode: "live", sourceName: "Simulation", sourceUrl: "https://simulation.example", sourceType: "simulation", sourceAuthority: null, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "simulated" },
    });
    expect(calculateDestinationHealth(input, "2026-10-08T10:00:00Z").score).toBeNull();
  });

  it("rejects future and out-of-order provenance timestamps", () => {
    const future = makeInput({
      crowdPressure: { value: 20, mode: "live", sourceName: "City source", sourceUrl: "https://city.example/health", sourceType: "official_city_tourism", sourceAuthority: 4, verifiedAt: "2026-10-09T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
    });
    expect(calculateDestinationHealth(future, "2026-10-08T10:00:00Z").score).toBeNull();

    const outOfOrder = makeInput({
      crowdPressure: { value: 20, mode: "live", sourceName: "City source", sourceUrl: "https://city.example/health", sourceType: "official_city_tourism", sourceAuthority: 4, verifiedAt: "2026-10-06T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
    });
    expect(calculateDestinationHealth(outOfOrder, "2026-10-08T10:00:00Z").score).toBeNull();
  });

  it("nudges at high pressure without blocking the preferred destination", () => {
    const health = calculateDestinationHealth(makeInput({
      crowdPressure: { value: 80, mode: "live", sourceName: "City source", sourceUrl: "https://city.example/health", sourceType: "official_city_tourism", sourceAuthority: 4, verifiedAt: "2026-10-07T10:00:00Z", observedAt: "2026-10-07T10:00:00Z", truth: "official" },
    }));
    expect(buildResponsibleNudge("Kyoto", health, 2)).toContain("You can still visit");
    expect(buildResponsibleNudge("Kyoto", health, 0)).toContain("does not have enough verified evidence");
  });
});

describe("rankDestinationAlternatives", () => {
  const candidate = (overrides: Partial<AlternativeCandidate> = {}): AlternativeCandidate => ({
    id: "candidate", name: "Alternative", interests: ["craft", "food"], culturalRelevance: 80,
    latitude: 35.7, longitude: 139.7, remainingCapacity: 70, accessibility: 80,
    communityReadiness: 75, healthScore: 80, ...overrides,
  });

  it("ranks relevant alternatives deterministically without excluding the preferred destination", () => {
    const result = rankDestinationAlternatives({
      preferred: { id: "popular", latitude: 35.68, longitude: 139.76 },
      interests: ["craft", "food"],
      accessibilityMinimum: 50,
      candidates: [candidate({ id: "lower", name: "Lower", healthScore: 60 }), candidate({ id: "higher", name: "Higher", healthScore: 90 })],
    });
    expect(result.map(({ id }) => id)).toEqual(["higher", "lower"]);
  });

  it("returns no alternative ranking if required evidence is incomplete", () => {
    expect(rankDestinationAlternatives({ preferred: null, interests: [], accessibilityMinimum: 0, candidates: [candidate()] })).toEqual([]);
  });
});
