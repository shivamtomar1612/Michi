import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { passportReflectionSchema } from "@/features/passport/reflection-schema";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const body = await request.text();
  if (body.length > 5000) return NextResponse.json({ error: "Reflection is too long." }, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Review the reflection form and try again." }, { status: 400 });
  }
  const parsed = passportReflectionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Complete the reflection fields with valid scores." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in as a traveler to save your reflection." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "traveler") return NextResponse.json({ error: "A traveler account is required." }, { status: 403 });

    const { error } = await supabase.rpc("submit_experience_reflection", {
      p_booking_id: parsed.data.bookingId,
      p_learning_reflection: parsed.data.learningReflection,
      p_cultural_preparation_completed: parsed.data.culturalPreparationCompleted,
      p_preparation_helpfulness: parsed.data.preparationHelpfulness,
      p_understanding_score: parsed.data.understandingScore,
      p_host_rating: parsed.data.hostRating,
      p_cultural_depth_score: parsed.data.culturalDepthScore,
    });
    if (error) {
      const duplicate = error.code === "23505";
      return NextResponse.json({ error: duplicate ? "A reflection has already been saved for this visit." : "This reflection could not be saved for that booking." }, { status: duplicate ? 409 : 422 });
    }
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "Passport service is temporarily unavailable." }, { status: 503 });
  }
}
