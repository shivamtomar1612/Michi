import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1200),
}).strict();

export const culturalAssistantRequestSchema = z.object({
  question: z.string().trim().min(2).max(1200),
  destinationId: z.string().uuid().optional(),
  experienceId: z.string().uuid().optional(),
  language: z.enum(["en", "ja"]).default("en"),
  conversationId: z.string().uuid().optional(),
  history: z.array(messageSchema).max(6).default([]),
}).strict().superRefine((value, context) => {
  const total = value.question.length + value.history.reduce((sum, message) => sum + message.content.length, 0);
  if (total > 5000) context.addIssue({ code: "custom", message: "Conversation context is too long." });
  if (value.history.filter((message) => message.role === "user").length > 3) {
    context.addIssue({ code: "custom", message: "Only the latest three user turns may be included." });
  }
});

export const culturalAssistantModelResponseSchema = z.object({
  answer: z.string().trim().min(1).max(5000),
  evidenceUsedIds: z.array(z.string().uuid()).max(8),
  uncertainty: z.boolean(),
  recommendedAction: z.string().trim().min(1).max(500),
}).strict();

export type CulturalAssistantRequest = z.infer<typeof culturalAssistantRequestSchema>;
export type CulturalAssistantModelResponse = z.infer<typeof culturalAssistantModelResponseSchema>;
export type ConversationMessage = z.infer<typeof messageSchema>;
