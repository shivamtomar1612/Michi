import type { DestinationHealthResult, HealthComponentKey } from "@/features/destination-health/types";

export type TravelPace = "relaxed" | "balanced" | "active";

export interface RecommendationPreferences {
  interests: string[];
  budgetJpy: number | null;
  startDate: string;
  endDate: string;
  regions: string[];
  pace: TravelPace;
  accessibility: Record<string, boolean>;
  dietaryPreferences: string[];
  languages: string[];
  culturalInterests: string[];
  crowdTolerance: number;
}

export interface RecommendationSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  status: "open" | "full" | "cancelled" | "closed";
}

export interface RecommendationSourceMetadata {
  experience: { sourceType: "host_provided"; verified: boolean };
  destination: { sourceName: string; sourceUrl: string; verifiedAt: string | null };
}

export interface RecommendationCandidate {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  destinationId: string;
  destinationName: string;
  region: string;
  priceJpy: number;
  durationMinutes: number;
  interests: string[];
  languages: string[];
  accessibility: Record<string, unknown>;
  dietaryOptions: string[];
  culturalContext: string;
  participationRules: string;
  cancellationRules: string;
  photographyPolicy: string;
  status: "draft" | "published" | "paused" | "archived";
  isVerified: boolean;
  isPaused: boolean;
  slots: RecommendationSlot[];
  destinationHealth: DestinationHealthResult;
  sourceMetadata: RecommendationSourceMetadata;
}

export interface RecommendationComponentScores {
  personalMatch: number;
  culturalDepth: number;
  localBenefit: number;
  accessibilityMatch: number;
  availability: number;
  destinationHealth: number | null;
}

export interface ScoredRecommendation extends RecommendationCandidate {
  score: number;
  evidenceCompleteness: number;
  recommendationConfidence: "complete" | "partial";
  reasons: string[];
  tradeoffs: string[];
  componentScores: RecommendationComponentScores;
  healthProvenance: Array<{
    component: HealthComponentKey;
    sourceName: string;
    sourceUrl: string;
    verifiedAt: string;
    observedAt: string;
  }>;
}

export type RecommendationResult = Pick<ScoredRecommendation,
  | "id" | "slug" | "title" | "shortDescription" | "destinationId" | "destinationName" | "region"
  | "priceJpy" | "durationMinutes" | "score" | "reasons" | "tradeoffs" | "componentScores"
  | "evidenceCompleteness" | "recommendationConfidence"
  | "destinationHealth" | "sourceMetadata" | "healthProvenance" | "slots"
  | "participationRules" | "cancellationRules" | "photographyPolicy"
>;
