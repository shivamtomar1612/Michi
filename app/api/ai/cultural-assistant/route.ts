import { createHmac, randomUUID } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { culturalAssistantRequestSchema } from "@/features/cultural-companion/schema";
import { answerCulturalQuestion } from "@/server/cultural-companion/service";
import { getGeminiCulturalAnswerProvider } from "@/server/cultural-companion/gemini";
import { allowLocalCulturalAssistantRequest } from "@/server/cultural-companion/rate-limit";
import { retrieveCulturalEvidence } from "@/server/cultural-knowledge/service";
import { createClient } from "@/lib/supabase/server";
import { readBoundedRequestBody } from "@/server/security/request-body";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const bodyResult = await readBoundedRequestBody(request, 8192);
  if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.status === 413 ? "Conversation is too large." : "Invalid request body." }, { status: bodyResult.status });
  let json: unknown;
  try { json = JSON.parse(bodyResult.body); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = culturalAssistantRequestSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Check the question and conversation context." }, { status: 400 });

  try {
    const supabase = await createClient();
    const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
    const salt = process.env.RATE_LIMIT_SALT ?? process.env.NEXT_PUBLIC_APP_URL ?? "michi-cultural-companion-rate-v1";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (process.env.NODE_ENV === "production" && !serviceKey) {
      return NextResponse.json({ error: "Cultural companion is not ready." }, { status: 503 });
    }
    const hashKey = process.env.RATE_LIMIT_SALT ?? serviceKey ?? salt;
    const requesterHash = createHmac("sha256", hashKey).update(ip).digest("hex");
    if (serviceKey) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url) return NextResponse.json({ error: "Cultural companion is not ready." }, { status: 503 });
      const limiter = createSupabaseClient<Database>(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const rate = await limiter.rpc("consume_cultural_companion_limit", { p_requester_hash: requesterHash });
      if (rate.error) return NextResponse.json({ error: "Cultural companion is not ready." }, { status: 503 });
      if (!rate.data) return NextResponse.json({ error: "Please wait a moment before asking another question." }, { status: 429 });
    } else if (!allowLocalCulturalAssistantRequest(requesterHash)) {
      return NextResponse.json({ error: "Please wait a moment before asking another question." }, { status: 429 });
    }

    const result = await answerCulturalQuestion(parsed.data, {
      retrieve: (query) => retrieveCulturalEvidence(supabase, query),
      provider: getGeminiCulturalAnswerProvider(),
    });

    // Store only a pseudonymous session UUID and coarse result metadata, never questions or transcripts.
    const sessionId = randomUUID();
    await supabase.from("analytics_events").insert({
      user_id: null,
      session_id: sessionId,
      event_name: "cultural_companion_question",
      metadata: { evidence_count: result.evidenceUsed.length, confidence: result.confidence, fallback: result.fallback, language: parsed.data.language },
    });

    return NextResponse.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Cultural companion is temporarily unavailable. Retrieved evidence could not be checked." }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}
