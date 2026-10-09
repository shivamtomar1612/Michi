import { NextResponse, type NextRequest } from "next/server";
import { destinationHealthEventSchema } from "@/lib/analytics/events";
import { createClient } from "@/lib/supabase/server";
import { readBoundedRequestBody } from "@/server/security/request-body";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  const bodyResult = await readBoundedRequestBody(request, 2048);
  if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.status === 413 ? "Event payload is too large." : "Invalid request body." }, { status: bodyResult.status });

  let json: unknown;
  try {
    json = JSON.parse(bodyResult.body);
  } catch {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }

  const parsed = destinationHealthEventSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });

  const { eventName, destinationId, experienceId, sessionId, targetDestinationId, alternativeCount, recommendationCount, experienceCount } = parsed.data;
  const metadata = {
    ...(targetDestinationId ? { target_destination_id: targetDestinationId } : {}),
    ...(alternativeCount !== undefined ? { alternative_count: alternativeCount } : {}),
    ...(recommendationCount !== undefined ? { recommendation_count: recommendationCount } : {}),
    ...(experienceCount !== undefined ? { experience_count: experienceCount } : {}),
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("analytics_events").insert({
      user_id: null,
      session_id: sessionId,
      event_name: eventName,
      destination_id: destinationId,
      experience_id: experienceId ?? null,
      metadata,
    });
    if (error) return NextResponse.json({ error: "Event could not be recorded." }, { status: 503 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Event could not be recorded." }, { status: 503 });
  }
}
