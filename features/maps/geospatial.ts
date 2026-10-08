import type { MapHealthStatus, MapPoint } from "./types";

export interface Coordinates {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}

export function isValidCoordinates(point: Coordinates): point is { latitude: number; longitude: number } {
  return typeof point.latitude === "number" && Number.isFinite(point.latitude) && point.latitude >= -90 && point.latitude <= 90
    && typeof point.longitude === "number" && Number.isFinite(point.longitude) && point.longitude >= -180 && point.longitude <= 180;
}

export function verifiedCoordinates(point: Coordinates & { verifiedAt?: string | null }) {
  return point.verifiedAt && Number.isFinite(Date.parse(point.verifiedAt)) && isValidCoordinates(point)
    ? { latitude: point.latitude as number, longitude: point.longitude as number }
    : null;
}

export function straightLineDistanceKm(from: Coordinates, to: Coordinates): number | null {
  if (!isValidCoordinates(from) || !isValidCoordinates(to)) return null;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(to.latitude - from.latitude);
  const lngDelta = radians(to.longitude - from.longitude);
  const arc = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lngDelta / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc)) * 10) / 10;
}

export function healthMarkerColor(status: MapHealthStatus | undefined): string {
  if (status === "Healthy" || status === "Good") return "#536b5c";
  if (status === "Moderate Pressure") return "#a67d2d";
  if (status === "High Pressure" || status === "Critical Pressure") return "#963b2b";
  return "#59636a";
}

export function googleDirectionsUrl(points: MapPoint[]): string | null {
  const ordered = points.filter(isValidCoordinates).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  if (ordered.length < 2) return null;
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const params = new URLSearchParams({ api: "1", origin: `${first.latitude},${first.longitude}`, destination: `${last.latitude},${last.longitude}` });
  const waypoints = ordered.slice(1, -1).slice(0, 8).map((point) => `${point.latitude},${point.longitude}`);
  if (waypoints.length) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
