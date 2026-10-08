import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CulturalKnowledgeAdmin } from "@/components/cultural-knowledge-admin";
import { requireRole } from "@/server/auth/guards";
import { AdminNav } from "@/app/admin/_components/admin-nav";

export const metadata: Metadata = { title: "Knowledge sources · MICHI" };
export default async function KnowledgeSourcesPage() {
  await requireRole(["admin"]);
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-6xl"><Link href="/admin/knowledge" className="text-sm underline">← Cultural knowledge</Link><p className="eyebrow mt-6">Admin · source registry</p><h1 className="mt-3 font-serif text-4xl">Sources and ingestion</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-ink/65">Approve access terms and a domain first. Then approve each page URL and preview its structured text. New chunks stay unpublished until reviewed.</p><AdminNav /><CulturalKnowledgeAdmin view="sources" /></div></WorkspaceShell>;
}
