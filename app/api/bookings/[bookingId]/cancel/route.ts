import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({ bookingId: z.uuid() });

export async function POST(request: NextRequest, context: { params: Promise<{ bookingId: string }> }) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to manage this booking." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "traveler") return NextResponse.json({ error: "A traveler account is required." }, { status: 403 });
    const { error } = await supabase.rpc("cancel_experience_booking", { p_booking_id: parsed.data.bookingId });
    if (error) return NextResponse.json({ error: "This booking cannot be cancelled online. Contact the host if the visit is near." }, { status: 409 });
    revalidatePath("/traveler/bookings"); revalidatePath("/host/bookings");
    return NextResponse.json({ status: "cancelled" });
  } catch {
    return NextResponse.json({ error: "Booking service is unavailable." }, { status: 503 });
  }
}
