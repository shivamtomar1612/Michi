"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";

const feedbackSchema = z.object({
  destinationId: z.uuid(),
  feedbackCategory: z.enum(["visitor_pressure", "cultural_respect", "operational_strain", "local_economic_benefit", "community_readiness", "environmental_concern"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  pressureScore: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]),
  comment: z.string().trim().max(1000),
  consent: z.literal("on", { error: "Consent is required for anonymous aggregate use." }),
});

export type CommunityActionState = { success: boolean; message: string };
const empty: CommunityActionState = { success: false, message: "" };
const field = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function submitCommunityFeedback(_state: CommunityActionState, form: FormData): Promise<CommunityActionState> {
  const { user, role } = await requireRole(["traveler", "host", "dmo"]);
  const parsed = feedbackSchema.safeParse({
    destinationId: field(form, "destinationId"), feedbackCategory: field(form, "feedbackCategory"),
    sentiment: field(form, "sentiment"), pressureScore: field(form, "pressureScore"),
    comment: field(form, "comment"), consent: field(form, "consent"),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Review your report." };
  const supabase = await createClient();

  let context: "host" | "community_representative" = "community_representative";
  let hostId: string | null = null;
  if (role === "host") {
    const { data: hostVerification } = await supabase.from("host_applications").select("id")
      .eq("applicant_id", user.id).eq("status", "verified").limit(1).maybeSingle();
    const { data: listing } = await supabase.from("experiences").select("id")
      .eq("host_id", user.id).eq("destination_id", parsed.data.destinationId).limit(1).maybeSingle();
    if (hostVerification && listing) { context = "host"; hostId = user.id; }
    else {
      const { data: access } = await supabase.from("destination_access_assignments").select("id")
        .eq("user_id", user.id).eq("destination_id", parsed.data.destinationId)
        .eq("access_scope", "community_representative").is("revoked_at", null).maybeSingle();
      if (!access) return { success: false, message: hostVerification ? "You do not have permission to report for this destination." : "Only MICHI-verified hosts or assigned community representatives can submit a report." };
    }
  } else if (role === "traveler" || role === "dmo") {
    const { data: access } = await supabase.from("destination_access_assignments").select("id")
      .eq("user_id", user.id).eq("destination_id", parsed.data.destinationId)
      .eq("access_scope", "community_representative").is("revoked_at", null).maybeSingle();
    if (!access) return { success: false, message: "You do not have permission to report for this destination." };
  }

  const pressure = parsed.data.pressureScore === "" ? null : parsed.data.pressureScore;
  const { error } = await supabase.from("community_feedback").insert({
    destination_id: parsed.data.destinationId,
    author_id: user.id,
    host_id: hostId,
    contributor_context: context,
    feedback_category: parsed.data.feedbackCategory,
    sentiment: parsed.data.sentiment,
    pressure_score: pressure,
    comment: parsed.data.comment,
    consent_to_aggregate: true,
    consent_given_at: new Date().toISOString(),
  });
  if (error) return { success: false, message: "Your report could not be submitted. You may already have submitted this dimension today." };
  revalidatePath("/community/feedback");
  revalidatePath("/host/community");
  revalidatePath("/dmo");
  return { success: true, message: "Your report is awaiting moderation. It will enter anonymous aggregates only after approval." };
}

export async function withdrawCommunityFeedback(_state: CommunityActionState, form: FormData): Promise<CommunityActionState> {
  await requireRole(["traveler", "host", "dmo"]);
  const id = z.uuid().safeParse(field(form, "feedbackId"));
  if (!id.success) return { success: false, message: "Invalid report reference." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("withdraw_community_feedback", { p_feedback_id: id.data });
  if (error || !data) return { success: false, message: "The report could not be withdrawn. Refresh and try again." };
  revalidatePath("/community/feedback");
  revalidatePath("/host/community");
  revalidatePath("/dmo");
  return { success: true, message: "Report withdrawn from current and future aggregates." };
}

export const communityActionInitialState = empty;
