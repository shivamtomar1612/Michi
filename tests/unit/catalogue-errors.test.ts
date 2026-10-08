import { describe, expect, it } from "vitest";
import { describeCatalogueError } from "@/lib/data-sources/catalogue-errors";

describe("describeCatalogueError", () => {
  it("identifies when Supabase has not had the MICHI catalogue schema applied", () => {
    expect(describeCatalogueError({ code: "PGRST205", message: "Could not find the table 'public.destinations' in the schema cache" }))
      .toEqual({
        reason: "schema_missing",
        message: "The MICHI catalogue tables are missing from this Supabase project. Apply the catalogue migrations and reviewed source snapshot; no sample records are substituted.",
      });
  });

  it("keeps other database errors generic and safe for public display", () => {
    expect(describeCatalogueError({ code: "XX000", message: "sensitive database detail" }))
      .toEqual({ reason: "unavailable", message: "The verified tourism catalogue is temporarily unavailable." });
  });
});
