import { NextResponse, type NextRequest } from "next/server";
import { recommendationPreferencesSchema } from "@/features/recommendations/schemas";
import type { RecommendationResult } from "@/features/recommendations/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { getRecommendations } from "@/server/recommendations/service";
import { getExternalRecommendations } from "@/server/recommendations/external-service";
import { allowGuestRequest, GUEST_RECOMMENDATION_LIMIT } from "@/server/security/guest-recommendation-limit";

function tokyoDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const body = await request.text();
  if (body.length > 8192) return NextResponse.json({ error: "Preference form is too large." }, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid preference form." }, { status: 400 });
  }
  const parsed = recommendationPreferencesSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Check your preferences and travel dates." }, { status: 400 });
  if (parsed.data.startDate < tokyoDate()) return NextResponse.json({ error: "Choose a future travel date." }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profileError) return NextResponse.json({ error: "Traveler account could not be checked." }, { status: 503 });
      if (profile?.role !== "traveler") return NextResponse.json({ error: "Recommendations are available to traveler accounts." }, { status: 403 });
    } else if (!await allowGuestRequest(request, "recommendations", GUEST_RECOMMENDATION_LIMIT)) {
      return NextResponse.json({ error: "Please wait a moment before requesting more recommendations." }, { status: 429 });
    }

    const [result, externalResult] = await Promise.all([
      getRecommendations(parsed.data), getExternalRecommendations(parsed.data),
    ]);
    if (!result.ok && !externalResult.ok) return NextResponse.json({ error: "Verified experiences could not be loaded. Please try again." }, { status: 503 });

    const recommendations: RecommendationResult[] = (result.ok ? result.recommendations : []).slice(0, 10).map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      shortDescription: item.shortDescription,
      destinationId: item.destinationId,
      destinationName: item.destinationName,
      region: item.region,
      priceJpy: item.priceJpy,
      durationMinutes: item.durationMinutes,
      score: item.score,
      evidenceCompleteness: item.evidenceCompleteness,
      recommendationConfidence: item.recommendationConfidence,
      reasons: item.reasons,
      tradeoffs: item.tradeoffs,
      componentScores: item.componentScores,
      destinationHealth: item.destinationHealth,
      sourceMetadata: item.sourceMetadata,
      healthProvenance: item.healthProvenance,
      slots: item.slots,
      participationRules: item.participationRules,
      cancellationRules: item.cancellationRules,
      photographyPolicy: item.photographyPolicy,
    }));
    const persistedRecommendations = recommendations.map((item) => ({
      id: item.id,
      destinationId: item.destinationId,
      score: item.score,
      evidenceCompleteness: item.evidenceCompleteness,
      recommendationConfidence: item.recommendationConfidence,
      reasons: item.reasons,
      tradeoffs: item.tradeoffs,
      componentScores: item.componentScores,
      destinationHealth: {
        score: item.destinationHealth.score,
        status: item.destinationHealth.status,
        simulationStatus: item.destinationHealth.simulationStatus,
        lastUpdated: item.destinationHealth.lastUpdated,
      },
      sourceMetadata: item.sourceMetadata,
      healthProvenance: item.healthProvenance,
    }));
    let logId: string | null = null;
    if (user) {
      const { data: log, error: logError } = await supabase.from("recommendation_logs").insert({
      traveler_id: user.id,
      input_context: parsed.data,
      recommendations: [
        ...persistedRecommendations.map((item) => ({ ...item, pathway: "michi_verified" })),
        ...(externalResult.ok ? externalResult.matches.map((item) => ({
          id: item.id, pathway: item.pathway, destinationName: item.destinationName,
          interestCompatibility: item.interestCompatibility, matchedInterests: item.matchedInterests,
          sourceUrl: item.sourceUrl, lastVerifiedAt: item.lastVerifiedAt,
          availabilityStatus: item.availabilityStatus, destinationHealthStatus: item.destinationHealthStatus,
          missingInformation: item.missingInformation,
        })) : []),
      ] as unknown as Json,
      }).select("id").single();
      if (logError || !log) return NextResponse.json({ error: "Your recommendation request could not be saved." }, { status: 503 });
      logId = log.id;
    }

    return NextResponse.json({
      mode: user ? "authenticated" : "guest",
      logId,
      recommendations,
      externalRecommendations: externalResult.ok ? externalResult.matches : [],
      michiInventoryUnavailable: !result.ok,
      externalInventoryUnavailable: !externalResult.ok,
    });
  } catch {
    return NextResponse.json({ error: "Recommendation service is unavailable." }, { status: 503 });
  }
}
