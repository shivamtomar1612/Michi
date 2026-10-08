export interface OrganizableCandidate {
  id: string;
  score: number;
  reasons: string[];
}

export interface OrganizerSelection {
  candidateId: string;
  reasonIndex: number;
}

export interface OrganizedCandidate extends OrganizableCandidate {
  explanation: string;
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function deterministicPlanOrder(candidates: OrganizableCandidate[]): OrganizedCandidate[] {
  return [...candidates]
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .map((candidate) => ({ ...candidate, explanation: candidate.reasons[0] ?? "Eligible database candidate." }));
}

/** Accept only complete, unique IDs from the already database-verified candidate set. */
export function validateOrganizerOrder(
  candidates: OrganizableCandidate[],
  selections: OrganizerSelection[],
): OrganizedCandidate[] | null {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  if (selections.length !== candidates.length) return null;
  const seen = new Set<string>();
  const output: OrganizedCandidate[] = [];
  for (const selection of selections) {
    const candidate = byId.get(selection.candidateId);
    if (!candidate || seen.has(candidate.id) || !Number.isInteger(selection.reasonIndex)
      || selection.reasonIndex < 0 || selection.reasonIndex >= candidate.reasons.length) return null;
    seen.add(candidate.id);
    output.push({ ...candidate, explanation: candidate.reasons[selection.reasonIndex] });
  }
  return output;
}
