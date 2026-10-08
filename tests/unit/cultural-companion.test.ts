import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RankedEvidence } from "@/features/cultural-knowledge/types";
import { ABSTENTION, buildCulturalAssistantResult } from "@/features/cultural-companion/policy";
import { culturalAssistantRequestSchema } from "@/features/cultural-companion/schema";
import { answerCulturalQuestion } from "@/server/cultural-companion/service";
import type { CulturalAnswerProvider } from "@/server/cultural-companion/gemini";

const id = "00000000-0000-4000-8000-000000000001";
const fakeId = "00000000-0000-4000-8000-000000000099";
function record(overrides: Partial<RankedEvidence> = {}): RankedEvidence {
  return {
    id, sourceId: "00000000-0000-4000-8000-000000000010", title: "Workshop participation rules",
    content: "Visitors should follow instructions shared by the workshop host. Ask the host before photographing participants.",
    summary: "Follow host instructions and ask before taking photographs.", category: "host_rule", sourceName: "Workshop host",
    sourceUrl: "https://example.jp/official", sourceType: "host", authorityLevel: 4, verificationStatus: "community_verified",
    destinationId: "00000000-0000-4000-8000-000000000020", experienceId: "00000000-0000-4000-8000-000000000030",
    language: "en", locationScope: {}, effectiveFrom: null, lastVerifiedAt: "2026-10-07T00:00:00.000Z", nextVerificationAt: null,
    isTimeSensitive: false, isActive: true, metadata: {}, score: 0.9, sourcePriority: 100, stale: false,
    confidence: "high", matchedTerms: ["host", "photograph"], limitations: [], ...overrides,
  };
}
const answer = { answer: "Follow the host's instructions. Ask before photographing participants.", evidenceUsedIds: [id], uncertainty: false, recommendedAction: "Review the host's instructions before the workshop." };

function setup(options: { evidence?: RankedEvidence[]; confidence?: "high" | "medium" | "low"; provider?: CulturalAnswerProvider | null } = {}) {
  const evidence = options.evidence ?? [record()];
  const retrieve = vi.fn(async () => ({ evidence, confidence: options.confidence ?? "high", conflicts: [] }));
  const provider = options.provider === undefined ? { answer: vi.fn(async () => answer) } : options.provider;
  return { retrieve, provider, run: (input: object = { question: "Can I take photos?", language: "en", experienceId: record().experienceId, destinationId: record().destinationId }) => answerCulturalQuestion(culturalAssistantRequestSchema.parse(input), { retrieve, provider }) };
}

describe("cultural companion evidence policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("answers from verified evidence and reconstructs citations from retrieved records", async () => {
    const flow = setup();
    const result = await flow.run();
    expect(result.answer).toContain("Ask before photographing");
    expect(result.confidence).toBe("high");
    expect(result.citations[0]).toMatchObject({ id, sourceName: "Workshop host", sourceUrl: "https://example.jp/official" });
  });

  it("abstains and never calls Gemini when retrieval has no evidence", async () => {
    const flow = setup({ evidence: [] });
    const result = await flow.run();
    expect(result.answer).toBe(ABSTENTION);
    expect(flow.provider?.answer).not.toHaveBeenCalled();
  });

  it("marks stale evidence uncertain and requires current confirmation", async () => {
    const flow = setup({ evidence: [record({ stale: true, confidence: "low", limitations: ["Verification is stale or missing."] })] });
    const result = await flow.run();
    expect(result.confidence).toBe("low");
    expect(result.staleEvidence).toContain(id);
    expect(result.recommendedAction).toContain("Confirm the current rule");
  });

  it("states equal-authority conflicts and never resolves them silently", async () => {
    const flow = setup({ evidence: [record({ limitations: ["Conflicting records of equal authority need review."] })] });
    const result = await flow.run();
    expect(result.answer).toContain("conflict");
    expect(result.conflicts).toContain(id);
  });

  it("preserves experience-specific host evidence and context on follow-up questions", async () => {
    const flow = setup();
    await flow.run({ question: "What about photographs?", experienceId: record().experienceId, destinationId: record().destinationId, history: [{ role: "user", content: "I am attending the pottery workshop." }, { role: "assistant", content: "I can help with verified workshop guidance." }] });
    expect(flow.retrieve).toHaveBeenCalledWith(expect.objectContaining({ query: expect.stringContaining("pottery workshop"), experienceId: record().experienceId }));
  });

  it("supports Japanese questions and requests a Japanese answer", async () => {
    const flow = setup();
    await flow.run({ question: "写真を撮ってもいいですか？", language: "ja", experienceId: record().experienceId, destinationId: record().destinationId });
    expect(flow.provider?.answer).toHaveBeenCalledWith(expect.objectContaining({ language: "ja", question: "写真を撮ってもいいですか？" }));
  });

  it("falls back to approved source language when Japanese chunks are unavailable", async () => {
    const evidence = [record()];
    const retrieve = vi.fn()
      .mockResolvedValueOnce({ evidence: [], confidence: "low" as const, conflicts: [] })
      .mockResolvedValueOnce({ evidence, confidence: "high" as const, conflicts: [] });
    const provider: CulturalAnswerProvider = { answer: vi.fn(async () => answer) };
    await answerCulturalQuestion(culturalAssistantRequestSchema.parse({ question: "写真のルールは？", language: "ja", experienceId: record().experienceId, destinationId: record().destinationId }), { retrieve, provider });
    expect(retrieve).toHaveBeenNthCalledWith(1, expect.objectContaining({ language: "ja" }));
    expect(retrieve).toHaveBeenNthCalledWith(2, expect.not.objectContaining({ language: expect.anything() }));
    expect(provider.answer).toHaveBeenCalledWith(expect.objectContaining({ language: "ja" }));
  });

  it("falls back to retrieved evidence if Gemini fails", async () => {
    const provider: CulturalAnswerProvider = { answer: vi.fn(async () => { throw new Error("provider unavailable"); }) };
    const result = await setup({ provider }).run();
    expect(result.fallback).toBe(true);
    expect(result.evidenceUsed).toEqual([id]);
    expect(result.citations).toHaveLength(1);
  });

  it.each(["HTTP 401 invalid API key", "HTTP 429 quota exceeded", "request timed out"])("shows retrieved evidence safely when Gemini fails with %s", async (failure) => {
    const provider: CulturalAnswerProvider = { answer: vi.fn(async () => { throw new Error(`${failure} secret-value`); }) };
    const result = await setup({ provider }).run();
    expect(result.fallback).toBe(true);
    expect(result.answer).toContain("retrieved source material");
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  it("falls back when model output fails schema validation", async () => {
    const provider: CulturalAnswerProvider = { answer: vi.fn(async () => ({ ...answer, surprise: "extra" }) as unknown as typeof answer) };
    const result = await setup({ provider }).run();
    expect(result.fallback).toBe(true);
    expect(result.evidenceUsed).toEqual([id]);
  });

  it("does not trust a fake citation ID or model-supplied URL", () => {
    const result = buildCulturalAssistantResult({ ...answer, answer: "Read this https://fake.invalid/rule", evidenceUsedIds: [fakeId] }, [record()], "high");
    expect(result.answer).not.toContain("fake.invalid");
    expect(result.evidenceUsed).toEqual([id]);
    expect(result.citations[0]?.sourceUrl).toBe("https://example.jp/official");
    expect(result.fallback).toBe(true);
  });

  it("rejects overlong questions and conversation history", () => {
    expect(culturalAssistantRequestSchema.safeParse({ question: "x".repeat(1201) }).success).toBe(false);
    expect(culturalAssistantRequestSchema.safeParse({ question: "follow up", history: Array.from({ length: 7 }, () => ({ role: "user", content: "context" })) }).success).toBe(false);
  });

  it("keeps retrieval confidence even if the model claims certainty", () => {
    const result = buildCulturalAssistantResult(answer, [record()], "medium");
    expect(result.confidence).toBe("medium");
  });

  it("does not answer venue photography rules from unrelated generic evidence", async () => {
    const flow = setup({ evidence: [record({ sourceType: "national_tourism_board", category: "etiquette", experienceId: null, destinationId: null })] });
    const result = await flow.run({ question: "What is the photography policy at this experience?", experienceId: record().experienceId });
    expect(result.answer).toBe(ABSTENTION);
    expect(result.recommendedAction).toContain("photography");
    expect(flow.provider?.answer).not.toHaveBeenCalled();
  });

  it("does not infer wheelchair accessibility from an unrelated verified description", async () => {
    const flow = setup({ evidence: [record({ sourceType: "dmo", category: "traditional_craft", experienceId: null })] });
    const result = await flow.run({ question: "Is this venue wheelchair accessible?", experienceId: record().experienceId });
    expect(result.answer).toBe(ABSTENTION);
    expect(result.recommendedAction).toContain("step-free access");
    expect(flow.provider?.answer).not.toHaveBeenCalled();
  });

  it("does not direct workshop ritual questions to a temple or shrine", async () => {
    const flow = setup({ evidence: [] });
    const result = await flow.run({ question: "Is there a secret ritual every Tuesday at this workshop?", experienceId: record().experienceId });
    expect(result.answer).toBe(ABSTENTION);
    expect(result.recommendedAction).toContain("named venue or operator");
    expect(result.recommendedAction).not.toContain("temple or shrine");
    expect(flow.provider?.answer).not.toHaveBeenCalled();
  });
});
