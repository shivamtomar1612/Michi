"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";
import { hostApplicationSchema, reviewApplicationSchema, inviteOperatorSchema } from "./schemas";
import { createAdminClient } from "@/server/supabase/admin";

export type HostActionState = { message: string; success: boolean; data?: string };
export const initialHostActionState: HostActionState = { message: "", success: false };

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

export async function submitHostApplication(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["traveler"]);
  const parsed = hostApplicationSchema.safeParse({
    externalExperienceId: field(form, "externalExperienceId"),
    legalName: field(form, "legalName"), organizationName: field(form, "organizationName"),
    officialWebsite: field(form, "officialWebsite"), contactEmail: field(form, "contactEmail"),
    ownershipEvidence: field(form, "ownershipEvidence"), experienceDescription: field(form, "experienceDescription"),
    culturalRules: field(form, "culturalRules"), accessibilityDetails: field(form, "accessibilityDetails"),
    availabilityPlan: field(form, "availabilityPlan"), capacityPlan: field(form, "capacityPlan"),
    cancellationRules: field(form, "cancellationRules"), intent: field(form, "intent"),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check the application fields." };
  const data = parsed.data;
  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase.from("host_applications")
    .select("id,status").eq("applicant_id", user.id).in("status", ["draft", "submitted", "under_review", "verified"]).maybeSingle();
  if (lookupError) return { success: false, message: "The application service is unavailable." };
  if (existing && existing.status !== "draft") return { success: false, message: "Your application is already being reviewed." };
  const values = {
    external_experience_id: data.externalExperienceId || null,
    legal_name: data.legalName, organization_name: data.organizationName,
    official_website: data.officialWebsite || null, contact_email: data.contactEmail,
    ownership_evidence: data.ownershipEvidence, experience_description: data.experienceDescription,
    cultural_rules: data.culturalRules, accessibility_details: data.accessibilityDetails,
    availability_plan: data.availabilityPlan, capacity_plan: data.capacityPlan,
    cancellation_rules: data.cancellationRules, status: data.intent,
    submitted_at: data.intent === "submitted" ? new Date().toISOString() : null,
  };
  const { error } = existing
    ? await supabase.from("host_applications").update(values).eq("id", String(existing.id))
    : await supabase.from("host_applications").insert({ ...values, applicant_id: user.id });
  if (error) return { success: false, message: "The application could not be saved. Please try again." };
  return { success: true, message: data.intent === "submitted"
    ? "Application submitted. MICHI will review operator authorization before granting host access."
    : "Draft saved. You can return and submit it later." };
}

export async function reviewHostApplication(_state: HostActionState, form: FormData): Promise<HostActionState> {
  await requireRole(["admin"]);
  const parsed = reviewApplicationSchema.safeParse({
    applicationId: field(form, "applicationId"), status: field(form, "status"),
    note: field(form, "note"), ownershipChecked: form.get("ownershipChecked") === "on",
  });
  if (!parsed.success) return { success: false, message: "Check the review fields." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_host_application", {
    p_application_id: parsed.data.applicationId, p_status: parsed.data.status,
    p_note: parsed.data.note, p_ownership_checked: parsed.data.ownershipChecked,
  });
  if (error) return { success: false, message: error.message };
  return { success: true, message: `Application marked ${parsed.data.status.replace("_", " ")}.` };
}

export async function inviteOperator(_state: HostActionState, form: FormData): Promise<HostActionState> {
  const { user } = await requireRole(["admin"]);
  const parsed = inviteOperatorSchema.safeParse({
    email: field(form, "email"), externalExperienceId: field(form, "externalExperienceId"),
  });
  if (!parsed.success) return { success: false, message: "Enter a valid email and optional external listing ID." };
  let admin: Awaited<ReturnType<typeof createAdminClient>>;
  try { admin = await createAdminClient(); } catch { return { success: false, message: "Operator invitations require server-side privileged access." }; }
  if (parsed.data.externalExperienceId) {
    const { data: listing, error } = await admin.from("external_experiences").select("id,verification_status")
      .eq("id", parsed.data.externalExperienceId).maybeSingle();
    if (error || !listing || !["verified_primary", "verified_official"].includes(String(listing.verification_status))) {
      return { success: false, message: "Choose an existing verified external listing." };
    }
  }
  const { data: invitation, error: insertError } = await admin.from("host_invitations").insert({
    email: parsed.data.email.toLocaleLowerCase(), external_experience_id: parsed.data.externalExperienceId || null,
    invited_by: user.id, status: "prepared",
  }).select("id").single();
  if (insertError || !invitation) return { success: false, message: "Invitation could not be prepared. Check whether this operator was already invited." };
  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) return { success: false, message: "Invitation prepared, but the public app URL is not configured for email delivery." };
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/traveler/host-application`,
  });
  if (inviteError) return { success: false, message: "Invitation prepared, but the email could not be sent. Review the invitation record before retrying." };
  const { error: markError } = await admin.from("host_invitations").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", String(invitation.id));
  if (markError) return { success: false, message: "Email sent, but the invitation status could not be updated. Check the record before retrying." };
  return { success: true, message: "Invitation sent. The operator will still need to submit authorization evidence for review." };
}
