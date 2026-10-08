import { describe, expect, it } from "vitest";
import { googleDirectionsUrl, healthMarkerColor, isValidCoordinates, straightLineDistanceKm, verifiedCoordinates } from "@/features/maps/geospatial";
import type { MapPoint } from "@/features/maps/types";

const point = (id: string, latitude: number, longitude: number, sequence: number): MapPoint => ({
  id, name: id, kind: "itinerary-stop", latitude, longitude, sequence, whyShown: "Saved itinerary stop.",
});

describe("map geospatial helpers", () => {
  it("accepts only finite coordinates within geographic bounds", () => {
    expect(isValidCoordinates({ latitude: 35.68, longitude: 139.69 })).toBe(true);
    expect(isValidCoordinates({ latitude: 91, longitude: 139 })).toBe(false);
    expect(isValidCoordinates({ latitude: Number.NaN, longitude: 0 })).toBe(false);
  });

  it("requires a valid verification timestamp before showing catalogue coordinates", () => {
    expect(verifiedCoordinates({ latitude: 35.68, longitude: 139.69, verifiedAt: "2026-10-01T00:00:00Z" }))
      .toEqual({ latitude: 35.68, longitude: 139.69 });
    expect(verifiedCoordinates({ latitude: 35.68, longitude: 139.69, verifiedAt: null })).toBeNull();
    expect(verifiedCoordinates({ latitude: 35.68, longitude: 139.69, verifiedAt: "not-a-date" })).toBeNull();
  });

  it("computes approximate straight-line distance and rejects invalid inputs", () => {
    expect(straightLineDistanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBe(111.2);
    expect(straightLineDistanceKm({ latitude: 100, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeNull();
  });

  it("maps health categories to the declared marker palette", () => {
    expect(healthMarkerColor("Healthy")).toBe("#536b5c");
    expect(healthMarkerColor("Moderate Pressure")).toBe("#a67d2d");
    expect(healthMarkerColor("Critical Pressure")).toBe("#963b2b");
    expect(healthMarkerColor("Unavailable")).toBe("#59636a");
  });

  it("builds external Google Maps directions in itinerary sequence without producing ETAs", () => {
    const url = googleDirectionsUrl([point("last", 36, 140, 2), point("first", 35, 139, 1)]);
    expect(url).toContain("https://www.google.com/maps/dir/");
    expect(url).toContain("origin=35%2C139");
    expect(url).toContain("destination=36%2C140");
    expect(url).not.toMatch(/duration|travel.?time|eta/i);
    expect(googleDirectionsUrl([point("only", 35, 139, 1)])).toBeNull();
  });
});
