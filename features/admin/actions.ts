"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";
import { recordAdminAudit } from "@/server/admin/audit";
import { createClient } from "@/lib/supabase/server";
import { contentReportSchema, hasPublishableDestinationProvenance } from "@/features/admin/policy";

export type AdminActionState = { success: boolean; message: string };
const read = (form: FormData, name: string) => String(form.get(name) ?? "");

export async function updateDestination(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  const { user } = await requireRole(["admin"]);
  const parsed = z.object({
    id: z.uuid(), name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(3000), culturalSummary: z.string().trim().max(3000),
    status: z.enum(["draft", "published", "archived"]),
  }).safeParse({
    id: read(form, "destinationId"), name: read(form, "name"),
    description: read(form, "description"), culturalSummary: read(form, "culturalSummary"),
    status: read(form, "status"),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check destination fields." };

  const admin = await createAdminClient();
  const { data: existing, error: readError } = await admin.from("destinations")
    .select("id,status,verification_status,data_status,source_id,source_url,last_verified_at,next_verification_at")
    .eq("id", parsed.data.id).maybeSingle();
  if (readError || !existing) return { success: false, message: "Destination was not found." };
  if (parsed.data.status === "published") {
    const { data: source } = existing.source_id
      ? await admin.from("data_sources").select("is_official,is_active").eq("id", existing.source_id).maybeSingle()
      : { data: null };
    if (!hasPublishableDestinationProvenance({
      verificationStatus: existing.verification_status, dataStatus: existing.data_status,
      sourceId: existing.source_id, sourceUrl: existing.source_url,
      lastVerifiedAt: existing.last_verified_at, nextVerificationAt: existing.next_verification_at,
      sourceIsOfficial: source?.is_official === true, sourceIsActive: source?.is_active === true,
    })) {
      return { success: false, message: "Publishing requires current verified official provenance from an active official source." };
    }
  }
  const { error } = await admin.from("destinations").update({
    name: parsed.data.name, description: parsed.data.description,
    cultural_summary: parsed.data.culturalSummary, status: parsed.data.status,
  }).eq("id", parsed.data.id);
  if (error) return { success: false, message: "Destination changes could not be saved." };
  const audited = await recordAdminAudit({ actorId: user.id, action: "destination.content_updated", targetType: "destination", targetId: parsed.data.id,
    metadata: { previous_status: existing.status, new_status: parsed.data.status, fields: "name,description,cultural_summary,status" } });
  revalidatePath("/admin/destinations"); revalidatePath("/destinations");
  return { success: true, message: audited ? "Destination content saved with its existing provenance." : "Destination saved. Audit confirmation could not be recorded; notify an administrator." };
}

export async function reviewContentReport(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  const { user } = await requireRole(["admin"]);
  const parsed = z.object({
    id: z.uuid(), status: z.enum(["under_review", "resolved", "dismissed"]),
    reason: z.enum(["inaccurate", "safety", "cultural_concern", "accessibility", "misleading_commercial_claim", "privacy", "other"]),
    note: z.string().trim().max(1200),
  }).safeParse({ id: read(form, "reportId"), status: read(form, "status"), reason: read(form, "reason"), note: read(form, "reviewerNote") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check the review fields." };
  const admin = await createAdminClient();
  const reviewedAt = parsed.data.status === "under_review" ? null : new Date().toISOString();
  const { data, error } = await admin.from("content_reports").update({
    status: parsed.data.status, reviewer_id: user.id, reviewer_reason: parsed.data.reason,
    reviewer_note: parsed.data.note || null, reviewed_at: reviewedAt,
  }).eq("id", parsed.data.id).in("status", ["pending", "under_review"]).select("id").maybeSingle();
  if (error || !data) return { success: false, message: "Report could not be updated. It may have changed; refresh and retry." };
  // Database trigger writes the decision to the append-only log in this transaction.
  revalidatePath("/admin/reports");
  return { success: true, message: `Report marked ${parsed.data.status.replace("_", " ")}.` };
}

export async function reportPublicContent(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  const { user } = await requireRole(["traveler", "host", "dmo", "admin"]);
  const parsed = contentReportSchema.safeParse({ subjectType: read(form, "subjectType"), subjectId: read(form, "subjectId"), reasonCode: read(form, "reasonCode"), details: read(form, "details") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Review the report details." };
  const supabase = await createClient();
  const { error } = await supabase.from("content_reports").insert({
    reporter_id: user.id, subject_type: parsed.data.subjectType, subject_id: parsed.data.subjectId,
    reason_code: parsed.data.reasonCode, details: parsed.data.details,
  });
  if (error) return { success: false, message: "The report could not be submitted. Confirm the item is still public and try again." };
  return { success: true, message: "Thank you. Your report has been sent for administrator review." };
}

export async function requestReportAppeal(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  const { user } = await requireRole(["traveler", "host", "dmo", "admin"]);
  const parsed = z.object({ id: z.uuid(), message: z.string().trim().min(10).max(1200) }).safeParse({
    id: read(form, "reportId"), message: read(form, "appealMessage"),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Enter a reconsideration message." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("content_reports").update({
    appeal_message: parsed.data.message, appeal_requested_at: new Date().toISOString(),
  }).eq("id", parsed.data.id).eq("reporter_id", user.id).in("status", ["resolved", "dismissed"]).is("appeal_requested_at", null).select("id").maybeSingle();
  if (error || !data) return { success: false, message: "This report cannot be appealed again. Refresh to check its current status." };
  revalidatePath("/report/mine");
  return { success: true, message: "Reconsideration requested. Your report remains private." };
}
