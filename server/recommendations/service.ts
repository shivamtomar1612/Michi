import "server-only";
import { rankRecommendations } from "@/features/recommendations/engine";
import type { RecommendationCandidate, RecommendationPreferences } from "@/features/recommendations/types";
import { getDestinationHealthForDestinations } from "@/server/destination-health/service";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const experienceRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  short_description: z.string(),
  destination_id: z.string().uuid(),
  price_jpy: z.number().int().min(0),
  duration_minutes: z.number().int().positive(),
  accessibility: z.record(z.string(), z.unknown()),
  languages: z.array(z.string()),
  interests: z.array(z.string()),
  rules: z.record(z.string(), z.unknown()),
  cultural_context: z.string(),
  photography_policy: z.string(),
  booking_policy: z.record(z.string(), z.unknown()),
  status: z.enum(["draft", "published", "paused", "archived"]),
  is_verified: z.boolean(),
  is_paused: z.boolean(),
}));

const destinationRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  region: z.string().min(1),
  source_name: z.string().min(1),
  source_url: z.string().url().refine((value) => new URL(value).protocol === "https:"),
  last_verified_at: z.string().datetime({ offset: true }),
  next_verification_at: z.string().datetime({ offset: true }).nullable(),
}));

const slotRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  experience_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  capacity: z.number().int().positive(),
  booked_count: z.number().int().nonnegative(),
  status: z.enum(["open", "full", "cancelled", "closed"]),
}));

function utcStart(date: string): string {
  return new Date(`${date}T00:00:00.000+09:00`).toISOString();
}

function utcEndExclusive(date: string): string {
  const end = new Date(`${date}T00:00:00.000+09:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export type RecommendationServiceResult =
  | { ok: true; recommendations: ReturnType<typeof rankRecommendations> }
  | { ok: false };

export async function getRecommendations(preferences: RecommendationPreferences): Promise<RecommendationServiceResult> {
  try {
    const supabase = await createClient();
    const { data: rawExperiences, error: experienceError } = await supabase
      .from("experiences")
      .select("id,slug,title,short_description,destination_id,price_jpy,duration_minutes,accessibility,languages,interests,rules,cultural_context,photography_policy,booking_policy,status,is_verified,is_paused")
      .eq("status", "published")
      .eq("is_verified", true)
      .eq("is_paused", false)
      .order("title")
      .limit(301);

    if (experienceError) return { ok: false };
    if ((rawExperiences ?? []).length > 300) return { ok: false };
    const parsedExperiences = experienceRowsSchema.safeParse(rawExperiences ?? []);
    if (!parsedExperiences.success || !parsedExperiences.data.length) return parsedExperiences.success ? { ok: true, recommendations: [] } : { ok: false };

    const destinationIds = [...new Set(parsedExperiences.data.map((experience) => experience.destination_id))];
    const experienceIds = parsedExperiences.data.map((experience) => experience.id);
    const [{ data: rawDestinations, error: destinationError }, { data: rawSlots, error: slotError }] = await Promise.all([
      supabase.from("destinations").select("id,name,region,source_name,source_url,last_verified_at,next_verification_at")
        .in("id", destinationIds).eq("status", "published").eq("verification_status", "verified_official").eq("data_status", "official_tourism"),
      supabase.from("experience_slots").select("id,experience_id,starts_at,ends_at,capacity,booked_count,status")
        .in("experience_id", experienceIds).gte("starts_at", utcStart(preferences.startDate))
        .gt("starts_at", new Date().toISOString())
        .lt("starts_at", utcEndExclusive(preferences.endDate)).order("starts_at").limit(3001),
    ]);
    if (destinationError || slotError) return { ok: false };
    if ((rawSlots ?? []).length > 3000) return { ok: false };

    const parsedDestinations = destinationRowsSchema.safeParse(rawDestinations ?? []);
    const parsedSlots = slotRowsSchema.safeParse(rawSlots ?? []);
    if (!parsedDestinations.success || !parsedSlots.success) return { ok: false };

    const now = Date.now();
    const currentDestinations = parsedDestinations.data.filter((destination) => Date.parse(destination.last_verified_at) <= now
      && (destination.next_verification_at === null || Date.parse(destination.next_verification_at) > now));
    const destinationById = new Map(currentDestinations.map((destination) => [destination.id, destination]));
    const slotsByExperience = new Map<string, typeof parsedSlots.data>();
    for (const slot of parsedSlots.data) {
      if (!slotsByExperience.has(slot.experience_id)) slotsByExperience.set(slot.experience_id, []);
      slotsByExperience.get(slot.experience_id)!.push(slot);
    }

    const validDestinationIds = [...new Set(parsedExperiences.data
      .filter((experience) => destinationById.has(experience.destination_id))
      .map((experience) => experience.destination_id))];
    const healthByDestination = await getDestinationHealthForDestinations(validDestinationIds);

    const candidates: RecommendationCandidate[] = parsedExperiences.data.flatMap((experience) => {
      const destination = destinationById.get(experience.destination_id);
      const destinationHealth = healthByDestination[experience.destination_id];
      if (!destination || !destinationHealth) return [];
      const rules = record(experience.rules);
      return [{
        id: experience.id,
        slug: experience.slug,
        title: experience.title,
        shortDescription: experience.short_description,
        destinationId: experience.destination_id,
        destinationName: destination.name,
        region: destination.region,
        priceJpy: experience.price_jpy,
        durationMinutes: experience.duration_minutes,
        interests: experience.interests,
        languages: experience.languages,
        accessibility: record(experience.accessibility),
        dietaryOptions: stringArray(rules.dietary_preferences),
        culturalContext: experience.cultural_context,
        participationRules: typeof rules.participation_rules === "string" ? rules.participation_rules : "Rules not provided",
        cancellationRules: typeof record(experience.booking_policy).cancellation_rules === "string" ? String(record(experience.booking_policy).cancellation_rules) : "Ask the host",
        photographyPolicy: experience.photography_policy,
        status: experience.status,
        isVerified: experience.is_verified,
        isPaused: experience.is_paused,
        slots: (slotsByExperience.get(experience.id) ?? []).map((slot) => ({
          id: slot.id,
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
          capacity: slot.capacity,
          bookedCount: slot.booked_count,
          status: slot.status,
        })),
        destinationHealth,
        sourceMetadata: {
          experience: { sourceType: "host_provided", verified: experience.is_verified },
          destination: { sourceName: destination.source_name, sourceUrl: destination.source_url, verifiedAt: destination.last_verified_at },
        },
      }];
    });

    return { ok: true, recommendations: rankRecommendations(preferences, candidates) };
  } catch {
    return { ok: false };
  }
}
