import { describe, expect, it } from "vitest";
import { requiresSharedRateLimit } from "@/server/security/rate-limit-config";

describe("shared rate-limit configuration", () => {
  it("requires a shared limiter in production when no privileged key is configured", () => {
    expect(requiresSharedRateLimit("production", undefined)).toBe(true);
    expect(requiresSharedRateLimit("production", "configured" )).toBe(false);
  });

  it("allows a process-local limiter only outside production", () => {
    expect(requiresSharedRateLimit("development", undefined)).toBe(false);
    expect(requiresSharedRateLimit("test", undefined)).toBe(false);
  });
});
