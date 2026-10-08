import { describe, expect, it } from "vitest";
import { hasDmoDestinationAccess } from "@/features/dmo/access";
import { isSuppressed, metricDelta, monthStart, previousMonthStart, type MetricValue } from "@/features/dmo/metrics";

describe("destination-scoped DMO access", () => {
  const assigned = [{ destinationId: "dest-a", accessScope: "dmo_analytics" as const, revokedAt: null }];
  it("requires both the DMO role and an active destination assignment", () => {
    expect(hasDmoDestinationAccess("dmo", assigned, "dest-a")).toBe(true);
    expect(hasDmoDestinationAccess("traveler", assigned, "dest-a")).toBe(false);
    expect(hasDmoDestinationAccess("dmo", assigned, "dest-b")).toBe(false);
    expect(hasDmoDestinationAccess("dmo", [{ ...assigned[0]!, revokedAt: "2026-10-01" }], "dest-a")).toBe(false);
  });
});

describe("privacy-safe DMO metrics", () => {
  it("does not convert suppressed or missing values to zero deltas", () => {
    const available: MetricValue = { value: 8, state: "available" };
    const suppressed: MetricValue = { value: null, state: "suppressed" };
    expect(metricDelta(available, { value: 5, state: "available" })).toBe(3);
    expect(metricDelta(available, suppressed)).toBeNull();
    expect(isSuppressed(suppressed)).toBe(true);
    expect(isSuppressed({ value: null, state: "unavailable" })).toBe(false);
  });

  it("accepts only a calendar month within the bounded 24-month window", () => {
    const now = new Date("2026-10-09T06:00:00.000Z");
    expect(monthStart("2026-03", now)).toBe("2026-03-01");
    expect(monthStart("2026-03-15", now)).toBe("2026-10-01");
    expect(monthStart("2028-02", now)).toBe("2026-10-01");
    expect(monthStart("2024-09", now)).toBe("2026-10-01");
    expect(previousMonthStart("2026-10-01", now)).toBe("2026-09-01");
    expect(previousMonthStart("2024-10-01", now)).toBeNull();
  });
});
