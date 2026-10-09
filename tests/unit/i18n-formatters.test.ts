import { describe, expect, it } from "vitest";
import { formatCurrency, formatDateTime, formatNumber, formatRelativeTime } from "@/i18n/formatters";

describe("locale-aware formatting", () => {
  it("formats Japanese yen without implying a decimal fraction", () => {
    expect(formatCurrency(1200, "ja")).toContain("1,200");
    expect(formatCurrency(1200, "en")).toContain("1,200");
    expect(formatCurrency(1200, "ja")).not.toContain(".00");
  });

  it("formats numbers for each supported locale", () => {
    expect(formatNumber(12345, "en")).toBe("12,345");
    expect(formatNumber(12345, "ja")).toBe("12,345");
  });

  it("uses Japan local time independently of the viewer timezone", () => {
    const instant = "2026-01-01T00:00:00.000Z";
    expect(formatDateTime(instant, "en")).toContain("Jan");
    expect(formatDateTime(instant, "ja")).toContain("2026");
  });

  it("localizes relative dates", () => {
    expect(formatRelativeTime(-1, "en", "day")).toBe("yesterday");
    expect(formatRelativeTime(-1, "ja", "day")).toBe("昨日");
  });
});
