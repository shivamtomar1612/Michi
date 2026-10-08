"use client";

import { useEffect, useRef } from "react";
import { trackDestinationHealthEvent } from "@/lib/analytics/client";

export function HealthViewedTracker({ destinationId }: { destinationId: string }) {
  const lastTrackedId = useRef<string | null>(null);
  useEffect(() => {
    if (lastTrackedId.current === destinationId) return;
    lastTrackedId.current = destinationId;
    trackDestinationHealthEvent({ eventName: "destination_health_viewed", destinationId });
  }, [destinationId]);

  return null;
}
