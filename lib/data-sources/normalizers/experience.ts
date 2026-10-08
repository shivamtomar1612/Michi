import { createHash } from "node:crypto";
import { z } from "zod";
import { canonicalSourceUrl, isAllowedSourceUrl } from "../registry";
import type { ExternalExperience, SourceAuthority } from "../types";

const schema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  operator_name: z.string().trim().min(1).max(180),
  booking_mode: z.enum(["external", "information_only"]).default("information_only"),
  external_booking_url: z.string().url().nullable().optional(),
  official_url: z.string().url(),
  price_text: z.string().trim().max(180).nullable().optional(),
  price_min_jpy: z.number().int().min(0).nullable().optional(),
  price_max_jpy: z.number().int().min(0).nullable().optional(),
  accessibility_status: z.enum(["verified", "unknown", "needs_review"]).default("unknown"),
  source_name: z.string().trim().min(1),
  source_url: z.string().url(),
  source_type: z.string().trim().min(1),
  source_authority: z.number().int().min(1).max(5),
  retrieved_at: z.string().datetime(),
  last_verified_at: z.string().datetime(),
  next_verification_at: z.string().datetime().nullable().optional(),
  verification_status: z.enum(["verified_official", "verified_primary", "needs_review", "stale", "unverified", "unknown"]).default("unknown"),
  data_status: z.enum(["verified_official", "verified_primary", "official_tourism", "host_provided", "community_provided", "unverified", "unknown"]).default("unknown"),
}).refine((input) => input.price_min_jpy == null || input.price_max_jpy == null || input.price_max_jpy >= input.price_min_jpy, "Price range is invalid.");

export function normalizeExternalExperience(input: unknown): ExternalExperience {
  const parsed = schema.parse(input);
  if (!isAllowedSourceUrl(parsed.source_url) || !isAllowedSourceUrl(parsed.official_url)) throw new Error("Experience source URL is not registered in the exact-host allowlist.");
  if (parsed.external_booking_url) {
    const booking = new URL(parsed.external_booking_url);
    if (booking.protocol !== "https:" || booking.username || booking.password) throw new Error("External booking links must use HTTPS without embedded credentials.");
  }
  const normalized = {
    ...parsed,
    booking_mode: parsed.booking_mode,
    listing_source: "external_official_listing" as const,
    michi_booking_enabled: false as const,
    external_booking_url: parsed.external_booking_url ?? null,
    price_text: parsed.price_text ?? null,
    price_min_jpy: parsed.price_min_jpy ?? null,
    price_max_jpy: parsed.price_max_jpy ?? null,
    accessibility_status: parsed.accessibility_status,
    source_url: parsed.source_url,
    canonical_source_url: canonicalSourceUrl(parsed.source_url),
    official_url: parsed.official_url,
    source_authority: parsed.source_authority as SourceAuthority,
    next_verification_at: parsed.next_verification_at ?? null,
  };
  const content_hash = createHash("sha256").update(JSON.stringify({ ...normalized, retrieved_at: undefined, last_verified_at: undefined, next_verification_at: undefined })).digest("hex");
  return { ...normalized, content_hash };
}

export function mayCreateMichiBooking(experience: { listing_source: string; booking_mode: string; michi_booking_enabled: boolean }): boolean {
  return experience.listing_source !== "external_official_listing" && experience.booking_mode === "michi" && experience.michi_booking_enabled;
}
