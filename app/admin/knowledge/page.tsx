import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CulturalKnowledgeAdmin } from "@/components/cultural-knowledge-admin";
import { requireRole } from "@/server/auth/guards";
import { AdminNav } from "@/app/admin/_components/admin-nav";

export const metadata: Metadata = { title: "Cultural knowledge · MICHI" };
export default async function KnowledgePage() {
  await requireRole(["admin"]);
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-6xl"><p className="eyebrow">Admin · evidence operations</p><h1 className="mt-3 font-serif text-4xl">Cultural knowledge</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-ink/65">Source-backed information stays separate from generated explanations. Only reviewed evidence appears in public retrieval.</p><AdminNav /><CulturalKnowledgeAdmin view="overview" /></div></WorkspaceShell>;
}
