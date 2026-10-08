import type { CulturalSourceType, VerificationStatus } from "./types";

const sourceTypes: readonly CulturalSourceType[] = ["government", "national_tourism_board", "prefecture", "municipality", "dmo", "cultural_institution", "temple_shrine", "museum", "host", "editorial"];

export function canPublishCulturalVerification(sourceType: CulturalSourceType, authorityLevel: number, status: VerificationStatus): boolean {
  if (!sourceTypes.includes(sourceType)) return false;
  if (status === "community_verified") return sourceType === "host";
  if (status !== "official_verified" || sourceType === "host" || sourceType === "editorial") return false;
  return authorityLevel >= 3;
}
