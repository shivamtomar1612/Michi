export const CULTURAL_CATEGORIES = [
  "etiquette", "photography", "temple_shrine", "onsen", "food", "restaurant",
  "transport", "public_behavior", "traditional_craft", "history", "architecture",
  "festival", "accessibility", "dietary", "language", "local_custom", "host_rule",
  "safety", "opening_information",
] as const;

export type CulturalCategory = (typeof CULTURAL_CATEGORIES)[number];
export type VerificationStatus = "official_verified" | "community_verified" | "pending_review" | "rejected" | "unverified";
export type CulturalSourceType = "government" | "national_tourism_board" | "prefecture" | "municipality" | "dmo" | "cultural_institution" | "temple_shrine" | "museum" | "host" | "editorial";
export type CulturalConfidence = "high" | "medium" | "low";

export interface CulturalEvidenceRecord {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  category?: CulturalCategory | null;
  subcategory?: string | null;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: CulturalSourceType;
  authorityLevel: number;
  verificationStatus: VerificationStatus;
  destinationId?: string | null;
  experienceId?: string | null;
  language?: string | null;
  locationScope?: Record<string, unknown> | null;
  effectiveFrom?: string | null;
  lastVerifiedAt?: string | null;
  nextVerificationAt?: string | null;
  isTimeSensitive?: boolean;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  semanticSimilarity?: number;
}

export interface CulturalQuery {
  query: string;
  destinationId?: string;
  experienceId?: string;
  category?: CulturalCategory;
  language?: string;
  limit?: number;
}

export interface RankedEvidence extends CulturalEvidenceRecord {
  score: number;
  sourcePriority: number;
  stale: boolean;
  confidence: CulturalConfidence;
  matchedTerms: string[];
  limitations: string[];
}
