"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

export function AnalyticsView({ eventName, destinationId, experienceId }: {
  eventName: "destination_viewed" | "experience_viewed";
  destinationId: string;
  experienceId?: string;
}) {
  const lastTracked = useRef("");
  useEffect(() => {
    const key = `${eventName}:${destinationId}:${experienceId ?? ""}`;
    if (lastTracked.current === key) return;
    lastTracked.current = key;
    trackAnalyticsEvent({ eventName, destinationId, ...(experienceId ? { experienceId } : {}) });
  }, [destinationId, eventName, experienceId]);
  return null;
}
