import "server-only";
import { z } from "zod";
import { configuredGeminiModel } from "@/server/cultural-companion/gemini";
import { validateOrganizerOrder, type OrganizableCandidate, type OrganizerSelection } from "@/features/itineraries/organizer";

const responseSchema = z.object({
  items: z.array(z.object({ candidateId: z.string().uuid(), reasonIndex: z.number().int().min(0).max(20) }).strict()).max(40),
}).strict();

export async function organizeWithGemini(
  candidates: Array<OrganizableCandidate & { title: string; destination: string; origin: string }>,
  preferences: { interests: string[]; travelStyle: "relaxed" | "balanced" | "packed" },
): Promise<Array<OrganizableCandidate & { explanation: string }> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !candidates.length) return null;
  try {
    const model = configuredGeminiModel();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You organize a responsible Japan itinerary using only the supplied eligible database candidates. Never invent a destination, experience, fact, time, capacity, accessibility, cultural claim, or booking. Return every supplied candidate exactly once in a useful order. For each, select a reasonIndex from that candidate's supplied deterministic reasons. Do not output prose or new explanations." }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ interests: preferences.interests, travelStyle: preferences.travelStyle, candidates: candidates.map((candidate) => ({ candidateId: candidate.id, title: candidate.title, destination: candidate.destination, origin: candidate.origin, deterministicScore: candidate.score, allowedReasons: candidate.reasons })) }) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT", properties: { items: { type: "ARRAY", items: { type: "OBJECT", properties: { candidateId: { type: "STRING" }, reasonIndex: { type: "INTEGER" } }, required: ["candidateId", "reasonIndex"] } } },
            required: ["items"],
          },
          maxOutputTokens: 1200,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    const text = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      .candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n");
    if (!text) return null;
    const decoded: unknown = JSON.parse(text);
    const parsed = responseSchema.safeParse(decoded);
    if (!parsed.success) return null;
    const order: OrganizerSelection[] = parsed.data.items;
    return validateOrganizerOrder(candidates, order);
  } catch {
    return null;
  }
}
