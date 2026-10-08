import { z } from "zod";
import { CULTURAL_CATEGORIES } from "@/features/cultural-knowledge/types";

export const sourceIdSchema = z.string().uuid();

export const evidenceRequestSchema = z.object({
  query: z.string().trim().min(2).max(500), destinationId: z.string().uuid().optional(), experienceId: z.string().uuid().optional(),
  category: z.enum(CULTURAL_CATEGORIES).optional(), language: z.string().trim().min(2).max(16).optional(), limit: z.number().int().min(1).max(20).optional(),
});
export const sourceCreateSchema = z.object({
  name: z.string().trim().min(2).max(160), baseUrl: z.string().url().max(500),
  sourceType: z.enum(["government", "national_tourism_board", "prefecture", "municipality", "dmo", "cultural_institution", "temple_shrine", "museum", "host", "editorial"]),
  authorityLevel: z.number().int().min(1).max(5), language: z.string().trim().min(2).max(16).default("en"), notes: z.string().trim().max(2000).default(""),
});
export const contentSubmitSchema = z.object({
  sourceId: z.string().uuid(), title: z.string().trim().min(2).max(300), summary: z.string().trim().max(1000).default(""),
  content: z.string().trim().min(20).max(12000), category: z.enum(CULTURAL_CATEGORIES), language: z.string().trim().min(2).max(16).default("en"),
  sourceUrl: z.string().url().max(1000), destinationId: z.string().uuid().optional(), isTimeSensitive: z.boolean().default(false),
  retrievedAt: z.string().datetime().optional(), metadata: z.record(z.string(), z.unknown()).default({}),
});
export const reviewContentSchema = z.object({ id: z.string().uuid(), decision: z.enum(["approve", "reject", "disable"]), verificationStatus: z.enum(["official_verified", "community_verified", "unverified"]).optional(), nextVerificationAt: z.string().datetime().nullable().optional() });
