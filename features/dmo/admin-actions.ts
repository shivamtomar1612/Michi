"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";

export type DmoAdminActionState = { success: boolean; message: string };
const read = (form: FormData, key: string) => String(form.get(key) ?? "");
const uuid = z.uuid();
const empty: DmoAdminActionState = { success: false, message: "" };

export async function grantDestinationAccess(_state: DmoAdminActionState, form: FormData): Promise<DmoAdminActionState> {
  const { user } = await requireRole(["admin"]);
  const parsed = z.object({
    userId: uuid,
    destinationId: uuid,
    scope: z.enum(["dmo_analytics", "community_representative"]),
  }).safeParse({ userId: read(form, "userId"), destinationId: read(form, "destinationId"), scope: read(form, "scope") });
  if (!parsed.success) return { success: false, message: "Choose an existing account, destination and access scope." };
  try {
    const admin = await createAdminClient();
    const { error } = await admin.rpc("admin_grant_destination_access", {
      p_admin_id: user.id, p_user_id: parsed.data.userId,
      p_destination_id: parsed.data.destinationId, p_access_scope: parsed.data.scope,
    });
    if (error) return { success: false, message: "Access could not be granted. Check the target account role and published destination." };
    revalidatePath("/admin/dmo-access");
    revalidatePath("/dmo");
    return { success: true, message: parsed.data.scope === "dmo_analytics"
      ? "Destination access granted to the existing account."
      : "Community representative access granted to the existing account." };
  } catch {
    return { success: false, message: "The access-management service is unavailable." };
  }
}

export async function revokeDestinationAccess(_state: DmoAdminActionState, form: FormData): Promise<DmoAdminActionState> {
  const { user } = await requireRole(["admin"]);
  const assignmentId = uuid.safeParse(read(form, "assignmentId"));
  if (!assignmentId.success) return { success: false, message: "Invalid access assignment." };
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.rpc("admin_revoke_destination_access", {
      p_admin_id: user.id, p_assignment_id: assignmentId.data,
    });
    if (error || !data) return { success: false, message: "The active assignment could not be revoked." };
    revalidatePath("/admin/dmo-access");
    revalidatePath("/dmo");
    revalidatePath("/community/feedback");
    return { success: true, message: "Destination access revoked." };
  } catch {
    return { success: false, message: "The access-management service is unavailable." };
  }
}

export async function reviewCommunityFeedback(_state: DmoAdminActionState, form: FormData): Promise<DmoAdminActionState> {
  await requireRole(["admin"]);
  const parsed = z.object({ id: uuid, decision: z.enum(["approved", "rejected"]) }).safeParse({
    id: read(form, "feedbackId"), decision: read(form, "decision"),
  });
  if (!parsed.success) return { success: false, message: "Invalid moderation decision." };
  try {
    const admin = await createAdminClient();
    const { data: report, error: readError } = await admin.from("community_feedback")
      .select("id,consent_to_aggregate,moderation_status,withdrawn_at").eq("id", parsed.data.id).maybeSingle();
    if (readError || !report || report.moderation_status !== "pending" || report.withdrawn_at) {
      return { success: false, message: "This report is no longer awaiting review." };
    }
    if (parsed.data.decision === "approved" && !report.consent_to_aggregate) {
      return { success: false, message: "This report has no aggregate-use consent and cannot be approved for DMO metrics." };
    }
    const { data: updated, error } = await admin.from("community_feedback").update({ moderation_status: parsed.data.decision })
      .eq("id", parsed.data.id).eq("moderation_status", "pending").is("withdrawn_at", null)
      .select("id").maybeSingle();
    if (error || !updated) return { success: false, message: "This report changed before moderation could be saved. Refresh the queue." };
    revalidatePath("/admin/community-feedback");
    revalidatePath("/dmo");
    return { success: true, message: parsed.data.decision === "approved" ? "Report approved for anonymous aggregates." : "Report rejected." };
  } catch {
    return { success: false, message: "The moderation service is unavailable." };
  }
}

export const dmoAdminInitialState = empty;
