import { NextResponse, type NextRequest } from "next/server";
import { itineraryGenerateSchema } from "@/features/itineraries/schemas";
import { deterministicPlanOrder, stableJson } from "@/features/itineraries/organizer";
import type { RecommendationResult } from "@/features/recommendations/types";
import type { ExternalDiscoveryMatch } from "@/features/recommendations/external";
import { createClient } from "@/lib/supabase/server";
import { getRecommendations } from "@/server/recommendations/service";
import { getExternalRecommendations } from "@/server/recommendations/external-service";
import { organizeWithGemini } from "@/server/itineraries/gemini-organizer";
import { allowGuestRequest } from "@/server/security/guest-recommendation-limit";
import { readBoundedRequestBody } from "@/server/security/request-body";

function idsFromLog(value: unknown, pathway: string): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.flatMap((entry) => entry && typeof entry === "object"
    && "pathway" in entry && entry.pathway === pathway && "id" in entry && typeof entry.id === "string" ? [entry.id] : []));
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const bodyResult = await readBoundedRequestBody(request, 16_384);
  if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.status === 413 ? "Plan request is too large." : "Invalid request body." }, { status: bodyResult.status });
  let json: unknown;
  try { json = JSON.parse(bodyResult.body); } catch { return NextResponse.json({ error: "Invalid plan request." }, { status: 400 }); }
  const parsed = itineraryGenerateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Review the dates and preferences, then try again." }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profileError) return NextResponse.json({ error: "Traveler account could not be checked." }, { status: 503 });
      if (profile?.role !== "traveler") return NextResponse.json({ error: "Planning is available to traveler accounts." }, { status: 403 });
    } else {
      if (parsed.data.recommendationLogId) return NextResponse.json({ error: "Guest plans cannot use account recommendation history." }, { status: 400 });
      if (!await allowGuestRequest(request, "itinerary_generation", 5)) return NextResponse.json({ error: "Please wait before generating another itinerary preview." }, { status: 429 });
    }

    const [{ data: log, error: logError }, { data: startDestination, error: destinationError }] = await Promise.all([
      user && parsed.data.recommendationLogId
        ? supabase.from("recommendation_logs").select("recommendations,input_context").eq("id", parsed.data.recommendationLogId).eq("traveler_id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("destinations").select("id,name,region,last_verified_at,next_verification_at")
        .eq("id", parsed.data.startDestinationId).eq("status", "published").eq("verification_status", "verified_official")
        .eq("data_status", "official_tourism").maybeSingle(),
    ]);
    if (logError || destinationError) return NextResponse.json({ error: "Verified planning data could not be checked." }, { status: 503 });
    if (parsed.data.recommendationLogId && !log) return NextResponse.json({ error: "Recommendation history was not found for this account." }, { status: 404 });
    if (!startDestination?.last_verified_at || Date.parse(startDestination.last_verified_at) > Date.now()
      || (startDestination.next_verification_at && Date.parse(startDestination.next_verification_at) <= Date.now())) {
      return NextResponse.json({ error: "Choose a current, verified starting destination." }, { status: 400 });
    }
    if (log && stableJson(log.input_context) !== stableJson(parsed.data.preferences)) {
      return NextResponse.json({ error: "Preferences changed after recommendations were scored. Request recommendations again." }, { status: 409 });
    }

    const [michiResult, externalResult] = await Promise.all([
      getRecommendations(parsed.data.preferences), getExternalRecommendations(parsed.data.preferences),
    ]);
    if (!michiResult.ok && !externalResult.ok) return NextResponse.json({ error: "Verified candidates could not be loaded. Please try again." }, { status: 503 });

    const loggedMichiIds = log ? idsFromLog(log.recommendations, "michi_verified") : null;
    const loggedExternalIds = log ? idsFromLog(log.recommendations, "external_verified") : null;
    const recommendations: RecommendationResult[] = michiResult.ok
      ? michiResult.recommendations.filter((candidate) => !loggedMichiIds || loggedMichiIds.has(candidate.id)).slice(0, 30).map((candidate) => ({
        id: candidate.id, slug: candidate.slug, title: candidate.title, shortDescription: candidate.shortDescription,
        destinationId: candidate.destinationId, destinationName: candidate.destinationName, region: candidate.region,
        priceJpy: candidate.priceJpy, durationMinutes: candidate.durationMinutes, score: candidate.score,
        reasons: candidate.reasons, tradeoffs: candidate.tradeoffs, componentScores: candidate.componentScores,
        evidenceCompleteness: candidate.evidenceCompleteness, recommendationConfidence: candidate.recommendationConfidence,
        destinationHealth: candidate.destinationHealth, sourceMetadata: candidate.sourceMetadata,
        healthProvenance: candidate.healthProvenance, slots: candidate.slots,
        participationRules: candidate.participationRules, cancellationRules: candidate.cancellationRules,
        photographyPolicy: candidate.photographyPolicy,
      })) : [];
    const externalRecommendations: ExternalDiscoveryMatch[] = externalResult.ok
      ? externalResult.matches.filter((candidate) => !loggedExternalIds || loggedExternalIds.has(candidate.id)).slice(0, 30) : [];

    const internalIds = new Set(recommendations.map((candidate) => candidate.id));
    const externalUnique = externalRecommendations.filter((candidate) => !internalIds.has(candidate.id));
    const { data: externalLocations, error: externalLocationError } = externalUnique.length
      ? await supabase.from("external_experiences").select("id,destination_id").in("id", externalUnique.map((candidate) => candidate.id))
      : { data: [], error: null };
    if (externalLocationError) return NextResponse.json({ error: "External listing locations could not be rechecked." }, { status: 503 });
    const externalDestinationById = new Map((externalLocations ?? []).map((item) => [item.id, item.destination_id]));
    const candidates = [
      ...recommendations.map((candidate) => ({
        id: candidate.id, destinationId: candidate.destinationId, title: candidate.title, destination: candidate.destinationName,
        region: candidate.region, score: candidate.score, reasons: candidate.reasons,
        type: "michi_verified" as const, origin: candidate.destinationId === startDestination.id ? "original_preference" as const : "michi_alternative" as const,
        recommendation: candidate,
      })),
      ...externalUnique.flatMap((candidate) => {
        const destinationId = externalDestinationById.get(candidate.id);
        if (!destinationId) return [];
        return [{
        id: candidate.id, destinationId, title: candidate.title, destination: candidate.destinationName,
        region: candidate.region, score: candidate.interestCompatibility, reasons: candidate.matchedInterests.map((tag) => `${tag} interest match`),
        type: "external_verified" as const, origin: destinationId === startDestination.id ? "original_preference" as const : "michi_alternative" as const,
        recommendation: candidate,
        }];
      }),
    ];
    const aiOrder = await organizeWithGemini(candidates.map(({ id, title, destination, origin, score, reasons }) => ({ id, title, destination, origin, score, reasons })), {
      interests: parsed.data.preferences.interests, travelStyle: parsed.data.travelStyle,
    });
    const deterministicOrder = deterministicPlanOrder(candidates);
    const orderedIds = aiOrder?.map((candidate) => candidate.id) ?? deterministicOrder.map((candidate) => candidate.id);
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const explanationById = new Map(aiOrder?.map((candidate) => [candidate.id, candidate.explanation]) ?? []);
    return NextResponse.json({
      startDestination: { id: startDestination.id, name: startDestination.name, region: startDestination.region },
      mode: user ? "authenticated" : "guest",
      recommendationLogId: parsed.data.recommendationLogId ?? null,
      organizer: aiOrder ? "gemini_candidate_order" : "deterministic_order",
      candidates: orderedIds.flatMap((id) => {
        const candidate = byId.get(id);
        if (!candidate) return [];
        return [{ ...candidate, explanation: explanationById.get(id) ?? candidate.reasons[0] ?? "Eligible database candidate." }];
      }),
      inventoryWarnings: { michiUnavailable: !michiResult.ok, externalUnavailable: !externalResult.ok },
      alternativeLimitations: "Alternatives are eligible candidates in a different destination. MICHI has not calculated travel distance or claimed they are lower pressure unless verified health evidence says so.",
    });
  } catch {
    return NextResponse.json({ error: "The itinerary planner is temporarily unavailable." }, { status: 503 });
  }
}
