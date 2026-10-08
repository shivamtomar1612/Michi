import { z } from "zod";

export const destinationHealthEventSchema = z.object({
  eventName: z.enum([
    "destination_health_viewed",
    "alternative_shown",
    "alternative_selected",
    "popular_destination_retained",
    "destination_viewed",
    "experience_viewed",
    "recommendation_generated",
    "alternative_considered",
    "itinerary_generated",
    "cultural_learning_interaction",
    "reflection_submitted",
  ]),
  destinationId: z.string().uuid(),
  experienceId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  targetDestinationId: z.string().uuid().optional(),
  alternativeCount: z.number().int().min(0).max(10).optional(),
  recommendationCount: z.number().int().min(0).max(100).optional(),
  experienceCount: z.number().int().min(0).max(100).optional(),
}).strict().superRefine((event, context) => {
  if (event.eventName === "experience_viewed" && !event.experienceId) {
    context.addIssue({ code: "custom", path: ["experienceId"], message: "Experience views require an experience ID." });
  }
});
