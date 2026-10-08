import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AdminNav } from "@/app/admin/_components/admin-nav";
import { ReviewReportForm } from "@/components/admin/review-report-form";
import { createAdminClient } from "@/server/supabase/admin";
import { requireRole } from "@/server/auth/guards";
import { ADMIN_USER_PAGE_SIZE, normalizeAdminPage } from "@/features/admin/policy";

export const metadata: Metadata = { title: "Content reports · MICHI admin" };
const states = ["pending", "under_review", "resolved", "dismissed"] as const;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] ?? "" : input ?? "";

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const requestedState = value(params.status);
  const state = states.find((item) => item === requestedState) ?? "pending";
  const page = normalizeAdminPage(value(params.page));
  const admin = await createAdminClient();
  const { data: reports, count, error } = await admin.from("content_reports").select("id,reporter_id,subject_type,subject_id,reason_code,details,status,reviewer_id,reviewer_reason,reviewer_note,reviewed_at,appeal_message,appeal_requested_at,created_at", { count: "exact" })
    .eq("status", state).order("appeal_requested_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: true }).range((page - 1) * ADMIN_USER_PAGE_SIZE, page * ADMIN_USER_PAGE_SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / ADMIN_USER_PAGE_SIZE));
  const targetLabel = new Map<string, string>();
  const grouped = new Map<string, string[]>();
  for (const report of reports ?? []) grouped.set(report.subject_type, [...(grouped.get(report.subject_type) ?? []), report.subject_id]);
  for (const [type, ids] of grouped) {
    if (type === "destination") {
      const { data } = await admin.from("destinations").select("id,name").in("id", ids);
      for (const row of data ?? []) targetLabel.set(`${type}:${row.id}`, row.name);
    } else if (type === "place") {
      const { data } = await admin.from("places").select("id,name").in("id", ids);
      for (const row of data ?? []) targetLabel.set(`${type}:${row.id}`, row.name);
    } else if (type === "external_experience") {
      const { data } = await admin.from("external_experiences").select("id,title,operator_name").in("id", ids);
      for (const row of data ?? []) targetLabel.set(`${type}:${row.id}`, `${row.title} · ${row.operator_name}`);
    } else if (type === "experience") {
      const { data } = await admin.from("experiences").select("id,title").in("id", ids);
      for (const row of data ?? []) targetLabel.set(`${type}:${row.id}`, row.title);
    } else {
      const { data } = await admin.from("cultural_content").select("id,title").in("id", ids);
      for (const row of data ?? []) targetLabel.set(`${type}:${row.id}`, row.title);
    }
  }
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-5xl">
    <p className="eyebrow">Trust and safety</p><h1 className="mt-3 font-serif text-4xl">Reported content</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">Reports and internal review notes are restricted to admins and the submitting account. Decisions are retained in governance audit history; they do not silently erase the underlying evidence.</p>
    <AdminNav />
    <nav aria-label="Report status" className="mt-5 flex flex-wrap gap-3">{states.map((item) => <a key={item} aria-current={state === item ? "page" : undefined} className="border border-ink/20 px-3 py-2 text-sm capitalize underline underline-offset-4" href={`/admin/reports?status=${item}`}>{item.replaceAll("_", " ")}</a>)}</nav>
    {error ? <p role="alert" className="mt-6 border-l-2 border-vermilion p-4 text-sm">The report queue could not be loaded.</p>
      : reports?.length ? <><p className="mt-4 text-xs text-ink/55">{count ?? "Unavailable"} reports · page {page} of {pages}</p><div className="mt-5 grid gap-4">{reports.map((report) => <article key={report.id} className="border border-ink/15 bg-white p-5">
        <div className="flex flex-wrap justify-between gap-3"><h2 className="font-serif text-xl">{targetLabel.get(`${report.subject_type}:${report.subject_id}`) ?? "Removed or unavailable item"}</h2><span className="text-xs capitalize text-ink/60">{report.status.replaceAll("_", " ")}</span></div>
        <p className="mt-1 text-xs text-ink/60">{report.subject_type.replaceAll("_", " ")} · {report.reason_code.replaceAll("_", " ")} · submitted {new Date(report.created_at).toLocaleString()} · reporter {report.reporter_id.slice(0, 8)}…</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{report.details}</p>
        {report.appeal_message ? <div className="mt-4 border-l-2 border-vermilion bg-[#fbf1ed] p-3"><p className="text-xs font-semibold">Reconsideration requested · {report.appeal_requested_at ? new Date(report.appeal_requested_at).toLocaleString() : ""}</p><p className="mt-2 whitespace-pre-wrap text-sm">{report.appeal_message}</p></div> : null}
        {report.reviewer_note ? <p className="mt-3 text-xs text-ink/60">Private reviewer note: {report.reviewer_note}</p> : null}
        {state === "pending" || state === "under_review" ? <ReviewReportForm reportId={report.id} status={report.status} /> : <p className="mt-3 text-xs text-ink/55">Reviewed {report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : ""} · reason {report.reviewer_reason ?? "unrecorded"}</p>}
      </article>)}</div><div className="mt-4 flex justify-between"><a className={page <= 1 ? "pointer-events-none opacity-40" : "underline"} href={`/admin/reports?${new URLSearchParams({ status: state, page: String(Math.max(1, page - 1)) })}`}>Previous</a><a className={page >= pages ? "pointer-events-none opacity-40" : "underline"} href={`/admin/reports?${new URLSearchParams({ status: state, page: String(Math.min(pages, page + 1)) })}`}>Next</a></div></> : <p className="mt-6 border-y border-ink/10 py-8 text-sm text-ink/60">No reports match this queue.</p>}
  </div></WorkspaceShell>;
}
