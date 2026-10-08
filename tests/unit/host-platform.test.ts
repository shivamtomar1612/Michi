import { describe, expect, it } from "vitest";
import { hostExperienceSchema } from "@/features/hosts/platform-schemas";

const validDraft = {
  experienceId: "", destinationId: "00000000-0000-4000-8000-000000000001",
  title: "Kanazawa gold leaf workshop", shortDescription: "Learn a local craft in a small workshop group.",
  description: "A host-led workshop with time to learn the process and try a small gold leaf application.",
  culturalContext: "The host explains how this craft is practiced in their own studio and region.",
  priceJpy: "5000", durationMinutes: "90", maxCapacity: "8", languages: "Japanese, English", interests: "craft, art",
  rulesLanguage: "en", participationRules: "Follow the host's instructions around tools and materials.",
  etiquetteRules: "Ask before photographing people or works in progress.", eligibility: "Guests must be able to use the offered hand tools.",
  cancellationRules: "Cancel at least 24 hours before the scheduled start.", accessibilityNotes: "One step at the entrance; contact the host about other access needs.",
  meetingPoint: "Meet at the workshop entrance on the main street.", latitude: "36.5613", longitude: "136.6562",
  photographyPolicy: "ask_host", stepFree: false, wheelchairAccess: false, imagePaths: [],
};

describe("host experience editing", () => {
  it("accepts complete host-provided listing details and parses coordinates", () => {
    const parsed = hostExperienceSchema.safeParse(validDraft);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.latitude).toBe(36.5613);
      expect(parsed.data.longitude).toBe(136.6562);
      expect(parsed.data.priceJpy).toBe(5000);
    }
  });

  it("rejects partial coordinates and unbounded image lists", () => {
    expect(hostExperienceSchema.safeParse({ ...validDraft, longitude: "" }).success).toBe(false);
    expect(hostExperienceSchema.safeParse({ ...validDraft, latitude: "135" }).success).toBe(false);
    expect(hostExperienceSchema.safeParse({ ...validDraft, imagePaths: Array.from({ length: 9 }, (_, i) => `host/experience/${i}.jpg`) }).success).toBe(false);
  });

  it("keeps host rule language and photography options explicit", () => {
    expect(hostExperienceSchema.safeParse({ ...validDraft, rulesLanguage: "ja", photographyPolicy: "not_allowed" }).success).toBe(true);
    expect(hostExperienceSchema.safeParse({ ...validDraft, rulesLanguage: "fr" }).success).toBe(false);
    expect(hostExperienceSchema.safeParse({ ...validDraft, photographyPolicy: "sometimes" }).success).toBe(false);
  });
});
