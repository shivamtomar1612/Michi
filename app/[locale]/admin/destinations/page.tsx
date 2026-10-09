import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { DestinationEditor } from "@/components/admin/destination-editor";
import { AdminNav } from "@/app/[locale]/admin/_components/admin-nav";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Destination governance · MICHI admin" };

export default async function AdminDestinationsPage() {
  await requireRole(["admin"]);
  const admin = await createAdminClient();
  const { data, error } = await admin.from("destinations")
    .select("id,name,description,cultural_summary,status,prefecture,verification_status,source_url,last_verified_at")
    .order("name").limit(100);
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-5xl">
    <p className="eyebrow">Content governance</p><h1 className="mt-3 font-serif text-4xl">Destinations</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">Edit destination descriptions and publication state while preserving source attribution. Health scores and crowd pressure are evidence-derived and cannot be changed from this editor.</p>
    <AdminNav />
    {error ? <p role="alert" className="mt-6 border-l-2 border-vermilion p-4 text-sm">Destination records are unavailable.</p>
      : data?.length ? <div className="mt-6 grid gap-5">{data.map((destination) => <DestinationEditor key={destination.id} destination={destination} />)}</div>
        : <p className="mt-6 border-y border-ink/10 py-8 text-sm text-ink/60">No destinations are available to manage.</p>}
  </div></WorkspaceShell>;
}
