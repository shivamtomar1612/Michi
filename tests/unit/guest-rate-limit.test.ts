import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { allowGuestRequest } from "@/server/security/guest-recommendation-limit";

afterEach(() => vi.unstubAllEnvs());

describe("guest request limits", () => {
  it("limits anonymous recommendation and itinerary calls separately in local development", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("RATE_LIMIT_SALT", "test-only-rate-limit-key");
    const ip = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    const request = new NextRequest("http://localhost:3000/api/recommendations", { headers: { "x-real-ip": ip } });

    for (let count = 0; count < 20; count += 1) expect(await allowGuestRequest(request, "recommendations", 20)).toBe(true);
    expect(await allowGuestRequest(request, "recommendations", 20)).toBe(false);
    expect(await allowGuestRequest(request, "itinerary_generation", 5)).toBe(true);
  });
});
