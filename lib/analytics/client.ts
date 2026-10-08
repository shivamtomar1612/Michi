export type AnalyticsEvent =
  | "destination_health_viewed"
  | "alternative_shown"
  | "alternative_selected"
  | "popular_destination_retained"
  | "destination_viewed"
  | "experience_viewed"
  | "recommendation_generated"
  | "alternative_considered"
  | "itinerary_generated"
  | "cultural_learning_interaction"
  | "reflection_submitted";

type EventInput = {
  eventName: AnalyticsEvent;
  destinationId: string;
  experienceId?: string;
  targetDestinationId?: string;
  alternativeCount?: number;
  recommendationCount?: number;
  experienceCount?: number;
};

function getSessionId(): string | null {
  try {
    const key = "michi-health-session";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return null;
  }
}

export function trackAnalyticsEvent(event: EventInput): void {
  const sessionId = getSessionId();
  if (!sessionId) return;

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...event, sessionId }),
    keepalive: true,
  }).catch(() => undefined);
}

export const trackDestinationHealthEvent = trackAnalyticsEvent;
