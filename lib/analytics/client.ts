export type DestinationHealthEvent =
  | "destination_health_viewed"
  | "alternative_shown"
  | "alternative_selected"
  | "popular_destination_retained";

type EventInput = {
  eventName: DestinationHealthEvent;
  destinationId: string;
  targetDestinationId?: string;
  alternativeCount?: number;
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

export function trackDestinationHealthEvent(event: EventInput): void {
  const sessionId = getSessionId();
  if (!sessionId) return;

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...event, sessionId }),
    keepalive: true,
  }).catch(() => undefined);
}
