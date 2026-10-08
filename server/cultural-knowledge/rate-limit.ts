import "server-only";

const windows = new Map<string, { startedAt: number; count: number }>();

export function allowLocalEvidenceRequest(requesterHash: string, now = Date.now()): boolean {
  const current = windows.get(requesterHash);
  if (!current || now - current.startedAt >= 60_000) {
    windows.set(requesterHash, { startedAt: now, count: 1 });
    if (windows.size > 2000) {
      for (const [key, value] of windows) if (now - value.startedAt >= 60_000) windows.delete(key);
    }
    return true;
  }
  if (current.count >= 30) return false;
  current.count += 1;
  return true;
}
