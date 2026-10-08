import "server-only";
import type { Json } from "@/types/database";
import { createAdminClient } from "@/server/supabase/admin";
import { isAuditMetadataSafe } from "@/features/admin/policy";

export type AdminAuditEvent = {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  outcome?: "success" | "denied" | "failed";
  metadata?: Record<string, string | number | boolean | null>;
};

/** Writes only bounded, non-sensitive metadata to the append-only governance log. */
export async function recordAdminAudit(event: AdminAuditEvent): Promise<boolean> {
  const metadata = event.metadata ?? {};
  if (!isAuditMetadataSafe(metadata)) return false;

  try {
    const admin = await createAdminClient();
    const { error } = await admin.from("admin_audit_log").insert({
      actor_id: event.actorId,
      action: event.action,
      target_type: event.targetType,
      target_id: event.targetId ?? null,
      outcome: event.outcome ?? "success",
      metadata: metadata as Json,
    });
    return !error;
  } catch {
    return false;
  }
}
