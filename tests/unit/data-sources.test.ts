import { describe, expect, it } from "vitest";
import { calculateDataQuality, isFresh } from "@/lib/data-sources/data-quality";
import { canonicalSourceUrl, isAllowedSourceUrl } from "@/lib/data-sources/registry";
import { validateProviderPages } from "@/lib/data-sources/providers";
import { normalizeExternalExperience, mayCreateMichiBooking } from "@/lib/data-sources/normalizers/experience";
import { normalizePlace } from "@/lib/data-sources/normalizers/place";

const timestamps = {
  retrieved_at: "2026-10-01T00:00:00.000Z",
  last_verified_at: "2026-10-01T00:00:00.000Z",
  next_verification_at: "2026-10-08T00:00:00.000Z",
  source_name: "Kyoto Travel",
  source_type: "official_city_tourism",
  source_authority: 4,
  verification_status: "verified_official",
  data_status: "official_tourism",
};

describe("approved source registry", () => {
  it("allows HTTPS URLs on exact registered domains only", () => {
    expect(isAllowedSourceUrl("https://kyoto.travel/en/responsible-travel/" )).toBe(true);
    expect(isAllowedSourceUrl("https://notkyoto.travel/en/" )).toBe(false);
    expect(isAllowedSourceUrl("https://kyoto.travel.attacker.example/" )).toBe(false);
    expect(isAllowedSourceUrl("http://kyoto.travel/" )).toBe(false);
    expect(isAllowedSourceUrl("https://user:pass@kyoto.travel/" )).toBe(false);
  });

  it("canonicalizes tracking parameters without changing source provenance", () => {
    expect(canonicalSourceUrl("https://kyoto.travel/en/areas/?utm_source=michi&b=2&a=1#map"))
      .toBe("https://kyoto.travel/en/areas?a=1&b=2");
  });

  it("keeps every curated provider URL inside the approved registry", () => {
    expect(validateProviderPages()).toEqual([]);
  });
});

describe("source-backed normalization", () => {
  it("preserves the exact source URL and leaves unverified fields unknown", () => {
    const sourceUrl = "https://kyoto.travel/en/areas/";
    const place = normalizePlace({
      name: "Kyoto",
      slug: "kyoto",
      place_type: "destination",
      source_url: sourceUrl,
      ...timestamps,
    });
    expect(place.source_url).toBe(sourceUrl);
    expect(place.canonical_source_url).toBe("https://kyoto.travel/en/areas");
    expect(place.latitude).toBeNull();
    expect(place.opening_hours_text).toBeNull();
    expect(place.accessibility_status).toBe("unknown");
    expect(place.image_usage_status).toBe("do_not_display");
  });

  it("rejects coordinates supplied as an incomplete pair and unapproved sources", () => {
    expect(() => normalizePlace({
      name: "Place", slug: "place", place_type: "site", latitude: 35,
      source_url: "https://kyoto.travel/en/areas/", ...timestamps,
    })).toThrow(/coordinates/i);
    expect(() => normalizePlace({
      name: "Place", slug: "place", place_type: "site",
      source_url: "https://example.com/place", ...timestamps,
    })).toThrow(/allowlist/i);
  });

  it("keeps third-party listings external and permanently non-bookable through MICHI", () => {
    const listing = normalizeExternalExperience({
      title: "Craft workshop",
      slug: "craft-workshop",
      operator_name: "Operator",
      official_url: "https://kutanikosen.com/en/experience.html",
      source_url: "https://kutanikosen.com/en/experience.html",
      booking_mode: "external",
      external_booking_url: "https://kutanikosen.com/reserve",
      ...timestamps,
    });
    expect(listing.michi_booking_enabled).toBe(false);
    expect(listing.listing_source).toBe("external_official_listing");
    expect(mayCreateMichiBooking(listing)).toBe(false);
    expect(mayCreateMichiBooking({ listing_source: "external_official_listing", booking_mode: "michi", michi_booking_enabled: true })).toBe(false);
  });

  it("rejects non-HTTPS external booking links", () => {
    expect(() => normalizeExternalExperience({
      title: "Craft workshop", slug: "craft-workshop", operator_name: "Operator",
      official_url: "https://kutanikosen.com/en/experience.html",
      source_url: "https://kutanikosen.com/en/experience.html",
      external_booking_url: "http://kutanikosen.com/reserve", ...timestamps,
    })).toThrow(/https/i);
  });
});

describe("data freshness and quality", () => {
  it("marks records stale after their next verification date", () => {
    expect(isFresh("2026-10-06T00:00:00.000Z", new Date("2026-10-07T00:00:00.000Z"))).toBe(false);
    expect(isFresh(null, new Date("2026-10-07T00:00:00.000Z"))).toBe(true);
  });

  it("uses deterministic authority, completeness, specificity, and freshness inputs", () => {
    const input = {
      authorityLevel: 4,
      primarySource: false,
      presentFieldCount: 4,
      expectedFieldCount: 4,
      lastVerifiedAt: "2026-10-01T00:00:00.000Z",
      sensitivity: "low" as const,
      sourceSpecificity: 1,
      now: new Date("2026-10-07T00:00:00.000Z"),
    };
    expect(calculateDataQuality(input)).toBe("high");
    expect(calculateDataQuality({ ...input, authorityLevel: 1, sourceSpecificity: 0.2 })).toBe("low");
  });
});
