import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CulturalKnowledgeAdmin } from "@/components/cultural-knowledge-admin";
import { requireRole } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Knowledge review · MICHI" };
export default async function KnowledgeReviewPage() {
  await requireRole(["admin"]);
  return <WorkspaceShell role="Admin" basePath="/admin"><div className="mx-auto max-w-6xl"><Link href="/admin/knowledge" className="text-sm underline">← Cultural knowledge</Link><p className="eyebrow mt-6">Admin · review queue</p><h1 className="mt-3 font-serif text-4xl">Review cultural evidence</h1><p className="mt-4 text-sm leading-6 text-ink/65">Compare the source text and provenance before publishing. Equal-authority conflicts remain visible for human review.</p><CulturalKnowledgeAdmin view="review" /></div></WorkspaceShell>;
}
