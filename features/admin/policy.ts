import { z } from "zod";

export const ADMIN_PAGE_SIZE = 30;
export const ADMIN_USER_PAGE_SIZE = 25;
export const MAX_ADMIN_PAGE = 1000;
export const CONTENT_REPORT_RATE_LIMIT = { maximum: 10, windowHours: 24 } as const;

const forbiddenAuditKeys = new Set([
  "email", "phone", "address", "comment", "reflection", "secret", "token",
  "password", "api_key", "credential", "authorization", "cookie", "note",
  "reviewer_note", "review_note",
]);

export function isAuditMetadataSafe(metadata: Record<string, unknown>): boolean {
  if (Object.keys(metadata).some((key) => forbiddenAuditKeys.has(key.toLowerCase()))) return false;
  try { return new TextEncoder().encode(JSON.stringify(metadata)).byteLength <= 1800; }
  catch { return false; }
}

export function normalizeAdminPage(rawPage: string | undefined): number {
  const parsed = Number.parseInt(rawPage ?? "1", 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_ADMIN_PAGE, parsed)) : 1;
}

export function hasPublishableDestinationProvenance(input: {
  verificationStatus: string;
  dataStatus: string;
  sourceId: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  nextVerificationAt: string | null;
  sourceIsOfficial: boolean;
  sourceIsActive: boolean;
}): boolean {
  return input.verificationStatus === "verified_official"
    && input.dataStatus === "official_tourism"
    && input.sourceIsOfficial && input.sourceIsActive
    && Boolean(input.sourceId && input.sourceUrl && input.lastVerifiedAt && input.nextVerificationAt)
    && Date.parse(input.lastVerifiedAt!) <= Date.now()
    && Date.parse(input.nextVerificationAt!) > Date.now();
}

export const contentReportReasons = [
  "inaccurate", "safety", "cultural_concern", "accessibility",
  "misleading_commercial_claim", "privacy", "other",
] as const;

export const contentReportSchema = z.object({
  subjectType: z.enum(["destination", "place", "external_experience", "experience", "cultural_content"]),
  subjectId: z.uuid(), reasonCode: z.enum(contentReportReasons),
  details: z.string().trim().min(10).max(1200),
});
