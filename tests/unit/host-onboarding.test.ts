import { describe, expect, it } from "vitest";
import { hostApplicationSchema, reviewApplicationSchema } from "@/features/hosts/schemas";

const application = {
  externalExperienceId: "",
  legalName: "Real Applicant", organizationName: "Operator Company",
  officialWebsite: "https://operator.example", contactEmail: "owner@operator.example",
  ownershipEvidence: "Registration and operating permission will be reviewed.",
  experienceDescription: "A sourced cultural workshop at the operator venue.",
  culturalRules: "Follow the guide.", accessibilityDetails: "Accessibility will be assessed.",
  availabilityPlan: "Slots entered by operator.", capacityPlan: "Maximum eight visitors.",
  cancellationRules: "Contact the operator.", intent: "submitted" as const,
};

describe("operator onboarding validation", () => {
  it("requires authorization evidence and HTTPS operator website", () => {
    expect(hostApplicationSchema.safeParse(application).success).toBe(true);
    expect(hostApplicationSchema.safeParse({ ...application, ownershipEvidence: "" }).success).toBe(false);
    expect(hostApplicationSchema.safeParse({ ...application, officialWebsite: "http://operator.example" }).success).toBe(false);
  });
  it("blocks approval without explicit ownership review", () => {
    const review = { applicationId: "00000000-0000-4000-8000-000000000001", status: "verified", note: "Checked", ownershipChecked: false };
    expect(reviewApplicationSchema.safeParse(review).success).toBe(false);
    expect(reviewApplicationSchema.safeParse({ ...review, ownershipChecked: true }).success).toBe(true);
  });
});
