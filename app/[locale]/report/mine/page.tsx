import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ReportAppealForm } from "@/components/admin/report-appeal-form";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "My content reports · MICHI" };

export default async function MyContentReportsPage() {
  const { user, role } = await requireRole(["traveler", "host", "dmo", "admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("content_reports").select("id,subject_type,subject_id,reason_code,details,status,reviewer_reason,reviewed_at,appeal_message,appeal_requested_at,created_at")
    .eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(50);
  return <WorkspaceShell role={role.toUpperCase()} basePath={`/${role}`}><div className="container-editorial py-10">
    <p className="eyebrow">Your account</p><h1 className="mt-3 font-serif text-4xl">My content reports</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">This list is private to your account. An administrator may review your submission and record a reasoned decision. You may request one reconsideration after a report is resolved or dismissed.</p>
    {error ? <p role="alert" className="mt-6 border-l-2 border-vermilion p-4 text-sm">Your reports could not be loaded.</p>
      : data?.length ? <ol className="mt-7 grid gap-4">{data.map((report) => <li key={report.id} className="border border-ink/15 bg-white p-5">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-serif text-xl">{report.subject_type.replaceAll("_", " ")} · {report.reason_code.replaceAll("_", " ")}</h2><p className="text-xs capitalize text-ink/60">{report.status.replaceAll("_", " ")}</p></div>
        <p className="mt-1 text-xs text-ink/55">Submitted {new Date(report.created_at).toLocaleString()}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{report.details}</p>
        {report.reviewer_reason ? <p className="mt-3 text-sm">Review reason: {report.reviewer_reason.replaceAll("_", " ")}</p> : null}
        {report.appeal_message ? <div className="mt-3 border-l-2 border-moss bg-[#e9ece5] p-3"><p className="text-xs font-semibold">Reconsideration requested</p><p className="mt-2 text-sm">{report.appeal_message}</p></div> : null}
        {(["resolved", "dismissed"].includes(report.status) && !report.appeal_requested_at) ? <ReportAppealForm reportId={report.id} /> : null}
      </li>)}</ol> : <p className="mt-7 border-y border-ink/10 py-8 text-sm text-ink/60">You have not submitted any content reports.</p>}
  </div></WorkspaceShell>;
}
