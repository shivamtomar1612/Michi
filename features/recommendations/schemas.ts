import { z } from "zod";

const rawTags = z.array(z.string().trim().min(1).max(48)).max(12);
const tags = rawTags.transform((values) => [...new Set(values)]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid calendar date.");

export const recommendationPreferencesSchema = z.object({
  interests: rawTags.min(1).transform((values) => [...new Set(values)]),
  budgetJpy: z.number().int().min(0).max(2_000_000).nullable(),
  startDate: date,
  endDate: date,
  regions: tags,
  pace: z.enum(["relaxed", "balanced", "active"]),
  accessibility: z.record(z.string().trim().min(1).max(48), z.boolean()).refine((value) => Object.keys(value).length <= 10),
  dietaryPreferences: tags,
  languages: tags,
  culturalInterests: tags,
  crowdTolerance: z.number().int().min(0).max(100),
}).strict().refine((value) => value.endDate >= value.startDate, {
  path: ["endDate"],
  message: "End date must be on or after the start date.",
}).refine((value) => Date.parse(`${value.endDate}T00:00:00.000Z`) - Date.parse(`${value.startDate}T00:00:00.000Z`) <= 365 * 24 * 60 * 60 * 1000, {
  path: ["endDate"],
  message: "Choose a travel window of one year or less.",
});

export const recommendationFeedbackSchema = z.object({
  recommendationLogId: z.string().uuid(),
  experienceId: z.string().uuid(),
  decision: z.enum(["accepted", "rejected"]),
}).strict();

export type RecommendationPreferencesInput = z.infer<typeof recommendationPreferencesSchema>;
export type RecommendationFeedbackInput = z.infer<typeof recommendationFeedbackSchema>;
