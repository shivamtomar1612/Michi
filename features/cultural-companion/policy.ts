import type { RankedEvidence, CulturalConfidence } from "@/features/cultural-knowledge/types";
import { culturalAssistantModelResponseSchema, type CulturalAssistantModelResponse } from "./schema";

export const ABSTENTION = "I don't have sufficiently verified information to answer this confidently.";

export type CompanionCitation = {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  verificationStatus: string;
  authorityLevel: number;
  lastVerifiedAt: string | null;
  stale: boolean;
  confidence: CulturalConfidence;
};

export type CulturalAssistantResult = {
  answer: string;
  confidence: CulturalConfidence;
  evidenceUsed: string[];
  evidence: Array<{ id: string; title: string; content: string; summary: string | null }>;
  citations: CompanionCitation[];
  uncertainty: boolean;
  recommendedAction: string;
  conflicts: string[];
  staleEvidence: string[];
  fallback: boolean;
};

type ScopedRuleTopic = "photography" | "host_rule" | "accessibility" | "dietary" | "opening_information" | "transport" | "temple_shrine";

function scopedRuleTopic(question: string): { topic: ScopedRuleTopic; categories: ScopedRuleTopic[]; action: string; locationSpecific: boolean } | null {
  const normalized = question.normalize("NFKC").toLocaleLowerCase();
  const locationSpecific = /\b(this|that|at the|for the|at this|for this)\b|この|その|当該|会場|施設|寺院|神社|体験/iu.test(normalized);
  if (/wheelchair|step[- ]?free|accessible|accessibility|mobility access|車椅子|車いす|段差|バリアフリー/iu.test(normalized)) {
    return { topic: "accessibility", categories: ["accessibility"], action: "Ask the venue or host directly about step-free access and the specific support you need.", locationSpecific: true };
  }
  if (/allerg|dietary|halal|kosher|vegan|vegetarian|food safety|食物アレルギー|食事制限|ハラール|ヴィーガン|ベジタリアン/iu.test(normalized)) {
    return { topic: "dietary", categories: ["dietary"], action: "Confirm ingredients and food-safety needs directly with the operator before booking.", locationSpecific: true };
  }
  if (/opening hours|open today|closing time|closed|business hours|営業時間|休業|開館時間/iu.test(normalized)) {
    return { topic: "opening_information", categories: ["opening_information"], action: "Check the venue’s official page for current opening information.", locationSpecific: true };
  }
  if (/photograph|photography|camera|take (a )?photo|pictures?|写真|撮影|カメラ/iu.test(normalized)) {
    return { topic: "photography", categories: ["photography", "host_rule"], action: "Ask the host or venue directly about photography before taking pictures.", locationSpecific };
  }
  if (/timetable|train schedule|bus schedule|departure time|transport schedule|時刻表|発車時刻|運行時刻/iu.test(normalized)) {
    return { topic: "transport", categories: ["transport"], action: "Check the official transport operator for the current timetable.", locationSpecific: true };
  }
  if (/ritual|sacred practice|ceremony|secret practice|儀式|祭礼|神事|秘儀/iu.test(normalized)) {
    const sacredVenue = /temple|shrine|寺院|神社/iu.test(normalized);
    return {
      topic: "temple_shrine", categories: ["temple_shrine"],
      action: sacredVenue
        ? "Ask the temple or shrine directly; do not assume a practice is open to visitors."
        : "Ask the named venue or operator directly whether any public ceremony is documented; MICHI has no verified information that one occurs.",
      locationSpecific: true,
    };
  }
  return null;
}

export function getRelevantScopedEvidence(
  question: string,
  records: RankedEvidence[],
  context: { destinationId?: string; experienceId?: string },
): { required: boolean; records: RankedEvidence[]; recommendedAction: string } | null {
  const requirement = scopedRuleTopic(question);
  if (!requirement) return null;
  const contextSpecific = Boolean(context.experienceId || context.destinationId || requirement.locationSpecific);
  if (!contextSpecific) return null;
  const filtered = records.filter((record) => {
    const categoryMatch = requirement.categories.includes(record.category as ScopedRuleTopic);
    if (!categoryMatch) return false;
    // Host rules are only meaningful for the exact experience they govern.
    if (record.sourceType === "host" && (!context.experienceId || record.experienceId !== context.experienceId)) return false;
    if (context.experienceId && record.experienceId) return record.experienceId === context.experienceId;
    if (context.destinationId && record.destinationId) return record.destinationId === context.destinationId;
    return !context.experienceId && !context.destinationId && !requirement.locationSpecific && record.sourceType !== "host";
  });
  return { required: filtered.length === 0, records: filtered, recommendedAction: requirement.action };
}

export function removeModelUrls(text: string): string {
  return text
    .replace(/\[[^\]]*\]\(\s*https?:\/\/[^)]+\)/giu, "")
    .replace(/https?:\/\/\S+/giu, "")
    .replace(/[ \t]{2,}/gu, " ")
    .trim();
}

export function parseModelResponse(value: unknown): CulturalAssistantModelResponse {
  return culturalAssistantModelResponseSchema.parse(value);
}

function citation(record: RankedEvidence): CompanionCitation {
  return {
    id: record.id,
    title: record.title,
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
    sourceType: record.sourceType,
    verificationStatus: record.verificationStatus,
    authorityLevel: record.authorityLevel,
    lastVerifiedAt: record.lastVerifiedAt ?? null,
    stale: record.stale,
    confidence: record.confidence,
  };
}

export function createFallbackResult(
  records: RankedEvidence[],
  confidence: CulturalConfidence,
  reason: "unsupported" | "provider_failure" | "invalid_output" = "provider_failure",
): CulturalAssistantResult {
  if (!records.length) {
    return {
      answer: ABSTENTION, confidence: "low", evidenceUsed: [], evidence: [], citations: [], uncertainty: true,
      recommendedAction: "Ask the official venue or operator directly for current guidance.", conflicts: [], staleEvidence: [], fallback: reason !== "unsupported",
    };
  }
  const citations = records.slice(0, 5).map(citation);
  const evidence = records.slice(0, 5).map((record) => ({ id: record.id, title: record.title, content: record.content, summary: record.summary ?? null }));
  const conflicts = citations.filter((item) => records.find((record) => record.id === item.id)?.limitations.some((text) => text.toLowerCase().includes("conflicting"))).map((item) => item.id);
  const staleEvidence = citations.filter((item) => item.stale).map((item) => item.id);
  const hasConflict = conflicts.length > 0;
  const hasStale = staleEvidence.length > 0;
  const answer = hasConflict
    ? "The retrieved sources give conflicting guidance of equal authority, so I can’t resolve the rule. Review the cited sources and confirm the current rule with the venue or host."
    : hasStale
      ? "The retrieved information may be out of date. Please confirm the current guidance with the venue or host before relying on it. The cited source material is shown below."
      : reason === "unsupported"
        ? ABSTENTION
        : "I couldn’t prepare an explanation right now. The retrieved source material is shown below without an AI summary.";
  return {
    answer,
    confidence: hasConflict || hasStale ? "low" : confidence,
    evidenceUsed: citations.map((item) => item.id),
    evidence,
    citations,
    uncertainty: true,
    recommendedAction: "Confirm current details with the official venue or host before acting.",
    conflicts,
    staleEvidence,
    fallback: reason !== "unsupported",
  };
}

export function buildCulturalAssistantResult(
  raw: unknown,
  records: RankedEvidence[],
  retrievalConfidence: CulturalConfidence,
): CulturalAssistantResult {
  const parsed = parseModelResponse(raw);
  const byId = new Map(records.map((record) => [record.id, record]));
  const usedRecords = [...new Set(parsed.evidenceUsedIds)].flatMap((id) => {
    const record = byId.get(id);
    return record ? [record] : [];
  });

  // A response without a valid citation is not safe to present as evidence-based.
  if (!usedRecords.length) return createFallbackResult(records, retrievalConfidence, "invalid_output");

  const citations = usedRecords.map(citation);
  const evidence = usedRecords.map((record) => ({ id: record.id, title: record.title, content: record.content, summary: record.summary ?? null }));
  const conflicts = usedRecords.filter((record) => record.limitations.some((text) => text.toLowerCase().includes("conflicting"))).map((record) => record.id);
  const staleEvidence = usedRecords.filter((record) => record.stale).map((record) => record.id);
  const hasConflict = conflicts.length > 0;
  const hasStale = staleEvidence.length > 0;
  const answer = removeModelUrls(parsed.answer);
  if (!answer) return createFallbackResult(records, retrievalConfidence, "invalid_output");

  return {
    answer: hasConflict
      ? "The retrieved sources conflict at the same authority level, so I can’t resolve the rule. " + answer
      : hasStale
        ? "This answer relies on information that may be out of date. " + answer
        : answer,
    // Model output can never set or increase confidence.
    confidence: hasConflict || hasStale ? "low" : retrievalConfidence,
    evidenceUsed: citations.map((item) => item.id),
    evidence,
    citations,
    uncertainty: parsed.uncertainty || hasConflict || hasStale || retrievalConfidence === "low",
    recommendedAction: hasConflict || hasStale
      ? "Confirm the current rule directly with the official venue or host."
      : removeModelUrls(parsed.recommendedAction) || "Review the cited source for details.",
    conflicts,
    staleEvidence,
    fallback: false,
  };
}
