import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CulturalKnowledgeAdmin } from "@/components/cultural-knowledge-admin";
import { requireRole } from "@/server/auth/guards";
import { AdminNav } from "@/app/[locale]/admin/_components/admin-nav";

export const metadata: Metadata = { title: "Knowledge content · MICHI" };
export default async function KnowledgeContentPage() {
  await requireRole(["admin"]);
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-6xl"><Link href="/admin/knowledge" className="text-sm underline">← Cultural knowledge</Link><p className="eyebrow mt-6">Admin · catalog</p><h1 className="mt-3 font-serif text-4xl">Knowledge content</h1><p className="mt-4 text-sm leading-6 text-ink/65">Review provenance, status, freshness and the exact evidence text held for each source record.</p><AdminNav /><CulturalKnowledgeAdmin view="content" /></div></WorkspaceShell>;
}
