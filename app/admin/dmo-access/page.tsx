import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { DestinationAccessGrantForm, RevokeDestinationAccessForm } from "@/components/dmo-access-admin";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";
import { AdminNav } from "@/app/admin/_components/admin-nav";

export const metadata: Metadata = { title: "Destination access · MICHI admin" };

export default async function DmoAccessAdminPage() {
  await requireRole(["admin"]);
  const admin = await createAdminClient();
  const [{ data: profiles, error: profilesError }, { data: destinations, error: destinationsError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    admin.from("profiles").select("id,full_name,role").in("role", ["traveler", "host", "dmo"]).order("full_name").limit(500),
    admin.from("destinations").select("id,name,prefecture").eq("status", "published").order("name").limit(200),
    admin.from("destination_access_assignments").select("id,user_id,destination_id,access_scope,granted_at").is("revoked_at", null).order("granted_at", { ascending: false }).limit(500),
  ]);
  const profileNames = new Map((profiles ?? []).map((profile) => [profile.id, `${profile.full_name || "Unnamed account"} · ${profile.role} · ${profile.id.slice(0, 8)}`]));
  const destinationNames = new Map((destinations ?? []).map((destination) => [destination.id, `${destination.name}${destination.prefecture ? ` · ${destination.prefecture}` : ""}`]));
  const loadError = profilesError || destinationsError || assignmentsError;
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-5xl">
    <p className="eyebrow">Access governance</p><h1 className="mt-3 font-serif text-4xl">Destination access</h1>
    <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/65">Grant destination-specific DMO analytics or community-representative feedback access to an existing profile. Assignment and role authorization are checked server-side; signup metadata cannot grant these privileges.</p>
    <AdminNav />
    {loadError ? <p role="alert" className="mt-8 border-l-2 border-vermilion p-4 text-sm">Access records could not be loaded.</p> : <>
      <section className="mt-8"><h2 className="mb-4 font-serif text-2xl">Grant access</h2><DestinationAccessGrantForm
        users={(profiles ?? []).map((profile) => ({ id: profile.id, label: `${profile.full_name || "Unnamed account"} · ${profile.role} · ${profile.id.slice(0, 8)}` }))}
        destinations={(destinations ?? []).map((destination) => ({ id: destination.id, label: `${destination.name}${destination.prefecture ? ` · ${destination.prefecture}` : ""}` }))} /></section>
      <section className="mt-12"><h2 className="font-serif text-2xl">Active assignments</h2>
        {assignments?.length ? <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">{assignments.map((assignment) => <li key={assignment.id} className="flex flex-wrap items-start justify-between gap-4 py-5"><div><p className="text-sm font-semibold">{destinationNames.get(assignment.destination_id) ?? "Unknown destination"}</p><p className="mt-1 text-xs text-ink/60">{profileNames.get(assignment.user_id) ?? `Existing profile ${assignment.user_id.slice(0, 8)}`} · {assignment.access_scope.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-ink/50">Granted {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(assignment.granted_at))}</p></div><RevokeDestinationAccessForm assignmentId={assignment.id} /></li>)}</ul>
          : <p className="mt-4 border-y border-ink/10 py-6 text-sm text-ink/60">No destination assignments exist.</p>}
      </section>
    </>}
  </div></WorkspaceShell>;
}
