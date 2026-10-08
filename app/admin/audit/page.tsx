import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AdminNav } from "@/app/admin/_components/admin-nav";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";
import { ADMIN_PAGE_SIZE, normalizeAdminPage } from "@/features/admin/policy";

export const metadata: Metadata = { title: "Governance audit · MICHI admin" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] ?? "" : input ?? "";

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const page = normalizeAdminPage(value(params.page));
  const targetType = value(params.target).trim().slice(0, 40);
  const admin = await createAdminClient();
  let query = admin.from("admin_audit_log").select("id,actor_id,action,target_type,target_id,outcome,metadata,created_at", { count: "exact" }).order("created_at", { ascending: false });
  if (targetType) query = query.eq("target_type", targetType);
  const { data, count, error } = await query.range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE));
  const paramsForPage = (n: number) => { const next = new URLSearchParams(); if (targetType) next.set("target", targetType); next.set("page", String(n)); return next.toString(); };
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-5xl">
    <p className="eyebrow">Platform governance</p><h1 className="mt-3 font-serif text-4xl">Audit history</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">Privileged changes are retained as append-only records. Metadata excludes report text, contact details, credentials, and private notes.</p>
    <AdminNav />
    <form method="get" className="mt-5 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">Target type<input name="target" maxLength={40} defaultValue={targetType} className="min-h-11 border border-ink/20 bg-white px-3" /></label><button className="min-h-11 bg-ink px-4 text-sm text-white">Filter</button></form>
    {error ? <p role="alert" className="mt-6 border-l-2 border-vermilion p-4 text-sm">Audit history is unavailable.</p>
      : data?.length ? <><p className="mt-4 text-xs text-ink/55">{count ?? "Unavailable"} matching records · page {page} of {pages}</p><ol className="mt-3 divide-y divide-ink/10 border-y border-ink/10">{data.map((event) => <li key={event.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{event.action.replaceAll(".", " · ")}</p><p className="mt-1 text-xs text-ink/60">{event.target_type}{event.target_id ? ` · ${event.target_id.slice(0, 12)}` : ""} · actor {event.actor_id?.slice(0, 8) ?? "system"} · {event.outcome}</p><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-ink/60">{JSON.stringify(event.metadata, null, 2)}</pre></div><time className="text-xs text-ink/50">{new Date(event.created_at).toLocaleString()}</time></li>)}</ol><div className="mt-4 flex justify-between"><a className={page <= 1 ? "pointer-events-none opacity-40" : "underline"} href={`/admin/audit?${paramsForPage(Math.max(1, page - 1))}`}>Previous</a><a className={page >= pages ? "pointer-events-none opacity-40" : "underline"} href={`/admin/audit?${paramsForPage(Math.min(pages, page + 1))}`}>Next</a></div></>
        : <p className="mt-6 border-y border-ink/10 py-8 text-sm text-ink/60">No governance actions have been logged yet.</p>}
  </div></WorkspaceShell>;
}
