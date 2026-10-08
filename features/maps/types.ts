export type MapHealthStatus = "Healthy" | "Good" | "Moderate Pressure" | "High Pressure" | "Critical Pressure" | "Unavailable";
export type MapPointKind = "destination" | "alternative" | "place" | "experience" | "meeting-point" | "itinerary-stop";

export interface MapPoint {
  id: string;
  name: string;
  kind: MapPointKind;
  latitude: number;
  longitude: number;
  href?: string;
  destinationName?: string;
  healthStatus?: MapHealthStatus;
  healthScore?: number | null;
  experienceTitles?: string[];
  whyShown: string;
  locationLabel?: string;
  sequence?: number;
  straightLineDistanceFromPreviousKm?: number;
}

export interface MapFallbackItem {
  id: string;
  name: string;
  description: string;
  href?: string;
  locationLabel?: string;
  locationAvailable: boolean;
}
