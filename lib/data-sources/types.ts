export type DataStatus =
  | "verified_official"
  | "verified_primary"
  | "official_tourism"
  | "host_provided"
  | "community_provided"
  | "unverified"
  | "unknown";

export type VerificationStatus =
  | "verified_official"
  | "verified_primary"
  | "needs_review"
  | "stale"
  | "unverified"
  | "unknown";

export type QualityLevel = "high" | "medium" | "low";

export type SourceAuthority = 1 | 2 | 3 | 4 | 5;

export interface Provenance {
  source_name: string;
  source_url: string;
  canonical_source_url: string;
  source_type: string;
  source_authority: SourceAuthority;
  retrieved_at: string;
  last_verified_at: string;
  next_verification_at: string | null;
  verification_status: VerificationStatus;
  data_status: DataStatus;
}

export interface NormalizedPlace extends Provenance {
  name: string;
  name_ja: string | null;
  slug: string;
  place_type: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  official_url: string | null;
  address: string | null;
  opening_hours_text: string | null;
  admission_text: string | null;
  accessibility: Record<string, unknown> | null;
  accessibility_status: "verified" | "unknown" | "needs_review";
  photography_policy: string | null;
  image_url: string | null;
  image_usage_status: "approved" | "external_reference" | "unknown" | "do_not_display";
  content_hash: string;
}

export interface ExternalExperience extends Provenance {
  title: string;
  slug: string;
  operator_name: string;
  booking_mode: "external" | "information_only";
  listing_source: "external_official_listing";
  michi_booking_enabled: false;
  external_booking_url: string | null;
  official_url: string;
  price_text: string | null;
  price_min_jpy: number | null;
  price_max_jpy: number | null;
  accessibility_status: "verified" | "unknown" | "needs_review";
  content_hash: string;
}
