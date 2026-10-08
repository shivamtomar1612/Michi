import { createHash } from "node:crypto";
import { z } from "zod";
import { canonicalSourceUrl, isAllowedSourceUrl } from "../registry";
import type { NormalizedPlace, SourceAuthority } from "../types";

const inputSchema = z.object({
  name: z.string().trim().min(1).max(180),
  name_ja: z.string().trim().max(180).nullable().optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  place_type: z.string().trim().min(1).max(48),
  description: z.string().trim().max(800).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  official_url: z.string().url().nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  opening_hours_text: z.string().trim().max(500).nullable().optional(),
  admission_text: z.string().trim().max(300).nullable().optional(),
  accessibility: z.record(z.string(), z.unknown()).nullable().optional(),
  photography_policy: z.string().trim().max(500).nullable().optional(),
  source_name: z.string().trim().min(1),
  source_url: z.string().url(),
  source_type: z.string().trim().min(1),
  source_authority: z.number().int().min(1).max(5),
  retrieved_at: z.string().datetime(),
  last_verified_at: z.string().datetime(),
  next_verification_at: z.string().datetime().nullable().optional(),
  verification_status: z.enum(["verified_official", "verified_primary", "needs_review", "stale", "unverified", "unknown"]).default("unknown"),
  data_status: z.enum(["verified_official", "verified_primary", "official_tourism", "host_provided", "community_provided", "unverified", "unknown"]).default("unknown"),
  image_url: z.string().url().nullable().optional(),
  image_usage_status: z.enum(["approved", "external_reference", "unknown", "do_not_display"]).default("unknown"),
}).refine((input) => (input.latitude == null) === (input.longitude == null), "Coordinates must be provided as a verified pair.");

export function normalizePlace(input: unknown): NormalizedPlace {
  const parsed = inputSchema.parse(input);
  if (!isAllowedSourceUrl(parsed.source_url)) throw new Error("Source URL is not registered in the exact-host allowlist.");
  if (parsed.official_url && !isAllowedSourceUrl(parsed.official_url)) throw new Error("Official URL must belong to an approved source domain.");
  const normalized = {
    ...parsed,
    name_ja: parsed.name_ja ?? null,
    description: parsed.description ?? null,
    latitude: parsed.latitude ?? null,
    longitude: parsed.longitude ?? null,
    official_url: parsed.official_url ?? null,
    address: parsed.address ?? null,
    opening_hours_text: parsed.opening_hours_text ?? null,
    admission_text: parsed.admission_text ?? null,
    accessibility: parsed.accessibility ?? null,
    accessibility_status: parsed.accessibility ? "verified" as const : "unknown" as const,
    photography_policy: parsed.photography_policy ?? null,
    image_url: parsed.image_url ?? null,
    image_usage_status: parsed.image_url ? parsed.image_usage_status : "do_not_display" as const,
    source_url: parsed.source_url,
    canonical_source_url: canonicalSourceUrl(parsed.source_url),
    source_authority: parsed.source_authority as SourceAuthority,
    next_verification_at: parsed.next_verification_at ?? null,
  };
  const content_hash = createHash("sha256").update(JSON.stringify({ ...normalized, retrieved_at: undefined, last_verified_at: undefined, next_verification_at: undefined })).digest("hex");
  return { ...normalized, content_hash };
}
