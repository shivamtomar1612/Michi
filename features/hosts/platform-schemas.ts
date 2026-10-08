import { z } from "zod";

const optionalCoordinate = z.union([
  z.literal(""),
  z.coerce.number().finite(),
]).transform((value) => value === "" ? null : value);

export const hostExperienceSchema = z.object({
  experienceId: z.union([z.literal(""), z.uuid()]),
  destinationId: z.uuid(),
  title: z.string().trim().min(5).max(160),
  shortDescription: z.string().trim().min(20).max(300),
  description: z.string().trim().min(50).max(5000),
  culturalContext: z.string().trim().min(20).max(3000),
  priceJpy: z.coerce.number().int().min(0).max(2_000_000),
  durationMinutes: z.coerce.number().int().min(15).max(1440),
  maxCapacity: z.coerce.number().int().min(1).max(1000),
  languages: z.string().max(300),
  interests: z.string().trim().min(2).max(300),
  rulesLanguage: z.enum(["en", "ja"]),
  participationRules: z.string().trim().min(10).max(3000),
  etiquetteRules: z.string().trim().max(3000),
  eligibility: z.string().trim().max(2000),
  cancellationRules: z.string().trim().min(10).max(2000),
  accessibilityNotes: z.string().trim().min(2).max(3000),
  meetingPoint: z.string().trim().min(3).max(300),
  latitude: optionalCoordinate,
  longitude: optionalCoordinate,
  photographyPolicy: z.enum(["ask_host", "allowed", "not_allowed"]),
  stepFree: z.boolean(),
  wheelchairAccess: z.boolean(),
  imagePaths: z.array(z.string().min(1).max(500)).max(8),
}).refine((data) => (data.latitude === null) === (data.longitude === null), {
  path: ["latitude"], message: "Enter both coordinates or leave both blank.",
}).refine((data) => data.latitude === null || data.latitude >= -90 && data.latitude <= 90, {
  path: ["latitude"], message: "Latitude must be between -90 and 90.",
}).refine((data) => data.longitude === null || data.longitude >= -180 && data.longitude <= 180, {
  path: ["longitude"], message: "Longitude must be between -180 and 180.",
});

export const hostSettingsSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  preferredLanguage: z.string().trim().min(2).max(16),
});

export const hostCommunityFeedbackSchema = z.object({
  destinationId: z.uuid(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  pressureScore: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]),
  comment: z.string().trim().min(8).max(1000),
});
