export const healthComponentKeys = [
  "crowdPressure",
  "remainingCapacity",
  "communityReadiness",
  "transportAccessibility",
  "seasonalSuitability",
] as const;

export type HealthComponentKey = (typeof healthComponentKeys)[number];
export type HealthStatus = "Healthy" | "Good" | "Moderate Pressure" | "High Pressure" | "Critical Pressure" | "Unavailable";
export type SignalTruth = "official" | "community" | "host" | "simulated" | "unverified" | "stale";
export type SignalMode = "live" | "snapshot" | "simulated";
export type HealthDataStatus = "observed_official" | "forecast_official" | "operator_provided" | "community_reported" | "modeled_estimate" | "simulated_demo" | "unavailable";

export interface HealthSignal {
  value: number;
  mode: SignalMode;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  sourceAuthority: number | null;
  verifiedAt: string;
  observedAt: string;
  truth: SignalTruth;
  dataStatus?: HealthDataStatus;
  retrievedAt?: string;
}

export type HealthInput = Record<HealthComponentKey, HealthSignal | null>;

export interface HealthComponentScore {
  key: HealthComponentKey;
  value: number;
  contribution: number;
  weight: number;
}

export interface HealthProvenance {
  component: HealthComponentKey;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  sourceAuthority: number | null;
  verifiedAt: string;
  observedAt: string;
  truth: SignalTruth;
  dataStatus?: HealthDataStatus;
  retrievedAt?: string;
}

export interface DestinationHealthResult {
  score: number | null;
  status: HealthStatus;
  explanation: string;
  componentScores: Record<HealthComponentKey, number> | null;
  availableComponentScores: Partial<Record<HealthComponentKey, number>>;
  missingComponents: HealthComponentKey[];
  contributions: HealthComponentScore[];
  dataProvenance: HealthProvenance[];
  simulationStatus: SignalMode | "unavailable";
  lastUpdated: string | null;
}

export interface AlternativeCandidate {
  id: string;
  name: string;
  interests: string[];
  culturalRelevance: number;
  latitude: number | null;
  longitude: number | null;
  remainingCapacity: number;
  accessibility: number;
  communityReadiness: number;
  healthScore: number;
}

export interface AlternativeRankingInput {
  preferred: { id: string; latitude: number | null; longitude: number | null } | null;
  interests: string[];
  accessibilityMinimum: number;
  candidates: AlternativeCandidate[];
}

export interface RankedAlternative extends AlternativeCandidate {
  score: number;
  distanceKm: number;
}
