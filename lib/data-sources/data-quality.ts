import type { QualityLevel } from "./types";

interface QualityInput {
  authorityLevel: number;
  primarySource: boolean;
  presentFieldCount: number;
  expectedFieldCount: number;
  lastVerifiedAt: string | null;
  sensitivity: "low" | "medium" | "high" | "very_high";
  sourceSpecificity: number;
  now?: Date;
}

export function calculateDataQuality(input: QualityInput): QualityLevel {
  const now = input.now ?? new Date();
  const verifiedAt = input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : null;
  const ageDays = verifiedAt && !Number.isNaN(verifiedAt.valueOf()) ? (now.valueOf() - verifiedAt.valueOf()) / 86_400_000 : Number.POSITIVE_INFINITY;
  const maxAge = { low: 730, medium: 180, high: 30, very_high: 1 }[input.sensitivity];
  const authority = input.authorityLevel >= 4 || input.primarySource;
  const completeness = input.expectedFieldCount > 0 ? input.presentFieldCount / input.expectedFieldCount : 0;
  const fresh = ageDays <= maxAge;
  const specific = input.sourceSpecificity >= 0.7;
  if (authority && completeness >= 0.75 && fresh && specific) return "high";
  if ((authority || input.primarySource) && completeness >= 0.4 && ageDays <= maxAge * 2) return "medium";
  return "low";
}

export function isFresh(nextVerificationAt: string | null, now = new Date()): boolean {
  return nextVerificationAt === null || new Date(nextVerificationAt).valueOf() >= now.valueOf();
}
