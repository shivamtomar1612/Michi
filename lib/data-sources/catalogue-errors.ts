export type CatalogueFailure = {
  reason: "schema_missing" | "unavailable";
  message: string;
};

type DatabaseErrorSummary = { code?: string; message?: string };

const unavailableMessage = "The verified tourism catalogue is temporarily unavailable.";

export function describeCatalogueError(error: DatabaseErrorSummary): CatalogueFailure {
  if (error.code === "PGRST205" || error.code === "42P01") {
    return {
      reason: "schema_missing",
      message: "The MICHI catalogue tables are missing from this Supabase project. Apply the catalogue migrations and reviewed source snapshot; no sample records are substituted.",
    };
  }

  return { reason: "unavailable", message: unavailableMessage };
}
