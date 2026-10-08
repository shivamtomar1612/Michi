import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bookingRequestSchema } from "@/features/bookings/schemas";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const body = await request.text();
  if (body.length > 4096) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let json: unknown;
  try { json = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = bookingRequestSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Check slot, guest count, and rules acknowledgment." }, { status: 400 });
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to request a booking." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "traveler") return NextResponse.json({ error: "A traveler account is required." }, { status: 403 });
    const { data: bookingId, error } = await supabase.rpc("request_experience_booking", {
      p_slot_id: parsed.data.slotId, p_guests: parsed.data.guests,
      p_rule_acknowledgment: { acknowledged: parsed.data.acknowledged },
      p_notes: parsed.data.notes,
      p_cultural_requirements: Object.fromEntries(Object.entries(parsed.data.culturalRequirements).filter(([, value]) => value?.trim())),
    });
    if (error || !bookingId) return NextResponse.json({ error: "This slot could not be reserved. It may no longer have capacity." }, { status: 409 });
    const { data: booking, error: bookingError } = await supabase.from("bookings").select("booking_reference").eq("id", bookingId).single();
    revalidatePath("/traveler/bookings"); revalidatePath("/host/bookings");
    return NextResponse.json({ bookingId, bookingReference: bookingError ? null : booking.booking_reference, status: "pending" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Booking service is unavailable." }, { status: 503 });
  }
}
