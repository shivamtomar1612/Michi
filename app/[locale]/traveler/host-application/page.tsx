import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { HostApplicationForm } from "@/components/host-application-form";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";
import { listExternalExperiences } from "@/server/data/catalogue";

export const metadata: Metadata = { title: "Apply to host" };

export default async function HostApplicationPage() {
  const { user } = await requireRole(["traveler"]);
  const supabase = await createClient();
  const listings = await listExternalExperiences();
  const { data, error } = await supabase.from("host_applications").select("*")
    .eq("applicant_id", user.id).in("status", ["draft", "submitted", "under_review", "verified"])
    .maybeSingle();
  const values = data as Record<string, unknown> | null;
  const initial: Record<string, string> = {};
  if (values?.status === "draft") {
    for (const [name, column] of Object.entries({
      externalExperienceId: "external_experience_id", legalName: "legal_name", organizationName: "organization_name", officialWebsite: "official_website",
      contactEmail: "contact_email", ownershipEvidence: "ownership_evidence",
      experienceDescription: "experience_description", culturalRules: "cultural_rules",
      accessibilityDetails: "accessibility_details", availabilityPlan: "availability_plan",
      capacityPlan: "capacity_plan", cancellationRules: "cancellation_rules",
    })) initial[name] = typeof values[column] === "string" ? values[column] as string : "";
  }
  return <WorkspaceShell role="Traveler" basePath="/traveler"><div className="mx-auto max-w-3xl">
    <p className="eyebrow">Community operator onboarding</p><h1 className="mt-3 font-serif text-4xl">Apply to host on MICHI</h1>
    {error ? <p role="alert" className="mt-6 border-l-2 border-vermilion p-4 text-sm">Host applications are not available on this project yet.</p>
      : values && values.status !== "draft" ? <p role="status" className="mt-6 border-l-2 border-moss p-4 text-sm">Application status: {String(values.status).replace("_", " ")}. MICHI will not publish an experience or create availability before operator authorization is reviewed.</p>
      : <HostApplicationForm initial={initial} externalListings={listings.ok ? listings.data : []} />}
  </div></WorkspaceShell>;
}
