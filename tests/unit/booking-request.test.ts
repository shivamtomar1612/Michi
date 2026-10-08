import { describe, expect, it } from "vitest";
import { bookingRequestSchema } from "@/features/bookings/schemas";

describe("booking request validation", () => {
  const valid = { slotId: "00000000-0000-4000-8000-000000000011", guests: 2, acknowledged: true, notes: "", culturalRequirements: { dietary: "vegetarian" } };
  it("requires an explicit rule acknowledgment and bounded guest count", () => {
    expect(bookingRequestSchema.safeParse(valid).success).toBe(true);
    expect(bookingRequestSchema.safeParse({ ...valid, acknowledged: false }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, guests: 101 }).success).toBe(false);
  });
  it("rejects unexpected fields and oversized notes", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, travelerId: "forged" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, notes: "x".repeat(2001) }).success).toBe(false);
  });
  it("bounds optional cultural requirements and rejects client-supplied identity", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, culturalRequirements: { accessibility: "x".repeat(251) } }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, culturalRequirements: { medical_history: "private" } }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, travelerId: "forged" }).success).toBe(false);
  });
});
