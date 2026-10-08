import {
  healthComponentKeys,
  type AlternativeRankingInput,
  type DestinationHealthResult,
  type HealthComponentKey,
  type HealthInput,
  type HealthSignal,
  type HealthStatus,
  type RankedAlternative,
} from "./types";

const weights: Record<HealthComponentKey, number> = {
  crowdPressure: 0.3,
  remainingCapacity: 0.25,
  communityReadiness: 0.2,
  transportAccessibility: 0.15,
  seasonalSuitability: 0.1,
};

function isUsableSignal(signal: HealthSignal | null, asOf: number): signal is HealthSignal {
  if (!signal || !Number.isFinite(signal.value) || signal.value < 0 || signal.value > 100) return false;
  if (signal.dataStatus && !["observed_official", "forecast_official", "operator_provided", "community_reported", "simulated_demo"].includes(signal.dataStatus)) return false;
  if (signal.dataStatus === "forecast_official" && signal.mode === "live") return false;
  if (signal.dataStatus === "simulated_demo" && signal.mode !== "simulated") return false;
  if (!(["live", "snapshot", "simulated"] as const).includes(signal.mode)) return false;
  const verifiedAt = Date.parse(signal.verifiedAt);
  const observedAt = Date.parse(signal.observedAt);
  if (!signal.sourceName.trim() || !signal.sourceType.trim() || (signal.sourceAuthority !== null && (!Number.isInteger(signal.sourceAuthority) || signal.sourceAuthority < 1 || signal.sourceAuthority > 5)) || !Number.isFinite(verifiedAt) || !Number.isFinite(observedAt) || verifiedAt > asOf || observedAt > asOf || verifiedAt < observedAt) return false;
  if (signal.retrievedAt && (!Number.isFinite(Date.parse(signal.retrievedAt)) || Date.parse(signal.retrievedAt) > asOf)) return false;
  try {
    const url = new URL(signal.sourceUrl);
    if (url.protocol !== "https:") return false;
  } catch {
    return false;
  }
  if (signal.truth === "stale" || signal.truth === "unverified") return false;
  return signal.mode === "simulated" ? signal.truth === "simulated" : signal.truth !== "simulated";
}

function classifyHealth(score: number): HealthStatus {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate Pressure";
  if (score >= 20) return "High Pressure";
  return "Critical Pressure";
}

export function calculateDestinationHealth(input: HealthInput, asOf: string | Date = new Date()): DestinationHealthResult {
  const signals = healthComponentKeys.map((key) => input[key]);
  const asOfTimestamp = typeof asOf === "string" ? Date.parse(asOf) : asOf.getTime();
  const valid = Number.isFinite(asOfTimestamp) ? healthComponentKeys.filter((key) => isUsableSignal(input[key], asOfTimestamp)) : [];
  const scoreable = valid.filter((key) => input[key]?.mode !== "simulated" && input[key]?.truth !== "simulated");
  const missingComponents = healthComponentKeys.filter((key) => !scoreable.includes(key));
  const availableComponentScores = Object.fromEntries(scoreable.map((key) => [key, input[key]!.value])) as Partial<Record<HealthComponentKey, number>>;
  const provenance = valid.map((component) => ({
    component, sourceName: input[component]!.sourceName, sourceUrl: input[component]!.sourceUrl,
    sourceType: input[component]!.sourceType, sourceAuthority: input[component]!.sourceAuthority,
    verifiedAt: input[component]!.verifiedAt, observedAt: input[component]!.observedAt,
    truth: input[component]!.truth, dataStatus: input[component]!.dataStatus,
    retrievedAt: input[component]!.retrievedAt,
  }));
  const oldestInput = valid.length ? new Date(Math.min(...valid.map((key) => Date.parse(input[key]!.observedAt)))).toISOString() : null;
  if (missingComponents.length) return {
    score: null, status: "Unavailable", componentScores: null, availableComponentScores,
    missingComponents, contributions: [], dataProvenance: provenance,
    simulationStatus: valid.some((key) => input[key]!.mode === "simulated") ? "simulated" : "unavailable",
    lastUpdated: oldestInput,
    explanation: `A complete verified Health Score is unavailable. Missing or unsuitable inputs: ${missingComponents.join(", ")}. Available evidence is shown separately.`,
  };

  const componentScores = Object.fromEntries(healthComponentKeys.map((key) => [key, input[key]!.value])) as Record<HealthComponentKey, number>;

  const contributions = healthComponentKeys.map((key) => ({
    key,
    value: input[key]!.value,
    contribution: (key === "crowdPressure" ? 100 - input[key]!.value : input[key]!.value) * weights[key],
    weight: weights[key],
  }));
  const rawScore = contributions.reduce((total, component) => total + component.contribution, 0);
  const score = Math.round(rawScore * 10) / 10;
  const status = classifyHealth(score);
  const timestamps = signals.map((signal) => Date.parse(signal!.observedAt));
  const completeOldest = new Date(Math.min(...timestamps)).toISOString();
  const simulationStatus = signals.some((signal) => signal!.mode === "snapshot") ? "snapshot" : "live";
  const lowest = [...contributions].sort((a, b) => a.contribution - b.contribution)[0];
  const explanations: Record<HealthComponentKey, string> = {
    crowdPressure: `Visitor pressure is the main factor lowering this score (${input.crowdPressure!.value}/100).`,
    remainingCapacity: `Available capacity is the main factor lowering this score (${input.remainingCapacity!.value}/100).`,
    communityReadiness: `Community readiness is the main factor lowering this score (${input.communityReadiness!.value}/100).`,
    transportAccessibility: `Transport accessibility is the main factor lowering this score (${input.transportAccessibility!.value}/100).`,
    seasonalSuitability: `Seasonal suitability is the main factor lowering this score (${input.seasonalSuitability!.value}/100).`,
  };

  return {
    score,
    status,
    explanation: `Calculated from five source-backed inputs. ${explanations[lowest.key]}`,
    componentScores,
    availableComponentScores,
    missingComponents,
    contributions,
    dataProvenance: provenance,
    simulationStatus,
    lastUpdated: completeOldest,
  };
}

function inRange(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function jaccardSimilarity(left: string[], right: string[]): number {
  const a = new Set(left.map((item) => item.trim().toLocaleLowerCase()).filter(Boolean));
  const b = new Set(right.map((item) => item.trim().toLocaleLowerCase()).filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return (intersection / union) * 100;
}

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const arc = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

const alternativeWeights = {
  interest: 0.2,
  culture: 0.2,
  geography: 0.1,
  capacity: 0.15,
  accessibility: 0.1,
  community: 0.15,
  health: 0.1,
} as const;

export function rankDestinationAlternatives(input: AlternativeRankingInput): RankedAlternative[] {
  const origin = input.preferred;
  if (!origin || origin.latitude === null || origin.longitude === null || !input.interests.length || !inRange(input.accessibilityMinimum)) return [];
  if (!Number.isFinite(origin.latitude) || origin.latitude < -90 || origin.latitude > 90 || !Number.isFinite(origin.longitude) || origin.longitude < -180 || origin.longitude > 180) return [];

  return input.candidates.flatMap((candidate) => {
    if (candidate.id === origin.id || candidate.latitude === null || candidate.longitude === null) return [];
    if (!Number.isFinite(candidate.latitude) || candidate.latitude < -90 || candidate.latitude > 90 || !Number.isFinite(candidate.longitude) || candidate.longitude < -180 || candidate.longitude > 180) return [];
    const factors = [candidate.culturalRelevance, candidate.remainingCapacity, candidate.accessibility, candidate.communityReadiness, candidate.healthScore];
    if (!factors.every(inRange) || candidate.accessibility < input.accessibilityMinimum) return [];
    const distanceKm = haversineKm({ latitude: origin.latitude!, longitude: origin.longitude! }, { latitude: candidate.latitude, longitude: candidate.longitude });
    const geography = Math.max(0, 100 - (distanceKm / 3));
    const score = Math.round((
      jaccardSimilarity(input.interests, candidate.interests) * alternativeWeights.interest
      + candidate.culturalRelevance * alternativeWeights.culture
      + geography * alternativeWeights.geography
      + candidate.remainingCapacity * alternativeWeights.capacity
      + candidate.accessibility * alternativeWeights.accessibility
      + candidate.communityReadiness * alternativeWeights.community
      + candidate.healthScore * alternativeWeights.health
    ) * 10) / 10;
    return [{ ...candidate, score, distanceKm: Math.round(distanceKm * 10) / 10 }];
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function buildResponsibleNudge(destinationName: string, health: DestinationHealthResult, alternativeCount: number): string | null {
  if (health.score === null || health.componentScores === null) return null;
  if (health.componentScores.crowdPressure < 60) return null;
  if (alternativeCount > 0) return `${destinationName} is experiencing high visitor pressure in the latest verified reading. You can still visit, and MICHI found culturally relevant alternatives with greater available capacity.`;
  return `${destinationName} is experiencing high visitor pressure in the latest verified reading. You can still visit. MICHI does not have enough verified evidence to recommend an alternative right now.`;
}
