import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { passportReflectionSchema } from "@/features/passport/reflection-schema";
import { passportDemoAchievements } from "@/features/passport/demo-data";

describe("passport reflection validation", () => {
  const valid = {
    bookingId: "00000000-0000-4000-8000-000000000011",
    learningReflection: "I learned how the craft technique is passed between generations.",
    culturalPreparationCompleted: true,
    preparationHelpfulness: 4,
    understandingScore: 4,
    hostRating: 5,
    culturalDepthScore: 4,
  };

  it("accepts a complete reflection for a completed visit", () => {
    expect(passportReflectionSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a useful learning reflection and bounded scores", () => {
    expect(passportReflectionSchema.safeParse({ ...valid, learningReflection: "  " }).success).toBe(false);
    expect(passportReflectionSchema.safeParse({ ...valid, hostRating: 6 }).success).toBe(false);
    expect(passportReflectionSchema.safeParse({ ...valid, bookingId: "not-a-uuid" }).success).toBe(false);
  });

  it("requires a preparation helpfulness score only when preparation was completed", () => {
    expect(passportReflectionSchema.safeParse({ ...valid, culturalPreparationCompleted: false, preparationHelpfulness: null }).success).toBe(true);
    expect(passportReflectionSchema.safeParse({ ...valid, culturalPreparationCompleted: false, preparationHelpfulness: 4 }).success).toBe(false);
  });
});

describe("passport demo isolation", () => {
  it("contains exactly one example, explicitly labeled as demo and never treated as earned data", () => {
    expect(passportDemoAchievements).toHaveLength(1);
    expect(passportDemoAchievements[0]).toMatchObject({ isDemo: true, title: "Respectful Explorer" });
  });
});

describe("passport database safeguards", () => {
  const migration = readFileSync(join(process.cwd(), "supabase/migrations/20261008165040_cultural_passport_reflection.sql"), "utf8");

  it("keeps personal reflections owner-only and derives achievements from completed bookings", () => {
    expect(migration).toContain("create table public.traveler_reflections");
    expect(migration).toContain("traveler_id = (select auth.uid())");
    expect(migration).toContain("status = 'completed'");
    expect(migration).toContain("on conflict (traveler_id, type) do nothing");
    expect(migration).toContain("create trigger bookings_passport_achievements");
    expect(migration).toContain("create trigger feedback_passport_achievements");
    expect(migration).toContain("create trigger reflections_passport_achievements");
    expect(migration).toContain("revoke insert on public.traveler_feedback from authenticated");
    expect(migration).toContain("create or replace function private.get_cultural_passport_metrics");
    expect(migration).toContain("s.value <= 40");
    expect(migration).toContain("a.status = 'verified'");
  });
});
