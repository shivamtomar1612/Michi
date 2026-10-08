import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/server/auth/guards";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["host"]);
  return <WorkspaceShell role="Host" basePath="/host">{children}</WorkspaceShell>;
}
