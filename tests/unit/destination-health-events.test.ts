import { describe, expect, it } from "vitest";
import { destinationHealthEventSchema } from "@/lib/analytics/events";

const validEvent = {
  eventName: "destination_health_viewed" as const,
  destinationId: "9d2211f2-cf49-4fc1-9a28-78e193412011",
  sessionId: "a6fe47bb-685f-4f67-a125-491b94fd8330",
};

describe("destinationHealthEventSchema", () => {
  it("accepts the documented privacy-limited destination and journey events", () => {
    expect(destinationHealthEventSchema.safeParse(validEvent).success).toBe(true);
    expect(destinationHealthEventSchema.safeParse({ ...validEvent, eventName: "destination_viewed" }).success).toBe(true);
    expect(destinationHealthEventSchema.safeParse({ ...validEvent, eventName: "user_location_tracked" }).success).toBe(false);
  });

  it("rejects personal or unknown fields", () => {
    expect(destinationHealthEventSchema.safeParse({ ...validEvent, email: "traveler@example.com" }).success).toBe(false);
  });

  it("bounds alternative counts and requires UUID identifiers", () => {
    expect(destinationHealthEventSchema.safeParse({ ...validEvent, alternativeCount: 11 }).success).toBe(false);
    expect(destinationHealthEventSchema.safeParse({ ...validEvent, sessionId: "browser-session" }).success).toBe(false);
  });

  it("requires experience IDs for experience views and rejects unbounded metadata", () => {
    expect(destinationHealthEventSchema.safeParse({ ...validEvent, eventName: "experience_viewed" }).success).toBe(false);
    expect(destinationHealthEventSchema.safeParse({ ...validEvent, eventName: "experience_viewed", experienceId: "5edeb3e2-4e9c-4f27-9db8-4c09066b08b5" }).success).toBe(true);
    expect(destinationHealthEventSchema.safeParse({ ...validEvent, recommendationCount: 101 }).success).toBe(false);
    expect(destinationHealthEventSchema.safeParse({ ...validEvent, preferenceText: "private traveler information" }).success).toBe(false);
  });
});
