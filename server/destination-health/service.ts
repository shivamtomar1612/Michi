import "server-only";
import { calculateDestinationHealth } from "@/features/destination-health/engine";
import { healthComponentKeys, type DestinationHealthResult, type HealthInput } from "@/features/destination-health/types";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const signalRowSchema = z.object({
  destination_id: z.string().uuid(),
  component_key: z.enum(healthComponentKeys),
  value: z.number().int().min(0).max(100),
  data_mode: z.enum(["live", "snapshot", "simulated"]),
  truth_category: z.enum(["official", "community", "host", "simulated", "unverified", "stale"]),
  source_name: z.string().trim().min(1),
  source_url: z.string().url().refine((value) => new URL(value).protocol === "https:"),
  source_type: z.string().trim().min(1),
  source_authority: z.number().int().min(1).max(5).nullable(),
  data_status: z.enum(["observed_official", "forecast_official", "operator_provided", "community_reported"]),
  retrieved_at: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  verified_at: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  observed_at: z.string().refine((value) => Number.isFinite(Date.parse(value))),
});
const signalRowsSchema = z.array(signalRowSchema);

const emptyInput = (): HealthInput => ({
  crowdPressure: null,
  remainingCapacity: null,
  communityReadiness: null,
  transportAccessibility: null,
  seasonalSuitability: null,
});

export async function getDestinationHealthForDestinations(destinationIds: string[]): Promise<Record<string, DestinationHealthResult>> {
  const uniqueIds = [...new Set(destinationIds)];
  if (!uniqueIds.length) return {};
  const asOf = new Date();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("destination_health_signals")
      .select("destination_id,component_key,value,data_mode,truth_category,source_name,source_url,source_type,source_authority,verified_at,observed_at,retrieved_at,data_status")
      .in("destination_id", uniqueIds)
      .eq("verification_status", "verified")
      .gt("expires_at", asOf.toISOString())
      .order("observed_at", { ascending: false });

    const unavailable = () => Object.fromEntries(uniqueIds.map((id) => [id, calculateDestinationHealth(emptyInput(), asOf)]));
    if (error) return unavailable();

    const parsedRows = signalRowsSchema.safeParse(data ?? []);
    if (!parsedRows.success) return unavailable();
    const latestByDestination = new Map<string, Map<string, z.infer<typeof signalRowSchema>>>();
    for (const row of parsedRows.data) {
      if (!latestByDestination.has(row.destination_id)) latestByDestination.set(row.destination_id, new Map());
      const latest = latestByDestination.get(row.destination_id)!;
      if (!latest.has(row.component_key)) latest.set(row.component_key, row);
    }

    return Object.fromEntries(uniqueIds.map((destinationId) => {
      const input = emptyInput();
      const latest = latestByDestination.get(destinationId);
      for (const key of healthComponentKeys) {
        const row = latest?.get(key);
        if (!row) continue;
        input[key] = {
          value: row.value,
          mode: row.data_mode,
          sourceName: row.source_name,
          sourceUrl: row.source_url,
          sourceType: row.source_type,
          sourceAuthority: row.source_authority,
          verifiedAt: row.verified_at,
          observedAt: row.observed_at,
          truth: row.truth_category,
          dataStatus: row.data_status,
          retrievedAt: row.retrieved_at,
        };
      }
      return [destinationId, calculateDestinationHealth(input, asOf)];
    }));
  } catch {
    return Object.fromEntries(uniqueIds.map((id) => [id, calculateDestinationHealth(emptyInput(), asOf)]));
  }
}

export async function getDestinationHealth(destinationId: string) {
  const result = await getDestinationHealthForDestinations([destinationId]);
  return result[destinationId];
}
