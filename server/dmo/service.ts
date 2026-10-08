import "server-only";

import { z } from "zod";
import type { DestinationHealthResult } from "@/features/destination-health/types";
import type { DmoMetrics } from "@/features/dmo/metrics";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";
import { getDestinationHealth } from "@/server/destination-health/service";

const metricValueSchema = z.object({
  value: z.number().nullable(),
  state: z.enum(["available", "suppressed", "insufficient_data", "unavailable"]),
});
const communityMetricSchema = z.object({
  state: z.enum(["available", "insufficient_data", "unavailable"]),
  positive: z.number().nullable(),
  positiveState: z.enum(["available", "insufficient_data"]),
  neutral: z.number().nullable(),
  neutralState: z.enum(["available", "insufficient_data"]),
  negative: z.number().nullable(),
  negativeState: z.enum(["available", "insufficient_data"]),
  averagePressure: z.number().nullable(),
  pressureState: z.enum(["available", "insufficient_data"]),
});
const metricsSchema = z.object({
  destinationId: z.string().uuid(),
  month: z.string(),
  minimumCohort: z.number().int().positive(),
  metrics: z.object({
    destinationViewSessions: metricValueSchema,
    experienceViewSessions: metricValueSchema,
    recommendationSessions: metricValueSchema,
    alternativeConsiderationSessions: metricValueSchema,
    itineraryGenerationSessions: metricValueSchema,
    culturalLearningSessions: metricValueSchema,
    reflectionSubmissionSessions: metricValueSchema,
    reflectionTravelers: metricValueSchema,
    confirmedBookingCount: metricValueSchema,
    recordedBookingValueJpy: metricValueSchema,
    activeVerifiedExperiences: metricValueSchema,
    activeHostCohort: metricValueSchema,
    remainingSlotCapacity: metricValueSchema,
    slotUtilizationPercent: metricValueSchema,
    communityFeedback: communityMetricSchema,
    hostObservations: communityMetricSchema,
    passportAchievementTravelers: metricValueSchema,
  }),
  limitations: z.array(z.string()),
});

export type DmoDestination = { id: string; name: string; region: string | null; prefecture: string | null };

export async function getDmoDestinations(): Promise<{ destinations: DmoDestination[]; unavailable: boolean }> {
  const { user } = await requireRole(["dmo"]);
  const supabase = await createClient();
  const { data: assignments, error: assignmentError } = await supabase.from("destination_access_assignments")
    .select("destination_id").eq("user_id", user.id).eq("access_scope", "dmo_analytics").is("revoked_at", null);
  if (assignmentError) return { destinations: [], unavailable: true };
  if (!assignments?.length) return { destinations: [], unavailable: false };
  const destinationIds = [...new Set(assignments.map((item) => item.destination_id))];
  const { data, error } = await supabase.from("destinations")
    .select("id,name,region,prefecture").in("id", destinationIds).eq("status", "published").order("name");
  if (error) return { destinations: [], unavailable: true };
  return { destinations: data ?? [], unavailable: false };
}

export async function getDmoDestinationMetrics(
  destinationId: string,
  month: string,
): Promise<{ metrics: DmoMetrics | null; health: DestinationHealthResult | null; unavailable: boolean }> {
  await requireRole(["dmo"]);
  const supabase = await createClient();
  const [{ data, error }, { data: reflections, error: reflectionError }] = await Promise.all([
    supabase.rpc("dmo_destination_month_metrics", { p_destination_id: destinationId, p_month: month }),
    supabase.rpc("dmo_reflection_month_metric", { p_destination_id: destinationId, p_month: month }),
  ]);
  if (error) return { metrics: null, health: null, unavailable: true };
  const parsedReflection = metricValueSchema.safeParse(reflections);
  const metricsWithReflection = data && typeof data === "object" && !Array.isArray(data)
    ? { ...data, metrics: { ...(data as Record<string, unknown>).metrics as Record<string, unknown>, reflectionTravelers: reflectionError ? { value: null, state: "unavailable" } : parsedReflection.success ? parsedReflection.data : { value: null, state: "unavailable" } } }
    : data;
  const parsed = metricsSchema.safeParse(metricsWithReflection);
  if (!parsed.success) return { metrics: null, health: null, unavailable: true };
  const health = await getDestinationHealth(destinationId);
  return { metrics: parsed.data as DmoMetrics, health, unavailable: false };
}
