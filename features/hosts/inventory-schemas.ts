import { z } from "zod";

export const experienceDraftSchema = z.object({
  destinationId: z.uuid(), title: z.string().trim().min(5).max(160),
  shortDescription: z.string().trim().min(20).max(300),
  description: z.string().trim().min(50).max(5000),
  culturalContext: z.string().trim().min(20).max(3000),
  priceJpy: z.coerce.number().int().min(0).max(2_000_000),
  durationMinutes: z.coerce.number().int().min(15).max(1440),
  maxCapacity: z.coerce.number().int().min(1).max(1000),
  languages: z.string().max(300), interests: z.string().max(300),
  participationRules: z.string().trim().min(10).max(3000),
  cancellationRules: z.string().trim().min(10).max(3000),
  accessibilityNotes: z.string().trim().min(2).max(3000),
  meetingPoint: z.string().trim().min(3).max(300),
  photographyPolicy: z.enum(["ask_host", "allowed", "not_allowed"]),
  stepFree: z.boolean(), wheelchairAccess: z.boolean(),
});

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
export const slotDraftSchema = z.object({
  experienceId: z.uuid(), startsAt: localDateTime, endsAt: localDateTime,
  capacity: z.coerce.number().int().min(1).max(1000),
});
