import { ErrorState } from "@/components/ui/states";
import type { CatalogueFailure } from "@/lib/data-sources/catalogue-errors";

export function CatalogueUnavailable({ failure, returnHref = "/discover" }: { failure: CatalogueFailure; returnHref?: string }) {
  const returnLabel = returnHref === "/experiences"
    ? "Return to Experiences"
    : returnHref === "/destinations" || returnHref.startsWith("/destinations/")
      ? "Return to Destinations"
      : "Return to Discover";

  return <ErrorState
    title={failure.reason === "schema_missing" ? "Catalogue setup is incomplete" : "Verified catalogue could not load"}
    description={failure.message}
    returnHref={returnHref}
    returnLabel={returnLabel}
  />;
}
