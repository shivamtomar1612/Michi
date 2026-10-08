import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentReportForm } from "@/components/admin/content-report-form";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Report content · MICHI" };
const subjects = ["destination", "place", "external_experience", "experience", "cultural_content"] as const;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] ?? "" : input ?? "";

export default async function NewContentReportPage({ searchParams }: { searchParams: SearchParams }) {
  const { role } = await requireRole(["traveler", "host", "dmo", "admin"]);
  const params = await searchParams;
  const subjectType = value(params.subjectType);
  const subjectId = value(params.subjectId);
  if (!subjects.includes(subjectType as typeof subjects[number]) || !/^[0-9a-f-]{36}$/i.test(subjectId)) notFound();
  return <WorkspaceShell role={role.toUpperCase()} basePath={`/${role}`}><div className="container-editorial py-10">
    <Link href="/discover" className="text-sm underline">← Continue exploring</Link><p className="eyebrow mt-6">Content quality</p>
    <h1 className="mt-3 font-serif text-4xl">Tell MICHI what needs a second look.</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">Reports are private to the reporting account and authorized moderators. The team records a reason and review status; submitted material is not automatically deleted.</p>
    <ContentReportForm subjectType={subjectType} subjectId={subjectId} />
    <p className="mt-6 text-sm"><Link className="underline" href="/report/mine">View my reports and request reconsideration</Link></p>
  </div></WorkspaceShell>;
}
