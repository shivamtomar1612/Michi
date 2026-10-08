import { z } from "zod";

export const hostApplicationSchema = z.object({
  externalExperienceId: z.union([z.literal(""), z.uuid()]),
  legalName: z.string().trim().min(2).max(120),
  organizationName: z.string().trim().min(2).max(160),
  officialWebsite: z.union([z.literal(""), z.url().startsWith("https://")]),
  contactEmail: z.email().max(254),
  ownershipEvidence: z.string().trim().min(11).max(3000),
  experienceDescription: z.string().trim().min(11).max(3000),
  culturalRules: z.string().trim().min(2).max(3000),
  accessibilityDetails: z.string().trim().min(2).max(3000),
  availabilityPlan: z.string().trim().min(2).max(2000),
  capacityPlan: z.string().trim().min(2).max(2000),
  cancellationRules: z.string().trim().min(2).max(2000),
  intent: z.enum(["draft", "submitted"]),
});

export const reviewApplicationSchema = z.object({
  applicationId: z.uuid(),
  status: z.enum(["under_review", "verified", "rejected", "suspended"]),
  note: z.string().trim().max(4000),
  ownershipChecked: z.boolean(),
}).refine((value) => value.status !== "verified" || value.ownershipChecked, {
  path: ["ownershipChecked"], message: "Verify operator authorization before approval.",
});

export const inviteOperatorSchema = z.object({
  email: z.email().max(254),
  externalExperienceId: z.union([z.literal(""), z.uuid()]),
});
