"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";
import { experienceDraftSchema, slotDraftSchema } from "./inventory-schemas";
import type { HostActionState } from "./actions";

const read = (form: FormData, name: string) => String(form.get(name) ?? "");
const tags = (value: string) => [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 12);

export async function createHostExperience(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["host"]);
  const parsed = experienceDraftSchema.safeParse({
    destinationId: read(form, "destinationId"), title: read(form, "title"),
    shortDescription: read(form, "shortDescription"), description: read(form, "description"),
    culturalContext: read(form, "culturalContext"), priceJpy: read(form, "priceJpy"),
    durationMinutes: read(form, "durationMinutes"), maxCapacity: read(form, "maxCapacity"),
    languages: read(form, "languages"), interests: read(form, "interests"),
    participationRules: read(form, "participationRules"), cancellationRules: read(form, "cancellationRules"),
    accessibilityNotes: read(form, "accessibilityNotes"), meetingPoint: read(form, "meetingPoint"),
    photographyPolicy: read(form, "photographyPolicy"),
    stepFree: form.get("stepFree") === "on", wheelchairAccess: form.get("wheelchairAccess") === "on",
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check listing details." };
  const data = parsed.data;
  const supabase = await createClient();
  const { data: destination } = await supabase.from("destinations").select("id").eq("id", data.destinationId).eq("status", "published").maybeSingle();
  if (!destination) return { success: false, message: "Select a published destination." };
  const slug = `${data.title.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "experience"}-${randomUUID().slice(0, 8)}`;
  const { error } = await supabase.from("experiences").insert({
    host_id: user.id, destination_id: data.destinationId, slug, title: data.title,
    short_description: data.shortDescription, description: data.description,
    cultural_context: data.culturalContext, price_jpy: data.priceJpy,
    duration_minutes: data.durationMinutes, max_capacity: data.maxCapacity,
    languages: tags(data.languages), interests: tags(data.interests),
    rules: { participation_rules: data.participationRules },
    booking_policy: { cancellation_rules: data.cancellationRules },
    accessibility: { step_free: data.stepFree, wheelchair_access: data.wheelchairAccess, notes: data.accessibilityNotes },
    photography_policy: data.photographyPolicy, meeting_point: data.meetingPoint,
    status: "draft", is_paused: true,
  });
  return error ? { success: false, message: "The listing could not be saved. Check your host verification status." }
    : { success: true, message: "Draft saved. An admin must review it before publication." };
}

export async function createExperienceSlot(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["host"]);
  const parsed = slotDraftSchema.safeParse({ experienceId: read(form, "experienceId"), startsAt: read(form, "startsAt"), endsAt: read(form, "endsAt"), capacity: read(form, "capacity") });
  if (!parsed.success) return { success: false, message: "Check the slot dates and capacity." };
  const startsAt = new Date(`${parsed.data.startsAt}:00+09:00`);
  const endsAt = new Date(`${parsed.data.endsAt}:00+09:00`);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt <= new Date() || endsAt <= startsAt) {
    return { success: false, message: "Choose a future Japan-time slot with an end after the start." };
  }
  const supabase = await createClient();
  const { data: experience } = await supabase.from("experiences").select("id,max_capacity")
    .eq("id", parsed.data.experienceId).eq("host_id", user.id).maybeSingle();
  if (!experience || parsed.data.capacity > Number(experience.max_capacity)) return { success: false, message: "Capacity exceeds this experience's maximum." };
  const { error } = await supabase.from("experience_slots").insert({
    experience_id: parsed.data.experienceId, starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(), capacity: parsed.data.capacity, status: "open",
  });
  return error ? { success: false, message: "The slot could not be saved." }
    : { success: true, message: "Real dated availability saved. Existing bookings remain unchanged." };
}

export async function changeExperiencePause(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["host"]);
  const experienceId = read(form, "experienceId");
  if (!/^[0-9a-f-]{36}$/i.test(experienceId)) return { success: false, message: "Invalid experience." };
  const pause = read(form, "pause") === "true";
  const supabase = await createClient();
  const { data, error } = await supabase.from("experiences").update({ is_paused: pause })
    .eq("id", experienceId).eq("host_id", user.id).select("id").maybeSingle();
  return error || !data ? { success: false, message: "The visibility change could not be saved." }
    : { success: true, message: pause ? "Recommendations paused. Confirmed bookings remain." : "Recommendations resumed." };
}

export async function closeExperienceSlot(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["host"]);
  const slotId = read(form, "slotId");
  if (!/^[0-9a-f-]{36}$/i.test(slotId)) return { success: false, message: "Invalid slot." };
  const supabase = await createClient();
  const { data: slot } = await supabase.from("experience_slots").select("id,experience_id").eq("id", slotId).maybeSingle();
  if (!slot) return { success: false, message: "Slot not found." };
  const { data: experience } = await supabase.from("experiences").select("id").eq("id", String(slot.experience_id)).eq("host_id", user.id).maybeSingle();
  if (!experience) return { success: false, message: "Slot not found." };
  const { error } = await supabase.from("experience_slots").update({ status: "closed" }).eq("id", slotId);
  return error ? { success: false, message: "The slot could not be closed." }
    : { success: true, message: "Slot closed to new requests. Existing bookings remain." };
}

export async function confirmHostBooking(_state: HostActionState, form: FormData): Promise<HostActionState> {
  await requireRole(["host"]);
  const bookingId = read(form, "bookingId");
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { success: false, message: "Invalid booking." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_experience_booking", { p_booking_id: bookingId });
  revalidatePath("/host/bookings"); revalidatePath("/traveler/bookings");
  return error ? { success: false, message: "The booking could not be confirmed." }
    : { success: true, message: "Booking confirmed." };
}

export async function declineHostBooking(_state: HostActionState, form: FormData): Promise<HostActionState> {
  await requireRole(["host"]);
  const bookingId = read(form, "bookingId");
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { success: false, message: "Invalid booking." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_experience_booking", { p_booking_id: bookingId });
  revalidatePath("/host/bookings"); revalidatePath("/traveler/bookings");
  return error ? { success: false, message: "The request could not be declined." }
    : { success: true, message: "Request declined and its pending capacity released." };
}

export async function cancelHostBooking(_state: HostActionState, form: FormData): Promise<HostActionState> {
  await requireRole(["host"]);
  const bookingId = read(form, "bookingId");
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { success: false, message: "Invalid booking." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_host_experience_booking", { p_booking_id: bookingId });
  revalidatePath("/host/bookings"); revalidatePath("/traveler/bookings");
  return error ? { success: false, message: "The booking could not be cancelled." }
    : { success: true, message: "Booking cancelled and capacity released. The traveler was notified." };
}

export async function completeHostBooking(_state: HostActionState, form: FormData): Promise<HostActionState> {
  await requireRole(["host"]);
  const bookingId = read(form, "bookingId");
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { success: false, message: "Invalid booking." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_experience_booking", { p_booking_id: bookingId });
  revalidatePath("/host/bookings"); revalidatePath("/traveler/bookings");
  return error ? { success: false, message: "Only a confirmed visit that has started can be marked complete." }
    : { success: true, message: "Visit marked completed." };
}

export async function approveHostExperience(_state: HostActionState, form: FormData): Promise<HostActionState> {
  await requireRole(["admin"]);
  const experienceId = read(form, "experienceId");
  if (!/^[0-9a-f-]{36}$/i.test(experienceId)) return { success: false, message: "Invalid experience." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_host_experience", { p_experience_id: experienceId });
  return error ? { success: false, message: "Experience could not be approved. Check host authorization and listing details." }
    : { success: true, message: "Experience approved and published." };
}
