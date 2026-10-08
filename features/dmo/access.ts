export type DestinationAssignment = {
  destinationId: string;
  accessScope: "dmo_analytics" | "community_representative";
  revokedAt: string | null;
};

export function hasDmoDestinationAccess(
  role: string,
  assignments: DestinationAssignment[],
  destinationId: string,
): boolean {
  return role === "dmo" && assignments.some((assignment) =>
    assignment.destinationId === destinationId
      && assignment.accessScope === "dmo_analytics"
      && assignment.revokedAt === null,
  );
}
