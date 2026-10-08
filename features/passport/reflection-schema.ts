import { z } from "zod";

export const passportReflectionSchema = z.object({
  bookingId: z.uuid(),
  learningReflection: z.string().trim().min(10).max(2000),
  culturalPreparationCompleted: z.boolean(),
  preparationHelpfulness: z.number().int().min(1).max(5).nullable(),
  understandingScore: z.number().int().min(1).max(5),
  hostRating: z.number().int().min(1).max(5),
  culturalDepthScore: z.number().int().min(1).max(5),
}).strict().refine(
  (input) => input.culturalPreparationCompleted
    ? input.preparationHelpfulness !== null
    : input.preparationHelpfulness === null,
  { path: ["preparationHelpfulness"], message: "Rate preparation only if you completed it." },
);

export type PassportReflectionInput = z.infer<typeof passportReflectionSchema>;
