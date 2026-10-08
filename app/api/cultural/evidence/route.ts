import { createHash } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { evidenceRequestSchema } from "@/server/cultural-knowledge/schemas";
import { retrieveCulturalEvidence } from "@/server/cultural-knowledge/service";
import { createClient } from "@/lib/supabase/server";
import { allowLocalEvidenceRequest } from "@/server/cultural-knowledge/rate-limit";
import type { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const body = await request.text();
  if (body.length > 4096) return NextResponse.json({ error: "Evidence query is too large." }, { status: 413 });
  let json: unknown;
  try { json = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid evidence query." }, { status: 400 }); }
  const parsed = evidenceRequestSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Check the query and filters." }, { status: 400 });
  try {
    const supabase = await createClient();
    const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
    const salt = process.env.RATE_LIMIT_SALT ?? process.env.NEXT_PUBLIC_APP_URL ?? "michi-evidence-rate-v1";
    const requesterHash = createHash("sha256").update(salt + ":" + ip).digest("hex");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (serviceKey) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url) return NextResponse.json({ error: "Evidence service is not ready." }, { status: 503 });
      const limiter = createSupabaseClient<Database>(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const rate = await limiter.rpc("consume_cultural_evidence_limit", { p_requester_hash: requesterHash });
      if (rate.error) return NextResponse.json({ error: "Evidence service is not ready." }, { status: 503 });
      if (!rate.data) return NextResponse.json({ error: "Too many evidence requests. Try again shortly." }, { status: 429 });
    } else if (!allowLocalEvidenceRequest(requesterHash)) {
      return NextResponse.json({ error: "Too many evidence requests. Try again shortly." }, { status: 429 });
    }
    const result = await retrieveCulturalEvidence(supabase, parsed.data);
    return NextResponse.json({ ...result, generatedBy: "deterministic-evidence-retrieval" }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Cultural evidence is temporarily unavailable." }, { status: 503 });
  }
}
