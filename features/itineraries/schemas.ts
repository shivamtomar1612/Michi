import { z } from "zod";
import { recommendationPreferencesSchema } from "@/features/recommendations/schemas";

export const itineraryGenerateSchema = z.object({
  recommendationLogId: z.string().uuid().nullable().optional(),
  startDestinationId: z.string().uuid(),
  preferences: recommendationPreferencesSchema,
  travelStyle: z.enum(["relaxed", "balanced", "packed"]),
}).strict();

export const itineraryDecisionSchema = z.object({
  recommendationLogId: z.string().uuid(),
  candidateId: z.string().uuid(),
  candidateType: z.enum(["michi_verified", "external_verified"]),
  decision: z.enum(["accepted", "rejected", "compared", "kept_original"]),
  suggestionOrigin: z.enum(["original_preference", "michi_alternative"]),
}).strict();

export const saveItinerarySchema = itineraryGenerateSchema.extend({
  name: z.string().trim().min(1).max(80),
  selected: z.array(z.object({
    candidateId: z.string().uuid(),
    candidateType: z.enum(["michi_verified", "external_verified"]),
    slotId: z.string().uuid().nullable(),
    suggestionOrigin: z.enum(["original_preference", "michi_alternative"]),
  }).strict()).min(1).max(40),
}).strict().refine((value) => {
  const ids = value.selected.map((item) => item.candidateId);
  return new Set(ids).size === ids.length;
}, { path: ["selected"], message: "Each activity can only appear once." });

export const itineraryUpdateSchema = z.object({
  itineraryId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  startDate: z.string().date(),
  endDate: z.string().date(),
  budgetJpy: z.number().int().min(0).max(2_000_000).nullable(),
}).strict().refine((value) => value.endDate >= value.startDate, { path: ["endDate"], message: "End date must be after the start date." });

export const reorderItinerarySchema = z.object({
  itineraryId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).max(100),
}).strict();

export const shareItinerarySchema = z.object({
  itineraryId: z.string().uuid(),
  shared: z.boolean(),
}).strict();
