import { NextResponse, type NextRequest } from "next/server";
import { recommendationFeedbackSchema } from "@/features/recommendations/schemas";
import { createClient } from "@/lib/supabase/server";
import { readBoundedRequestBody } from "@/server/security/request-body";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const bodyResult = await readBoundedRequestBody(request, 2048);
  if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.status === 413 ? "Decision payload is too large." : "Invalid request body." }, { status: bodyResult.status });

  let json: unknown;
  try {
    json = JSON.parse(bodyResult.body);
  } catch {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  }
  const parsed = recommendationFeedbackSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to save your choice." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Traveler account could not be checked." }, { status: 503 });
    if (profile?.role !== "traveler") return NextResponse.json({ error: "Choices are available to traveler accounts." }, { status: 403 });

    const { data: log, error: logError } = await supabase.from("recommendation_logs")
      .select("recommendations").eq("id", parsed.data.recommendationLogId).eq("traveler_id", user.id).maybeSingle();
    if (logError) return NextResponse.json({ error: "Recommendation history could not be checked." }, { status: 503 });
    const recommendations = Array.isArray(log?.recommendations) ? log.recommendations : [];
    const belongsToLog = recommendations.some((recommendation) => typeof recommendation === "object" && recommendation !== null
      && "id" in recommendation && recommendation.id === parsed.data.experienceId);
    if (!belongsToLog) return NextResponse.json({ error: "This experience is not part of your recommendation." }, { status: 404 });

    const { data: existing, error: existingError } = await supabase.from("recommendation_feedback").select("id")
      .eq("recommendation_log_id", parsed.data.recommendationLogId).eq("experience_id", parsed.data.experienceId).maybeSingle();
    if (existingError) return NextResponse.json({ error: "Your choice could not be saved." }, { status: 503 });
    if (existing) {
      const { error } = await supabase.from("recommendation_feedback").update({ decision: parsed.data.decision }).eq("id", existing.id as string);
      if (error) return NextResponse.json({ error: "Your choice could not be saved." }, { status: 503 });
    } else {
      const { error } = await supabase.from("recommendation_feedback").insert({
        recommendation_log_id: parsed.data.recommendationLogId,
        traveler_id: user.id,
        experience_id: parsed.data.experienceId,
        decision: parsed.data.decision,
      });
      if (error) return NextResponse.json({ error: "Your choice could not be saved." }, { status: 503 });
    }
    return NextResponse.json({ decision: parsed.data.decision });
  } catch {
    return NextResponse.json({ error: "Choice service is unavailable." }, { status: 503 });
  }
}
