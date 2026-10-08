import { describe, expect, it } from "vitest";
import { aggregateConfidence, detectCulturalConflicts, isCulturalRecordStale, rankCulturalEvidence } from "@/features/cultural-knowledge/model";
import { chunkSemanticBlocks, extractSemanticBlocks } from "@/features/cultural-knowledge/extraction";
import { isPublicAddress, robotsAllows, validateApprovedUrl } from "@/features/cultural-knowledge/security";
import { canPublishCulturalVerification } from "@/features/cultural-knowledge/authorization";
import { hashContent } from "@/features/cultural-knowledge/extraction";
import { keywordSearchVariants } from "@/features/cultural-knowledge/search";
import type { CulturalEvidenceRecord } from "@/features/cultural-knowledge/types";

const now = new Date("2026-10-08T00:00:00.000Z");
function evidence(overrides: Partial<CulturalEvidenceRecord> = {}): CulturalEvidenceRecord {
  return {
    id: "record-1", sourceId: "source-1", title: "Temple photography etiquette", content: "Check posted signs before taking photographs inside the temple grounds.",
    category: "photography", sourceName: "Official Kyoto Guide", sourceUrl: "https://kyoto.travel/en/guide", sourceType: "dmo", authorityLevel: 4,
    verificationStatus: "official_verified", lastVerifiedAt: "2026-10-01T00:00:00.000Z", isActive: true, metadata: { conflictKey: "photo-1" }, ...overrides,
  };
}

describe("cultural evidence model", () => {
  it("rejects unknown hosts, credentials, non-HTTPS and private addresses", () => {
    expect(() => validateApprovedUrl("https://example.com/a", ["kyoto.travel"])).toThrow();
    expect(() => validateApprovedUrl("http://kyoto.travel/a", ["kyoto.travel"])).toThrow();
    expect(() => validateApprovedUrl("https://user@kyoto.travel/a", ["kyoto.travel"])).toThrow();
    expect(() => validateApprovedUrl("https://127.0.0.1/a", ["127.0.0.1"])).toThrow();
    expect(() => validateApprovedUrl("https://sub.kyoto.travel/a", ["kyoto.travel"])).toThrow();
    expect(isPublicAddress("10.0.0.1")).toBe(false);
    expect(isPublicAddress("100.64.1.1")).toBe(false);
    expect(isPublicAddress("::ffff:7f00:1")).toBe(false);
    expect(isPublicAddress("2001:db8::1")).toBe(false);
    expect(isPublicAddress("8.8.8.8")).toBe(true);
  });

  it("honors the most specific robots rule and prefers allow on equal path specificity", () => {
    const rules = "User-agent: *\nDisallow: /private\nAllow: /private/public$\n";
    expect(robotsAllows(rules, "/private/file")).toBe(false);
    expect(robotsAllows(rules, "/private/public")).toBe(true);
    expect(robotsAllows(rules, "/private%2Ffile")).toBe(false);
    expect(robotsAllows(rules, "/public")).toBe(true);
  });

  it("ranks experience-specific host rules above general evidence", () => {
    const general = evidence({ id: "general", sourceType: "national_tourism_board", authorityLevel: 5, experienceId: null, metadata: {} });
    const local = evidence({ id: "host", sourceType: "host", authorityLevel: 5, verificationStatus: "community_verified", experienceId: "experience-1", category: "host_rule", metadata: {} });
    const ranked = rankCulturalEvidence([general, local], { query: "photographs temple", experienceId: "experience-1" }, now);
    expect(ranked[0]?.id).toBe("host");
  });

  it("prefers a destination-specific official venue over broad national guidance", () => {
    const national = evidence({ id: "national", sourceType: "government", authorityLevel: 5, title: "Temple photography etiquette", destinationId: null, metadata: {} });
    const venue = evidence({ id: "venue", sourceType: "temple_shrine", authorityLevel: 4, title: "Temple photography etiquette", destinationId: "destination-1", metadata: {} });
    const ranked = rankCulturalEvidence([national, venue], { query: "photography temple", destinationId: "destination-1" }, now);
    expect(ranked[0]?.id).toBe("venue");
  });

  it("does not let semantic similarity increase evidence confidence", () => {
    const semanticOnly = evidence({ semanticSimilarity: 0.95 });
    const result = rankCulturalEvidence([semanticOnly], { query: "unrelated vocabulary" }, now);
    expect(result[0]?.confidence).toBe("low");
  });

  it("marks records stale when verification is absent, expired or time sensitive", () => {
    expect(isCulturalRecordStale({ lastVerifiedAt: null }, now)).toBe(true);
    expect(isCulturalRecordStale({ lastVerifiedAt: "2026-10-07T17:00:00.000Z", category: "opening_information" }, now)).toBe(true);
    expect(isCulturalRecordStale({ lastVerifiedAt: "2026-10-07T23:00:00.000Z", category: "opening_information" }, now)).toBe(false);
  });

  it("keeps equal-authority conflicts visible and lowers confidence", () => {
    const first = evidence();
    const second = evidence({ id: "record-2", content: "Photography is not permitted anywhere in the temple grounds." });
    const conflicts = detectCulturalConflicts([first, second]);
    expect(conflicts.get("photo-1")).toEqual(["record-1", "record-2"]);
    const ranked = rankCulturalEvidence([first, second], { query: "photography temple" }, now);
    expect(ranked.every((record) => record.confidence === "low")).toBe(true);
    expect(aggregateConfidence(ranked)).toBe("low");
  });

  it("extracts semantic text without navigation or footer noise and chunks with stable hashes", async () => {
    const blocks = extractSemanticBlocks("<nav>Navigation menu words should never appear here.</nav><h1>Photography rules</h1><p>Visitors should check signs before taking photographs at this cultural site.</p><footer>Copyright footer content ignored here</footer>");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.heading).toBe("Photography rules");
    const chunks = await chunkSemanticBlocks(blocks);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("prevents editorial sources from receiving official verification and host rules from receiving official status", () => {
    expect(canPublishCulturalVerification("government", 5, "official_verified")).toBe(true);
    expect(canPublishCulturalVerification("editorial", 5, "official_verified")).toBe(false);
    expect(canPublishCulturalVerification("host", 5, "community_verified")).toBe(true);
    expect(canPublishCulturalVerification("host", 5, "official_verified")).toBe(false);
    expect(canPublishCulturalVerification("museum", 2, "official_verified")).toBe(false);
  });

  it("deduplicates normalized source text by stable SHA-256 hash", async () => {
    expect(await hashContent("Kyoto   etiquette\n signs")).toBe(await hashContent("Kyoto etiquette signs"));
  });

  it("uses an OR keyword pass so natural-language questions can find relevant chunks", () => {
    expect(keywordSearchVariants("What should travelers know about Japanese customs and etiquette?")).toEqual([
      "What should travelers know about Japanese customs and etiquette?",
      "What OR should OR travelers OR know OR about OR Japanese OR customs OR and OR etiquette",
    ]);
  });
});
