"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";
import { hostCommunityFeedbackSchema, hostExperienceSchema, hostSettingsSchema } from "./platform-schemas";
import type { HostActionState } from "./actions";

const read = (form: FormData, name: string) => String(form.get(name) ?? "");
const tags = (value: string) => [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function parseImagePaths(value: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) && parsed.length <= 8 && parsed.every((item) => typeof item === "string" && item.length <= 500)
      ? parsed : null;
  } catch { return null; }
}

export async function saveHostExperience(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["host"]);
  const imagePaths = parseImagePaths(read(form, "imagePaths"));
  if (!imagePaths || imagePaths.some((path) => !path.startsWith(`${user.id}/`))) {
    return { success: false, message: "Experience images must belong to this host account." };
  }
  const parsed = hostExperienceSchema.safeParse({
    experienceId: read(form, "experienceId"), destinationId: read(form, "destinationId"),
    title: read(form, "title"), shortDescription: read(form, "shortDescription"),
    description: read(form, "description"), culturalContext: read(form, "culturalContext"),
    priceJpy: read(form, "priceJpy"), durationMinutes: read(form, "durationMinutes"),
    maxCapacity: read(form, "maxCapacity"), languages: read(form, "languages"), interests: read(form, "interests"),
    rulesLanguage: read(form, "rulesLanguage"),
    participationRules: read(form, "participationRules"), etiquetteRules: read(form, "etiquetteRules"),
    eligibility: read(form, "eligibility"), cancellationRules: read(form, "cancellationRules"),
    accessibilityNotes: read(form, "accessibilityNotes"), meetingPoint: read(form, "meetingPoint"),
    latitude: read(form, "latitude"), longitude: read(form, "longitude"),
    photographyPolicy: read(form, "photographyPolicy"),
    stepFree: form.get("stepFree") === "on", wheelchairAccess: form.get("wheelchairAccess") === "on", imagePaths,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Review the experience details." };
  const data = parsed.data;
  if ((!data.experienceId && imagePaths.length > 0) || (data.experienceId && imagePaths.some((path) => !path.startsWith(`${user.id}/${data.experienceId}/`)))) {
    return { success: false, message: "Experience images must belong to this listing." };
  }
  const supabase = await createClient();
  const { data: destination, error: destinationError } = await supabase.from("destinations").select("id")
    .eq("id", data.destinationId).eq("status", "published").maybeSingle();
  if (destinationError || !destination) return { success: false, message: "Choose a published destination." };

  const experienceId = data.experienceId || randomUUID();
  const { data: existing, error: existingError } = data.experienceId
    ? await supabase.from("experiences").select("id,slug,status,is_verified,is_paused,image_paths")
      .eq("id", data.experienceId).eq("host_id", user.id).maybeSingle()
    : { data: null, error: null };
  if (existingError || (data.experienceId && !existing)) return { success: false, message: "Experience not found." };

  const baseSlug = data.title.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "experience";
  const update = {
    destination_id: data.destinationId, title: data.title,
    short_description: data.shortDescription, description: data.description, cultural_context: data.culturalContext,
    price_jpy: data.priceJpy, duration_minutes: data.durationMinutes, max_capacity: data.maxCapacity,
    languages: tags(data.languages), interests: tags(data.interests),
    rules: { participation_rules: data.participationRules, etiquette_rules: data.etiquetteRules, eligibility: data.eligibility, language: data.rulesLanguage },
    booking_policy: { cancellation_rules: data.cancellationRules },
    accessibility: { step_free: form.get("stepFree") === "on", wheelchair_access: form.get("wheelchairAccess") === "on", notes: data.accessibilityNotes },
    photography_policy: data.photographyPolicy, meeting_point: data.meetingPoint,
    latitude: data.latitude, longitude: data.longitude, image_paths: imagePaths,
  };

  const saveResult = existing
    ? await supabase.from("experiences").update(update).eq("id", experienceId).eq("host_id", user.id).select("id").maybeSingle()
    : await supabase.from("experiences").insert({ ...update, id: experienceId, slug: `${baseSlug}-${experienceId.slice(0, 8)}`, host_id: user.id, status: "draft", is_paused: true }).select("id").single();
  if (saveResult.error || !saveResult.data) return { success: false, message: "The experience could not be saved. Confirm your host verification and try again." };

  const removedPaths = (existing?.image_paths ?? []).filter((path) => !imagePaths.includes(path));
  if (removedPaths.length) await supabase.storage.from("experience-images").remove(removedPaths);

  let ruleNotice = "";
  if (existing?.is_verified && existing.status === "published" && !existing.is_paused) {
    const requestHeaders = await headers();
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
    const origin = requestHeaders.get("origin") ?? configuredOrigin;
    try {
      const sourceUrl = new URL(`/experiences/${existing.slug}`, origin ?? "");
      const { error } = await supabase.rpc("sync_host_experience_cultural_rules", { p_experience_id: experienceId, p_source_url: sourceUrl.toString() });
      if (error) ruleNotice = " The listing saved, but the cultural rules index needs a retry.";
    } catch { ruleNotice = " The listing saved, but the cultural rules index needs a retry."; }
  }
  revalidatePath("/host"); revalidatePath("/host/experiences"); revalidatePath(`/host/experiences/${experienceId}`);
  return { success: true, message: existing ? `Changes saved.${ruleNotice}` : `Draft created. Add photos and submit it for MICHI review.`, data: experienceId };
}

export async function changeHostExperienceState(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["host"]);
  const experienceId = read(form, "experienceId");
  const action = read(form, "state");
  if (!uuid(experienceId) || !["publish", "unpublish", "archive", "pause", "resume"].includes(action)) {
    return { success: false, message: "Invalid experience action." };
  }
  const supabase = await createClient();
  const { data: experience, error: lookupError } = await supabase.from("experiences")
    .select("id,slug,status,is_verified,is_paused").eq("id", experienceId).eq("host_id", user.id).maybeSingle();
  if (lookupError || !experience) return { success: false, message: "Experience not found." };

  let update: { status?: "draft" | "published" | "archived"; is_paused?: boolean };
  if (action === "publish") {
    if (!experience.is_verified) return { success: false, message: "MICHI must verify this listing before it can be published." };
    update = { status: "published", is_paused: false };
  } else if (action === "unpublish") update = { status: "draft", is_paused: true };
  else if (action === "archive") update = { status: "archived", is_paused: true };
  else update = { is_paused: action === "pause" };

  const { error } = await supabase.from("experiences").update(update).eq("id", experienceId).eq("host_id", user.id);
  if (error) return { success: false, message: "That change could not be saved." };
  let ruleNotice = "";
  if (action === "publish") {
    const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
    try {
      const url = new URL(`/experiences/${experience.slug}`, origin ?? "").toString();
      const result = await supabase.rpc("sync_host_experience_cultural_rules", { p_experience_id: experienceId, p_source_url: url });
      if (result.error) ruleNotice = " Host rules need to be indexed again.";
    } catch { ruleNotice = " Host rules need to be indexed again."; }
  }
  revalidatePath("/host"); revalidatePath("/host/experiences"); revalidatePath(`/host/experiences/${experienceId}`);
  return { success: true, message: action === "pause" ? "Recommendations paused. Existing confirmed bookings remain valid."
    : action === "resume" ? "Recommendations resumed."
    : action === "archive" ? "Experience archived. Existing bookings remain available in your records."
    : action === "unpublish" ? "Experience unpublished and removed from new recommendations."
    : `Experience published with host-provided rules indexed.${ruleNotice}` };
}

export async function changeHostSlot(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["host"]);
  const slotId = read(form, "slotId");
  const action = read(form, "slotAction");
  if (!uuid(slotId) || !["close", "reopen", "capacity"].includes(action)) return { success: false, message: "Invalid slot update." };
  const supabase = await createClient();
  const { data: slot } = await supabase.from("experience_slots").select("id,experience_id,starts_at,capacity,booked_count,status").eq("id", slotId).maybeSingle();
  if (!slot) return { success: false, message: "Slot not found." };
  const { data: experience } = await supabase.from("experiences").select("id,max_capacity").eq("id", slot.experience_id).eq("host_id", user.id).maybeSingle();
  if (!experience) return { success: false, message: "Slot not found." };
  if (action === "reopen" && new Date(slot.starts_at) <= new Date()) return { success: false, message: "Past slots cannot be reopened." };
  let patch: { status?: "open" | "full" | "closed" | "cancelled"; capacity?: number };
  if (action === "close") patch = { status: "closed" };
  else if (action === "reopen") patch = { status: slot.booked_count >= slot.capacity ? "full" : "open" };
  else {
    const capacity = Number(read(form, "capacity"));
    if (!Number.isInteger(capacity) || capacity < slot.booked_count || capacity > experience.max_capacity) {
      return { success: false, message: `Capacity must be between ${slot.booked_count} reserved guests and the experience maximum (${experience.max_capacity}).` };
    }
    patch = { capacity, status: slot.status === "cancelled" ? "cancelled" : slot.status === "closed" ? "closed" : capacity === slot.booked_count ? "full" : "open" };
  }
  const { error } = await supabase.from("experience_slots").update(patch).eq("id", slotId);
  revalidatePath("/host"); revalidatePath("/host/experiences"); revalidatePath(`/host/experiences/${slot.experience_id}`); revalidatePath("/host/bookings");
  return error ? { success: false, message: "Capacity could not be changed. A reservation may have updated this slot; refresh and retry." }
    : { success: true, message: action === "close" ? "Slot closed to new bookings; existing reservations remain valid." : action === "reopen" ? "Slot reopened to new booking requests." : "Slot capacity updated." };
}

export async function submitHostCommunityFeedback(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["host"]);
  const parsed = hostCommunityFeedbackSchema.safeParse({
    destinationId: read(form, "destinationId"), feedbackCategory: read(form, "feedbackCategory"),
    sentiment: read(form, "sentiment"), pressureScore: read(form, "pressureScore"),
    comment: read(form, "comment"), consent: read(form, "consent"),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Review this feedback." };
  const supabase = await createClient();
  const { data: listing } = await supabase.from("experiences").select("id")
    .eq("host_id", user.id).eq("destination_id", parsed.data.destinationId).limit(1).maybeSingle();
  if (!listing) return { success: false, message: "Choose a destination where you have an experience." };
  const pressure = parsed.data.pressureScore === "" ? null : parsed.data.pressureScore;
  const { error } = await supabase.from("community_feedback").insert({
    destination_id: parsed.data.destinationId, host_id: user.id, author_id: user.id,
    sentiment: parsed.data.sentiment, pressure_score: pressure, comment: parsed.data.comment,
    feedback_category: parsed.data.feedbackCategory, contributor_context: "host",
    consent_to_aggregate: true, consent_given_at: new Date().toISOString(),
  });
  if (error) return { success: false, message: "Your host report could not be recorded." };
  revalidatePath("/host/community"); revalidatePath("/host/analytics");
  return { success: true, message: "Report submitted for review as host-provided context. It will not appear in destination aggregates until approved." };
}

export async function updateHostSettings(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["host"]);
  const parsed = hostSettingsSchema.safeParse({ fullName: read(form, "fullName"), preferredLanguage: read(form, "preferredLanguage") });
  if (!parsed.success) return { success: false, message: "Enter a name and language preference." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.fullName, preferred_language: parsed.data.preferredLanguage }).eq("id", user.id);
  if (error) return { success: false, message: "Account settings could not be saved." };
  revalidatePath("/host/settings");
  return { success: true, message: "Account settings saved." };
}
