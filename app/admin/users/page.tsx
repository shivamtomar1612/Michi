import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AdminNav } from "@/app/admin/_components/admin-nav";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";
import { ADMIN_USER_PAGE_SIZE, normalizeAdminPage } from "@/features/admin/policy";

export const metadata: Metadata = { title: "User directory · MICHI admin" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] ?? "" : input ?? "";

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const roleValue = value(params.role);
  const role = (["traveler", "host", "dmo", "admin"] as const).find((item) => item === roleValue) ?? "";
  const query = value(params.q).trim().slice(0, 80);
  const page = normalizeAdminPage(value(params.page));
  const admin = await createAdminClient();
  let request = admin.from("profiles").select("id,full_name,role,created_at,updated_at", { count: "exact" }).order("created_at", { ascending: false });
  if (role) request = request.eq("role", role);
  if (query) request = request.ilike("full_name", `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
  const { data, count, error } = await request.range((page - 1) * ADMIN_USER_PAGE_SIZE, page * ADMIN_USER_PAGE_SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / ADMIN_USER_PAGE_SIZE));
  const href = (nextPage: number) => { const next = new URLSearchParams(); if (role) next.set("role", role); if (query) next.set("q", query); next.set("page", String(nextPage)); return `/admin/users?${next.toString()}`; };
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-5xl">
    <p className="eyebrow">Platform governance</p><h1 className="mt-3 font-serif text-4xl">User directory</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">This view shows only the profile fields needed for administration. Roles are granted through verified host onboarding or destination-scoped access workflows; this page does not expose credentials or permit arbitrary role edits.</p>
    <AdminNav />
    <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
      <label className="grid gap-1 text-sm">Search name<input name="q" defaultValue={query} maxLength={80} className="min-h-11 border border-ink/20 bg-white px-3" /></label>
      <label className="grid gap-1 text-sm">Role<select name="role" defaultValue={role} className="min-h-11 border border-ink/20 bg-white px-3"><option value="">All roles</option>{["traveler", "host", "dmo", "admin"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="min-h-11 bg-ink px-4 text-sm text-white">Apply filters</button>
    </form>
    {error ? <p role="alert" className="mt-6 border-l-2 border-vermilion p-4 text-sm">The user directory could not be loaded.</p>
      : <><p className="mt-4 text-xs text-ink/55">{count ?? "Unavailable"} matching profiles · page {page} of {pages}</p>
        {data?.length ? <div className="mt-3 overflow-x-auto border-y border-ink/15"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-white text-xs text-ink/60"><tr><th className="p-3">Profile</th><th className="p-3">Role</th><th className="p-3">Created</th><th className="p-3">Last profile update</th></tr></thead><tbody className="divide-y divide-ink/10">{data.map((profile) => <tr key={profile.id}><td className="p-3"><span className="font-medium">{profile.full_name || "Unnamed account"}</span><span className="mt-1 block font-mono text-xs text-ink/50">{profile.id.slice(0, 8)}…</span></td><td className="p-3 capitalize">{profile.role}</td><td className="p-3">{new Date(profile.created_at).toLocaleDateString()}</td><td className="p-3">{new Date(profile.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
          : <p className="mt-5 border-y border-ink/10 py-8 text-sm text-ink/60">No profiles match these filters.</p>}
        <div className="mt-4 flex justify-between"><Link aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-40" : "underline"} href={href(Math.max(1, page - 1))}>Previous page</Link><Link aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-40" : "underline"} href={href(Math.min(pages, page + 1))}>Next page</Link></div>
      </>}
  </div></WorkspaceShell>;
}
