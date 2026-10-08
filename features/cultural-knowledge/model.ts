import type { CulturalConfidence, CulturalEvidenceRecord, CulturalQuery, RankedEvidence } from "./types";

const HIGH_SENSITIVITY_HOURS = 6;
const DEFAULT_FRESHNESS_DAYS = 180;
const highSensitivityCategories = new Set(["opening_information", "festival"]);

export function isCulturalRecordStale(record: Pick<CulturalEvidenceRecord, "category" | "isTimeSensitive" | "lastVerifiedAt" | "nextVerificationAt">, now = new Date()): boolean {
  const verified = record.lastVerifiedAt ? Date.parse(record.lastVerifiedAt) : Number.NaN;
  const next = record.nextVerificationAt ? Date.parse(record.nextVerificationAt) : Number.NaN;
  if (!Number.isFinite(verified) || verified > now.getTime()) return true;
  if (Number.isFinite(next) && next <= now.getTime()) return true;
  const sensitive = record.isTimeSensitive || highSensitivityCategories.has(record.category ?? "");
  const maxAgeMs = sensitive ? HIGH_SENSITIVITY_HOURS * 60 * 60 * 1000 : DEFAULT_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - verified > maxAgeMs;
}

function terms(text: string): string[] {
  return [...new Set(text.toLocaleLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]{2,}/gu) ?? [])];
}

function specificity(record: CulturalEvidenceRecord, query: CulturalQuery): number {
  if (query.experienceId && record.experienceId === query.experienceId && record.sourceType === "host") return 1;
  if (record.experienceId) return 0.75;
  if (query.destinationId && record.destinationId === query.destinationId) return 0.8;
  if (record.destinationId) return 0.35;
  const scope = record.locationScope ?? {};
  if (query.destinationId && Object.values(scope).includes(query.destinationId)) return 0.65;
  return 0.2;
}

function conflictKey(record: CulturalEvidenceRecord): string {
  const explicit = record.metadata?.conflictKey;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim().toLowerCase();
  return [record.category ?? "general", record.experienceId ?? record.destinationId ?? "global", record.title.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim()].join(":");
}

function sourcePriority(record: CulturalEvidenceRecord, query: CulturalQuery): number {
  const scoped = Boolean(record.experienceId && record.experienceId === query.experienceId) || Boolean(record.destinationId && record.destinationId === query.destinationId);
  if (record.sourceType === "government" && record.metadata?.authorityScope === "cultural_property_designation") return 110;
  if (record.sourceType === "host" && record.experienceId && record.experienceId === query.experienceId) return 100;
  if (scoped && (record.sourceType === "temple_shrine" || record.sourceType === "museum")) return 95;
  if (scoped && record.sourceType === "municipality") return 90;
  if (scoped && record.sourceType === "prefecture") return 80;
  if (record.sourceType === "government" || record.sourceType === "national_tourism_board") return 70;
  if (record.sourceType === "cultural_institution" || record.sourceType === "dmo") return 60;
  if (record.sourceType === "prefecture") return 55;
  if (record.sourceType === "municipality") return 50;
  return 30;
}

function confidenceFor(record: CulturalEvidenceRecord, stale: boolean, termCoverage: number, conflict: boolean): CulturalConfidence {
  if (conflict || stale || record.verificationStatus === "unverified" || record.verificationStatus === "pending_review") return "low";
  if (record.sourceType === "host" && record.verificationStatus !== "community_verified") return "low";
  if (record.verificationStatus === "official_verified" && record.authorityLevel >= 4 && termCoverage >= 0.5) return "high";
  if (record.verificationStatus === "community_verified" && record.sourceType === "host" && record.authorityLevel >= 4 && termCoverage >= 0.5) return "high";
  if (record.authorityLevel >= 3 && termCoverage > 0) return "medium";
  return "low";
}

export function detectCulturalConflicts(records: CulturalEvidenceRecord[]): Map<string, string[]> {
  const groups = new Map<string, CulturalEvidenceRecord[]>();
  for (const record of records) {
    const key = conflictKey(record);
    const items = groups.get(key) ?? [];
    items.push(record);
    groups.set(key, items);
  }
  const conflicts = new Map<string, string[]>();
  for (const [key, group] of groups) {
    const distinct = new Set(group.map((item) => (item.content + " " + (item.summary ?? "")).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()));
    const authorities = new Set(group.map((item) => item.authorityLevel));
    if (group.length > 1 && distinct.size > 1 && authorities.size === 1) conflicts.set(key, group.map((item) => item.id));
  }
  return conflicts;
}

export function rankCulturalEvidence(records: CulturalEvidenceRecord[], query: CulturalQuery, now = new Date()): RankedEvidence[] {
  const queryTerms = terms(query.query);
  const conflicts = detectCulturalConflicts(records);
  return records
    .filter((record) => record.isActive !== false && ["official_verified", "community_verified"].includes(record.verificationStatus))
    .filter((record) => !query.category || record.category === query.category)
    .filter((record) => !query.language || !record.language || record.language.toLowerCase() === query.language.toLowerCase())
    .filter((record) => !query.destinationId || !record.destinationId || record.destinationId === query.destinationId)
    .filter((record) => !query.experienceId || !record.experienceId || record.experienceId === query.experienceId)
    .map((record) => {
      const haystack = terms([record.title, record.content, record.summary ?? "", record.category ?? "", record.subcategory ?? ""].join(" "));
      const matchedTerms = queryTerms.filter((item) => haystack.includes(item));
      const coverage = queryTerms.length ? matchedTerms.length / queryTerms.length : 0;
      const stale = isCulturalRecordStale(record, now);
      const key = conflictKey(record);
      const conflicting = conflicts.has(key);
      const specificityScore = specificity(record, query);
      const authorityScore = Math.max(0, Math.min(1, record.authorityLevel / 5));
      const verificationScore = record.verificationStatus === "official_verified" || record.verificationStatus === "community_verified" ? 1 : 0;
      const freshnessScore = stale ? 0 : 1 - Math.min(1, (now.getTime() - Date.parse(record.lastVerifiedAt ?? "")) / (180 * 86400000));
      const relevance = Math.max(coverage, (record.semanticSimilarity ?? 0) * 0.8);
      const score = relevance * 0.4 + specificityScore * 0.2 + authorityScore * 0.2 + verificationScore * 0.1 + freshnessScore * 0.1;
      const limitations: string[] = [];
      if (stale) limitations.push("Verification is stale or missing.");
      if (conflicting) limitations.push("Conflicting records of equal authority need review.");
      if (!matchedTerms.length) limitations.push("No query terms matched the retrieved text.");
      const confidence: CulturalConfidence = confidenceFor(record, stale, coverage, conflicting);
      return { ...record, score, sourcePriority: sourcePriority(record, query), stale, confidence, matchedTerms, limitations };
    })
    .filter((record) => record.matchedTerms.length > 0 || (record.semanticSimilarity ?? 0) >= 0.45 || queryTerms.length === 0)
    .sort((a, b) => b.sourcePriority - a.sourcePriority || b.score - a.score || a.sourceUrl.localeCompare(b.sourceUrl) || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.min(query.limit ?? 5, 20)));
}

export function aggregateConfidence(records: RankedEvidence[]): CulturalConfidence {
  if (!records.length || records.some((record) => record.confidence === "low")) return "low";
  if (records.some((record) => record.confidence === "medium")) return "medium";
  return "high";
}
