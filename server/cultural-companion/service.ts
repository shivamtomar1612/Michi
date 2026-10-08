import type { CulturalAssistantRequest } from "@/features/cultural-companion/schema";
import { buildCulturalAssistantResult, createFallbackResult, getRelevantScopedEvidence, type CulturalAssistantResult } from "@/features/cultural-companion/policy";
import type { CulturalConfidence, RankedEvidence } from "@/features/cultural-knowledge/types";
import { aggregateConfidence } from "@/features/cultural-knowledge/model";
import type { CulturalAnswerProvider } from "./gemini";

export type CulturalEvidenceRetriever = (query: {
  query: string;
  destinationId?: string;
  experienceId?: string;
  language?: "en" | "ja";
  limit: number;
}) => Promise<{ evidence: RankedEvidence[]; confidence: CulturalConfidence; conflicts: Array<{ id: string }> }>;

export async function answerCulturalQuestion(
  input: CulturalAssistantRequest,
  dependencies: { retrieve: CulturalEvidenceRetriever; provider: CulturalAnswerProvider | null },
): Promise<CulturalAssistantResult> {
  const contextualQuestion = [...input.history.filter((message) => message.role === "user").slice(-2).map((message) => message.content), input.question].join("\n");
  let retrieved = await dependencies.retrieve({
    query: contextualQuestion,
    ...(input.destinationId ? { destinationId: input.destinationId } : {}),
    ...(input.experienceId ? { experienceId: input.experienceId } : {}),
    language: input.language,
    limit: 8,
  });
  // If Japanese chunks are not available, retrieve approved source material in any language and translate it.
  if (!retrieved.evidence.length && input.language === "ja") {
    retrieved = await dependencies.retrieve({
      query: contextualQuestion,
      ...(input.destinationId ? { destinationId: input.destinationId } : {}),
      ...(input.experienceId ? { experienceId: input.experienceId } : {}),
      limit: 8,
    });
  }

  // Context-specific rules (such as a venue's photography or accessibility policy)
  // require evidence scoped to that exact destination/experience. Generic guidance
  // must not be used to fill a venue-specific gap.
  const scoped = getRelevantScopedEvidence(contextualQuestion, retrieved.evidence, {
    ...(input.destinationId ? { destinationId: input.destinationId } : {}),
    ...(input.experienceId ? { experienceId: input.experienceId } : {}),
  });
  if (scoped?.required) {
    return {
      ...createFallbackResult([], "low", "unsupported"),
      recommendedAction: scoped.recommendedAction,
    };
  }
  if (scoped) {
    retrieved = { ...retrieved, evidence: scoped.records, confidence: aggregateConfidence(scoped.records) };
  }

  if (!retrieved.evidence.length) return createFallbackResult([], "low", "unsupported");
  if (!dependencies.provider) return createFallbackResult(retrieved.evidence, retrieved.confidence, "provider_failure");

  try {
    const generated = await dependencies.provider.answer({
      question: input.question,
      language: input.language,
      history: input.history.slice(-6),
      evidence: retrieved.evidence,
    });
    return buildCulturalAssistantResult(generated, retrieved.evidence, retrieved.confidence);
  } catch {
    return createFallbackResult(retrieved.evidence, retrieved.confidence, "provider_failure");
  }
}
