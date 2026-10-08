"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";
import { getRecommendations } from "@/server/recommendations/service";
import { getExternalRecommendations } from "@/server/recommendations/external-service";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { stableJson } from "./organizer";
import type { Json, TablesInsert } from "@/types/database";
import { itineraryDecisionSchema, itineraryUpdateSchema, reorderItinerarySchema, saveItinerarySchema, shareItinerarySchema } from "./schemas";

type ActionResult = { success: true; itineraryId?: string; url?: string; shareUrl?: string }
  | { success: false; message: string };

function tokenIds(value: unknown, pathway: string) {
  if (!Array.isArray(value)) return new Set<string>();
  return new Set(value.flatMap((entry) => entry && typeof entry === "object" && "id" in entry && typeof entry.id === "string"
    && "pathway" in entry && entry.pathway === pathway ? [entry.id] : []));
}

function japanDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export async function saveGeneratedItinerary(input: unknown): Promise<ActionResult> {
  const { user } = await requireRole(["traveler"]);
  const parsed = saveItinerarySchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check your plan details." };
  const supabase = await createClient();
  const [{ data: log, error: logError }, { data: start, error: startError }] = await Promise.all([
    parsed.data.recommendationLogId
      ? supabase.from("recommendation_logs").select("recommendations,input_context").eq("id", parsed.data.recommendationLogId).eq("traveler_id", user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("destinations").select("id,name,region,cultural_summary,source_name,source_url,last_verified_at,next_verification_at")
      .eq("id", parsed.data.startDestinationId).eq("status", "published").eq("verification_status", "verified_official")
      .eq("data_status", "official_tourism").maybeSingle(),
  ]);
  if (logError || startError) return { success: false, message: "Verified plan information could not be checked." };
  if ((parsed.data.recommendationLogId && !log) || !start?.last_verified_at || Date.parse(start.last_verified_at) > Date.now()
    || (start.next_verification_at && Date.parse(start.next_verification_at) <= Date.now())) {
    return { success: false, message: "The starting destination is no longer current. Generate the plan again." };
  }
  if (log && stableJson(log.input_context) !== stableJson(parsed.data.preferences)) return { success: false, message: "Preferences changed after recommendations were scored. Generate the plan again." };

  const [michiResult, externalResult] = await Promise.all([
    getRecommendations(parsed.data.preferences), getExternalRecommendations(parsed.data.preferences),
  ]);
  if (!michiResult.ok && !externalResult.ok) return { success: false, message: "Current experience information could not be verified." };
  const loggedMichi = log ? tokenIds(log.recommendations, "michi_verified") : null;
  const loggedExternal = log ? tokenIds(log.recommendations, "external_verified") : null;
  const michi = new Map((michiResult.ok ? michiResult.recommendations : []).filter((item) => !loggedMichi || loggedMichi.has(item.id)).map((item) => [item.id, item]));
  const external = new Map((externalResult.ok ? externalResult.matches : []).filter((item) => !loggedExternal || loggedExternal.has(item.id)).map((item) => [item.id, item]));
  const chosen = parsed.data.selected;
  for (const item of chosen) {
    if (item.candidateType === "michi_verified" && (!michi.has(item.candidateId) || !item.slotId)) {
      return { success: false, message: "A selected MICHI experience is no longer eligible. Generate the plan again." };
    }
    if (item.candidateType === "external_verified" && (!external.has(item.candidateId) || item.slotId !== null)) {
      return { success: false, message: "A selected external experience could not be reverified." };
    }
  }

  const selectedSlotIds = chosen.flatMap((item) => item.slotId ? [item.slotId] : []);
  const { data: slots, error: slotsError } = selectedSlotIds.length
    ? await supabase.from("experience_slots").select("id,experience_id,starts_at,ends_at,capacity,booked_count,status")
      .in("id", selectedSlotIds).gt("starts_at", new Date().toISOString())
    : { data: [], error: null };
  if (slotsError || (slots ?? []).length !== selectedSlotIds.length) return { success: false, message: "A selected time is no longer available. Generate the plan again." };
  const slotById = new Map((slots ?? []).map((slot) => [slot.id, slot]));
  const selectedIntervals: Array<{ startsAt: number; endsAt: number }> = [];
  for (const selected of chosen.filter((item) => item.candidateType === "michi_verified")) {
    const candidate = michi.get(selected.candidateId)!;
    const slot = slotById.get(selected.slotId!);
    if (!slot || slot.experience_id !== candidate.id || slot.status !== "open" || slot.capacity <= slot.booked_count
      || japanDate(slot.starts_at) < parsed.data.preferences.startDate || japanDate(slot.starts_at) > parsed.data.preferences.endDate) {
      return { success: false, message: "A selected MICHI time has filled or closed. Generate the plan again." };
    }
    const interval = { startsAt: Date.parse(slot.starts_at), endsAt: Date.parse(slot.ends_at) };
    if (selectedIntervals.some((existing) => interval.startsAt < existing.endsAt && existing.startsAt < interval.endsAt)) {
      return { success: false, message: "Selected experiences overlap. Choose a different time." };
    }
    selectedIntervals.push(interval);
  }

  const externalIds = chosen.filter((item) => item.candidateType === "external_verified").map((item) => item.candidateId);
  const { data: externalRows, error: externalRowsError } = externalIds.length
    ? await supabase.from("external_experiences").select("id,destination_id,title,short_description,source_name,source_url,last_verified_at,price_min_jpy,duration_minutes,booking_mode,official_url")
      .in("id", externalIds).in("verification_status", ["verified_official", "verified_primary"])
      .in("data_status", ["verified_official", "verified_primary", "official_tourism"])
    : { data: [], error: null };
  if (externalRowsError || (externalRows ?? []).length !== externalIds.length) return { success: false, message: "An external source listing changed. Generate the plan again." };
  const externalRowById = new Map((externalRows ?? []).map((item) => [item.id, item]));
  const destinationIds = [...new Set([start.id, ...[...michi.values()].filter((item) => chosen.some((selection) => selection.candidateId === item.id)).map((item) => item.destinationId), ...(externalRows ?? []).map((item) => item.destination_id)])];
  const [{ data: destinations, error: destinationsError }, health] = await Promise.all([
    supabase.from("destinations").select("id,name,region,cultural_summary,source_name,source_url,last_verified_at,next_verification_at")
      .in("id", destinationIds).eq("status", "published").eq("verification_status", "verified_official").eq("data_status", "official_tourism"),
    getDestinationHealthForDestinations(destinationIds),
  ]);
  if (destinationsError) return { success: false, message: "Destination details could not be refreshed." };
  const destinationsById = new Map((destinations ?? []).map((item) => [item.id, item]));
  if (destinationIds.some((id) => !destinationsById.has(id))) return { success: false, message: "A destination is no longer current. Generate the plan again." };

  const { data: itinerary, error: createError } = await supabase.from("itineraries").insert({
    traveler_id: user.id,
    name: parsed.data.name,
    start_date: parsed.data.preferences.startDate,
    end_date: parsed.data.preferences.endDate,
    budget_jpy: parsed.data.preferences.budgetJpy,
    interests: parsed.data.preferences.interests as unknown as Json,
    preferences: { ...parsed.data.preferences, startDestinationId: start.id, travelStyle: parsed.data.travelStyle } as unknown as Json,
    visibility: "private",
    status: "planned",
  }).select("id").single();
  if (createError || !itinerary) return { success: false, message: "Your itinerary could not be saved." };

  const startHealth = health[start.id];
  const rows: TablesInsert<"itinerary_items">[] = [{
    itinerary_id: itinerary.id, destination_id: start.id, item_type: "destination", title: start.name, sequence: 0,
    rationale: "Starting destination selected by the traveler.", estimated_cost_jpy: 0, cost_status: "known",
    cultural_context_snapshot: start.cultural_summary ?? "", transport_estimate: { status: "unavailable", distance_km: null, duration_minutes: null, source: null } as unknown as Json,
    data_status: "official_destination", booking_mode: "not_applicable", availability_status: "not_applicable",
    destination_health_score: startHealth?.score ?? null, destination_health_status: startHealth?.status ?? "Unavailable",
    crowd_score: startHealth?.componentScores?.crowdPressure ?? null, local_benefit_score: null,
    source_name: start.source_name, source_url: start.source_url, source_verified_at: start.last_verified_at,
    suggestion_origin: "original_preference",
  }];
  for (let index = 0; index < chosen.length; index += 1) {
    const selection = chosen[index];
    if (selection.candidateType === "michi_verified") {
      const candidate = michi.get(selection.candidateId)!;
      const slot = slotById.get(selection.slotId!)!;
      const candidateHealth = health[candidate.destinationId];
      rows.push({
        itinerary_id: itinerary.id, destination_id: candidate.destinationId, experience_id: candidate.id,
        item_type: "experience", title: candidate.title, starts_at: slot.starts_at, ends_at: slot.ends_at, sequence: index + 1,
        rationale: candidate.reasons.join(" · "), estimated_cost_jpy: candidate.priceJpy, cost_status: "known",
        cultural_context_snapshot: candidate.culturalContext, transport_estimate: { status: "unavailable", distance_km: null, duration_minutes: null, source: null } as unknown as Json,
        data_status: "michi_verified", booking_mode: "michi", availability_status: "verified_available_at_check",
        availability_checked_at: new Date().toISOString(), destination_health_score: candidateHealth?.score ?? null,
        destination_health_status: candidateHealth?.status ?? "Unavailable", crowd_score: candidateHealth?.componentScores?.crowdPressure ?? null,
        local_benefit_score: candidate.componentScores.localBenefit, recommendation_score: candidate.score,
        source_name: "MICHI verified host", source_url: null, source_verified_at: null, suggestion_origin: selection.suggestionOrigin,
      });
    } else {
      const candidate = external.get(selection.candidateId)!;
      const row = externalRowById.get(selection.candidateId)!;
      rows.push({
        itinerary_id: itinerary.id, destination_id: row.destination_id, external_experience_id: row.id,
        item_type: "experience", title: candidate.title, sequence: index + 1,
        rationale: `Verified interest overlap: ${candidate.matchedInterests.join(", ")}`,
        estimated_cost_jpy: row.price_min_jpy ?? 0, cost_status: row.price_min_jpy === null ? "unknown" : "known",
        cultural_context_snapshot: row.short_description ?? "", transport_estimate: { status: "unavailable", distance_km: null, duration_minutes: null, source: null } as unknown as Json,
        data_status: "external_verified", booking_mode: row.booking_mode === "external" ? "external" : "information_only",
        availability_status: "not_integrated", destination_health_score: null, destination_health_status: "Unavailable",
        crowd_score: null, local_benefit_score: null, recommendation_score: null, interest_compatibility: candidate.interestCompatibility,
        source_name: row.source_name, source_url: row.source_url, source_verified_at: row.last_verified_at,
        suggestion_origin: selection.suggestionOrigin,
      });
    }
  }
  const { error: itemError } = await supabase.from("itinerary_items").insert(rows);
  if (itemError) {
    await supabase.from("itineraries").delete().eq("id", itinerary.id).eq("traveler_id", user.id);
    return { success: false, message: "The plan could not be saved completely. Please try again." };
  }
  return { success: true, itineraryId: itinerary.id, url: `/traveler/plan/${itinerary.id}` };
}

export async function recordItineraryDecision(input: unknown): Promise<ActionResult> {
  const { user } = await requireRole(["traveler"]);
  const parsed = itineraryDecisionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "That plan choice could not be saved." };
  const supabase = await createClient();
  const row = {
    traveler_id: user.id, recommendation_log_id: parsed.data.recommendationLogId,
    experience_id: parsed.data.candidateType === "michi_verified" ? parsed.data.candidateId : null,
    external_experience_id: parsed.data.candidateType === "external_verified" ? parsed.data.candidateId : null,
    decision: parsed.data.decision, suggestion_origin: parsed.data.suggestionOrigin,
  };
  const { error } = await supabase.from("itinerary_decisions").insert(row);
  return error ? { success: false, message: "Your choice could not be recorded. Try again." } : { success: true };
}

export async function updateItinerary(input: unknown): Promise<ActionResult> {
  const { user } = await requireRole(["traveler"]);
  const parsed = itineraryUpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check the plan details." };
  const supabase = await createClient();
  const { data: scheduledItems, error: scheduledError } = await supabase.from("itinerary_items").select("starts_at,ends_at")
    .eq("itinerary_id", parsed.data.itineraryId).not("starts_at", "is", null);
  if (scheduledError) return { success: false, message: "The itinerary schedule could not be checked." };
  const dayInJapan = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
  if ((scheduledItems ?? []).some((item) => !item.starts_at || dayInJapan(item.starts_at) < parsed.data.startDate || dayInJapan(item.starts_at) > parsed.data.endDate)) {
    return { success: false, message: "The selected dates would exclude a scheduled experience. Rebuild the itinerary for different dates." };
  }
  const { data: current, error: currentError } = await supabase.from("itineraries").select("preferences")
    .eq("id", parsed.data.itineraryId).eq("traveler_id", user.id).maybeSingle();
  if (currentError || !current) return { success: false, message: "The itinerary could not be updated." };
  const storedPreferences = current.preferences && typeof current.preferences === "object" && !Array.isArray(current.preferences)
    ? current.preferences as Record<string, Json> : {};
  const { data, error } = await supabase.from("itineraries").update({
    name: parsed.data.name, start_date: parsed.data.startDate, end_date: parsed.data.endDate, budget_jpy: parsed.data.budgetJpy,
    preferences: { ...storedPreferences, startDate: parsed.data.startDate, endDate: parsed.data.endDate, budgetJpy: parsed.data.budgetJpy } as Json,
  }).eq("id", parsed.data.itineraryId).eq("traveler_id", user.id).select("id").maybeSingle();
  return error || !data ? { success: false, message: "The itinerary could not be updated." } : { success: true };
}

export async function deleteItinerary(itineraryId: string): Promise<ActionResult> {
  const { user } = await requireRole(["traveler"]);
  if (!/^[0-9a-f-]{36}$/i.test(itineraryId)) return { success: false, message: "Invalid itinerary." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("itineraries").delete().eq("id", itineraryId).eq("traveler_id", user.id).select("id").maybeSingle();
  return error || !data ? { success: false, message: "The itinerary could not be deleted." } : { success: true, url: "/traveler/plan" };
}

export async function duplicateItinerary(itineraryId: string): Promise<ActionResult> {
  const { user } = await requireRole(["traveler"]);
  if (!/^[0-9a-f-]{36}$/i.test(itineraryId)) return { success: false, message: "Invalid itinerary." };
  const supabase = await createClient();
  const [{ data: source, error: sourceError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("itineraries").select("name,start_date,end_date,budget_jpy,interests,preferences,status").eq("id", itineraryId).eq("traveler_id", user.id).maybeSingle(),
    supabase.from("itinerary_items").select("destination_id,experience_id,external_experience_id,item_type,title,starts_at,ends_at,sequence,rationale,estimated_cost_jpy,crowd_score,local_benefit_score,cultural_context_snapshot,transport_estimate,data_status,booking_mode,availability_status,destination_health_score,destination_health_status,recommendation_score,interest_compatibility,cost_status,source_name,source_url,source_verified_at,availability_checked_at,suggestion_origin").eq("itinerary_id", itineraryId).order("sequence"),
  ]);
  if (sourceError || itemsError || !source) return { success: false, message: "The itinerary could not be copied." };
  const { data: copy, error } = await supabase.from("itineraries").insert({
    traveler_id: user.id, name: `${source.name} (copy)`.slice(0, 80), start_date: source.start_date,
    end_date: source.end_date, budget_jpy: source.budget_jpy, interests: source.interests, preferences: source.preferences,
    status: "draft", visibility: "private", share_token: null,
  }).select("id").single();
  if (error || !copy) return { success: false, message: "The itinerary could not be copied." };
  if (items?.length) {
    const { error: copyError } = await supabase.from("itinerary_items").insert(items.map((item) => ({ ...item, itinerary_id: copy.id })));
    if (copyError) {
      await supabase.from("itineraries").delete().eq("id", copy.id).eq("traveler_id", user.id);
      return { success: false, message: "The itinerary copy could not be completed." };
    }
  }
  return { success: true, itineraryId: copy.id, url: `/traveler/plan/${copy.id}` };
}

export async function reorderItinerary(input: unknown): Promise<ActionResult> {
  await requireRole(["traveler"]);
  const parsed = reorderItinerarySchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid itinerary order." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reorder_itinerary_items", { p_itinerary_id: parsed.data.itineraryId, p_item_ids: parsed.data.itemIds });
  return error || !data ? { success: false, message: "The order could not be saved." } : { success: true };
}

export async function deleteItineraryItem(itemId: string): Promise<ActionResult> {
  await requireRole(["traveler"]);
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) return { success: false, message: "Invalid itinerary item." };
  const supabase = await createClient();
  const { data: item } = await supabase.from("itinerary_items").select("id").eq("id", itemId).maybeSingle();
  if (!item) return { success: false, message: "The item could not be found." };
  const { error } = await supabase.from("itinerary_items").delete().eq("id", itemId);
  if (error) return { success: false, message: "The item could not be removed." };
  return { success: true };
}

export async function setItinerarySharing(input: unknown): Promise<ActionResult> {
  const { user } = await requireRole(["traveler"]);
  const parsed = shareItinerarySchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Sharing preference is invalid." };
  const supabase = await createClient();
  const shareToken = parsed.data.shared ? randomUUID() : null;
  const { data, error } = await supabase.from("itineraries").update({
    visibility: parsed.data.shared ? "shared" : "private", share_token: shareToken,
  }).eq("id", parsed.data.itineraryId).eq("traveler_id", user.id).select("id").maybeSingle();
  if (error || !data) return { success: false, message: "The sharing preference could not be saved." };
  if (!shareToken) return { success: true };
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return { success: false, message: "Sharing is enabled, but the public link could not be created." };
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { success: true, shareUrl: `${protocol}://${host}/share/itinerary/${shareToken}` };
}
