import { z } from "zod";

export const destinationHealthEventSchema = z.object({
  eventName: z.enum([
    "destination_health_viewed",
    "alternative_shown",
    "alternative_selected",
    "popular_destination_retained",
  ]),
  destinationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  targetDestinationId: z.string().uuid().optional(),
  alternativeCount: z.number().int().min(0).max(10).optional(),
}).strict();
