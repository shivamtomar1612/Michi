import { describe, expect, it } from "vitest";
import {
  CONTENT_REPORT_RATE_LIMIT,
  contentReportSchema,
  hasPublishableDestinationProvenance,
  isAuditMetadataSafe,
  normalizeAdminPage,
} from "@/features/admin/policy";

describe("admin governance policies", () => {
  it("accepts only bounded content reports with recognized target and reason values", () => {
    const valid = { subjectType: "experience", subjectId: "7b47b5d4-46a7-4b15-8861-2aaf1b83cced", reasonCode: "cultural_concern", details: "The source citation does not support this claim." };
    expect(contentReportSchema.safeParse(valid).success).toBe(true);
    expect(contentReportSchema.safeParse({ ...valid, subjectType: "profile" }).success).toBe(false);
    expect(contentReportSchema.safeParse({ ...valid, reasonCode: "abuse" }).success).toBe(false);
    expect(contentReportSchema.safeParse({ ...valid, details: "short" }).success).toBe(false);
    expect(contentReportSchema.safeParse({ ...valid, details: "x".repeat(1201) }).success).toBe(false);
  });

  it("rejects audit metadata that includes sensitive fields or exceeds the byte limit", () => {
    expect(isAuditMetadataSafe({ status: "verified", fields: "name,status" })).toBe(true);
    expect(isAuditMetadataSafe({ Email: "person@example.test" })).toBe(false);
    expect(isAuditMetadataSafe({ reviewer_note: "private context" })).toBe(false);
    expect(isAuditMetadataSafe({ note: "private context" })).toBe(false);
    expect(isAuditMetadataSafe({ detail: "x".repeat(2000) })).toBe(false);
  });

  it("requires verified official provenance before destination publication", () => {
    const ready = { verificationStatus: "verified_official", dataStatus: "official_tourism", sourceId: "source-id", sourceUrl: "https://official.example.jp/destination", lastVerifiedAt: "2026-10-01T00:00:00.000Z", nextVerificationAt: "2027-10-01T00:00:00.000Z", sourceIsOfficial: true, sourceIsActive: true };
    expect(hasPublishableDestinationProvenance(ready)).toBe(true);
    expect(hasPublishableDestinationProvenance({ ...ready, sourceId: null })).toBe(false);
    expect(hasPublishableDestinationProvenance({ ...ready, sourceUrl: null })).toBe(false);
    expect(hasPublishableDestinationProvenance({ ...ready, lastVerifiedAt: null })).toBe(false);
    expect(hasPublishableDestinationProvenance({ ...ready, verificationStatus: "unverified" })).toBe(false);
    expect(hasPublishableDestinationProvenance({ ...ready, sourceIsOfficial: false })).toBe(false);
    expect(hasPublishableDestinationProvenance({ ...ready, sourceIsActive: false })).toBe(false);
    expect(hasPublishableDestinationProvenance({ ...ready, nextVerificationAt: "2020-01-01T00:00:00.000Z" })).toBe(false);
  });

  it("bounds page offsets and documents the database report throttle", () => {
    expect(normalizeAdminPage("1")).toBe(1);
    expect(normalizeAdminPage("0")).toBe(1);
    expect(normalizeAdminPage("-8")).toBe(1);
    expect(normalizeAdminPage("n/a")).toBe(1);
    expect(normalizeAdminPage("9000")).toBe(1000);
    expect(CONTENT_REPORT_RATE_LIMIT).toEqual({ maximum: 10, windowHours: 24 });
  });
});
