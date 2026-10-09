import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { HostReviewForm } from "@/components/host-review-form";
import { OperatorInviteForm } from "@/components/operator-invite-form";
import { ExperienceApprovalForm } from "@/components/host-inventory";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";
import { AdminNav } from "@/app/[locale]/admin/_components/admin-nav";

export const metadata: Metadata = { title: "Data health and host review" };

async function loadMetrics() {
  const admin = await createAdminClient();
  const now = new Date().toISOString();
  const results = await Promise.all([
    admin.from("destinations").select("id", { count: "exact", head: true }).eq("status", "published").eq("verification_status", "verified_official"),
    admin.from("places").select("id", { count: "exact", head: true }).eq("verification_status", "verified_official"),
    admin.from("external_experiences").select("id", { count: "exact", head: true }).in("verification_status", ["verified_official", "verified_primary"]),
    admin.from("host_applications").select("id", { count: "exact", head: true }).eq("status", "verified"),
    admin.from("experiences").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_verified", true).eq("is_paused", false),
    admin.from("experience_slots").select("id", { count: "exact", head: true }).eq("status", "open").gt("starts_at", now),
    admin.from("destination_health_signals").select("id", { count: "exact", head: true }).eq("verification_status", "verified").gt("expires_at", now).neq("data_status", "simulated_demo"),
    admin.from("host_applications").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
    admin.from("recommendation_logs").select("id", { count: "exact", head: true }).neq("recommendations", "[]"),
    admin.from("external_experiences").select("id", { count: "exact", head: true }).lte("next_verification_at", now),
  ]);
  const values = results.map((result) => result.error ? null : result.count);
  const [openSlots, activeExperiences, currentSignals] = await Promise.all([
    admin.from("experience_slots").select("capacity,booked_count,experience_id").eq("status", "open").gt("starts_at", now).limit(10001),
    admin.from("experiences").select("id").eq("status", "published").eq("is_verified", true).eq("is_paused", false).limit(10001),
    admin.from("destination_health_signals").select("destination_id,component_key").eq("verification_status", "verified").gt("expires_at", now).neq("data_status", "simulated_demo").limit(10001),
  ]);
  const bounded = !openSlots.error && !activeExperiences.error && openSlots.data && activeExperiences.data
    && openSlots.data.length <= 10000 && activeExperiences.data.length <= 10000;
  const activeIds = new Set((activeExperiences.data ?? []).map((row) => String(row.id)));
  const capacity = bounded ? openSlots.data!.filter((row) => activeIds.has(String(row.experience_id)))
    .reduce((sum, row) => sum + Math.max(0, Number(row.capacity) - Number(row.booked_count)), 0) : null;
  const covered = !currentSignals.error && currentSignals.data && currentSignals.data.length <= 10000
    ? new Set(currentSignals.data.map((row) => `${row.destination_id}:${row.component_key}`)).size : null;
  const missing = values[0] === null || covered === null ? null : Math.max(0, values[0]! * 5 - covered);
  return [
    ["Real destinations", values[0]], ["Real places", values[1]], ["Verified external experiences", values[2]],
    ["Verified MICHI hosts", values[3]], ["Active MICHI experiences", values[4]],
    ["Upcoming genuine slots", values[5]], ["Available booking capacity", capacity],
    ["Current health signals", values[6]], ["Missing health components", missing],
    ["Records awaiting host review", values[7]], ["Recommendation runs with matches", values[8]],
    ["Stale external records", values[9]],
  ] as const;
}

async function loadOperationalMetrics() {
  const admin = await createAdminClient();
  const now = new Date().toISOString();
  const results = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
    admin.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "recommendation_generated"),
    admin.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "itinerary_generated"),
    admin.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "cultural_companion_question"),
    admin.from("traveler_reflections").select("booking_id", { count: "exact", head: true }),
    admin.from("destination_access_assignments").select("id", { count: "exact", head: true }).eq("access_scope", "dmo_analytics").is("revoked_at", null),
    admin.from("content_reports").select("id", { count: "exact", head: true }).in("status", ["pending", "under_review"]),
    admin.from("cultural_content").select("id", { count: "exact", head: true }).eq("is_active", true).lt("next_verification_at", now),
    admin.from("cultural_sources").select("id", { count: "exact", head: true }).eq("is_active", true).lt("stale_after", now),
    admin.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("action", "cultural_ingestion.preview").eq("outcome", "failed").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    admin.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("outcome", "failed").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    admin.from("admin_audit_log").select("id", { count: "exact", head: true }).in("action", ["host_application.reviewed", "experience.governance_state_changed", "community_feedback.reviewed", "content_report.reviewed", "cultural_content.reviewed"]).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);
  return [
    ["Registered profiles", results[0].error ? null : results[0].count],
    ["Confirmed MICHI bookings", results[1].error ? null : results[1].count],
    ["Recommendation requests", results[2].error ? null : results[2].count],
    ["Itinerary generations", results[3].error ? null : results[3].count],
    ["Cultural Companion questions", results[4].error ? null : results[4].count],
    ["Saved reflections", results[5].error ? null : results[5].count],
    ["Active DMO assignments", results[6].error ? null : results[6].count],
    ["Open content reports", results[7].error ? null : results[7].count],
    ["Content due for verification", results[8].error ? null : results[8].count],
    ["Sources past freshness date", results[9].error ? null : results[9].count],
    ["Failed ingestion previews · 30 days", results[10].error ? null : results[10].count],
    ["Failed admin operations · 30 days", results[11].error ? null : results[11].count],
    ["Recent verification/moderation decisions · 30 days", results[12].error ? null : results[12].count],
  ] as const;
}

export default async function AdminPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: applications, error: applicationError } = await supabase.from("host_applications")
    .select("id,organization_name,legal_name,official_website,external_experience_id,contact_email,ownership_evidence,experience_description,cultural_rules,accessibility_details,availability_plan,capacity_plan,cancellation_rules,status,submitted_at")
    .in("status", ["submitted", "under_review", "verified"]).order("submitted_at", { ascending: false }).limit(100);
  let metrics: Awaited<ReturnType<typeof loadMetrics>> | null = null;
  let operations: Awaited<ReturnType<typeof loadOperationalMetrics>> | null = null;
  let pendingExperiences: Array<{ id: string; title: string; host_id: string }> | null = null;
  try { metrics = await loadMetrics(); } catch { /* Report unavailable, never estimate counts. */ }
  try { operations = await loadOperationalMetrics(); } catch { /* Keep unavailable metrics explicit. */ }
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.from("experiences").select("id,title,host_id")
      .eq("is_verified", false).eq("status", "draft").order("created_at", { ascending: false }).limit(100);
    if (!error) pendingExperiences = data as Array<{ id: string; title: string; host_id: string }>;
  } catch { /* Privileged review queue unavailable. */ }
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-5xl">
    <p className="eyebrow">Operations</p><h1 className="mt-3 font-serif text-4xl">Data health and host review</h1>
    <p className="mt-4 text-sm leading-6 text-ink/65">Counts come from the connected database. Unavailable metrics are shown as unavailable.</p>
    <AdminNav />
    <section className="mt-9" aria-labelledby="data-health-title"><h2 id="data-health-title" className="font-serif text-2xl">Data health</h2>
      {metrics ? <dl className="mt-4 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="bg-paper p-4"><dt className="text-xs text-ink/60">{label}</dt><dd className="mt-2 font-serif text-3xl tabular-nums">{value ?? "Unavailable"}</dd></div>)}</dl>
        : <p role="status" className="mt-4 border-l-2 border-vermilion p-4 text-sm">Privileged data metrics are unavailable. The server key or onboarding migration may be missing.</p>}
      <p className="mt-3 text-xs text-ink/55">Source ingestion failures are not yet recorded as database events.</p>
    </section>
    <section className="mt-12" aria-labelledby="operations-title"><h2 id="operations-title" className="font-serif text-2xl">Platform activity</h2>
      <p className="mt-2 text-xs text-ink/55">These are MICHI database and event counts, not total destination visitor volume or verified local economic impact.</p>
      {operations ? <dl className="mt-4 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-3">{operations.map(([label, value]) => <div key={label} className="bg-paper p-4"><dt className="text-xs text-ink/60">{label}</dt><dd className="mt-2 font-serif text-3xl tabular-nums">{value ?? "Unavailable"}</dd></div>)}</dl>
        : <p role="status" className="mt-4 border-l-2 border-vermilion p-4 text-sm">Operational metrics are unavailable.</p>}
      <p className="mt-3 text-xs text-ink/55">Ingestion failures and application errors are not currently persisted as operational events. They are not represented as zero here.</p>
    </section>
    <section className="mt-12" aria-labelledby="invite-title"><h2 id="invite-title" className="font-serif text-2xl">Invite a genuine operator</h2><OperatorInviteForm /></section>
    <section className="mt-12" aria-labelledby="host-review-title"><h2 id="host-review-title" className="font-serif text-2xl">Operator applications</h2>
      {applicationError ? <p role="alert" className="mt-4 text-sm text-vermilion">Applications cannot be read. The onboarding migration or admin access may be missing.</p>
        : applications?.length ? <div className="mt-5 grid gap-5">{applications.map((application) => <article key={String(application.id)} className="border border-ink/15 bg-white p-5">
          <h3 className="font-serif text-xl">{String(application.organization_name)}</h3><p className="mt-1 text-xs text-ink/60">{String(application.status).replace("_", " ")} · {String(application.legal_name)} · {String(application.contact_email)}</p>
          {application.official_website ? <a href={String(application.official_website)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-vermilion underline">Official website</a> : null}
          <p className="mt-2 text-xs text-ink/60">External listing association: {application.external_experience_id ? String(application.external_experience_id) : "none selected"}. Selection does not prove authorization.</p>
          <dl className="mt-4 grid gap-3 text-sm">{[["Authorization evidence", application.ownership_evidence], ["Experience", application.experience_description], ["Cultural rules", application.cultural_rules], ["Accessibility", application.accessibility_details], ["Availability", application.availability_plan], ["Capacity", application.capacity_plan], ["Cancellation", application.cancellation_rules]].map(([label, value]) => <div key={String(label)}><dt className="font-semibold">{String(label)}</dt><dd className="text-ink/70">{String(value ?? "")}</dd></div>)}</dl>
          <HostReviewForm applicationId={String(application.id)} />
        </article>)}</div> : <p className="mt-4 text-sm text-ink/65">No operator applications awaiting review.</p>}
    </section>
    <section className="mt-12" aria-labelledby="experience-review-title"><h2 id="experience-review-title" className="font-serif text-2xl">Experience moderation</h2>
      {pendingExperiences === null ? <p className="mt-4 text-sm text-ink/65">Experience review queue unavailable.</p>
        : pendingExperiences.length ? <div className="mt-4 grid gap-4">{pendingExperiences.map((item) => <article key={item.id} className="border border-ink/15 bg-white p-5"><h3 className="font-serif text-xl">{item.title}</h3><p className="mt-2 text-xs text-ink/55">Host account: {item.host_id}. Confirm the application and listing details before publication.</p><ExperienceApprovalForm experienceId={item.id} /></article>)}</div>
          : <p className="mt-4 text-sm text-ink/65">No draft experiences awaiting review.</p>}
    </section>
  </div></WorkspaceShell>;
}
