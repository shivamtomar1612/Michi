import { z } from "zod";

export const bookingRequestSchema = z.object({
  slotId: z.uuid(), guests: z.number().int().min(1).max(100),
  acknowledged: z.literal(true), notes: z.string().max(2000),
  culturalRequirements: z.object({
    dietary: z.string().trim().max(250).optional(),
    accessibility: z.string().trim().max(250).optional(),
    language: z.string().trim().max(250).optional(),
    participation: z.string().trim().max(250).optional(),
    other: z.string().trim().max(250).optional(),
  }).strict(),
}).strict();

export const bookingCancellationSchema = z.object({}).strict();
