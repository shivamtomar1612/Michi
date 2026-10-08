# MICHI data provenance

Every public tourism record must carry its source identity, exact source URL, source type and authority, retrieval and verification timestamps, verification status, and data status. Canonical URLs are used only for duplicate identity; the original URL remains the user-facing provenance link.

| Status | Meaning | MICHI display/use |
| --- | --- | --- |
| `verified_official` | Checked against a directly responsible government, municipality, venue, or official cultural institution | May be published when all required provenance fields are present and current |
| `verified_primary` | Checked against the actual operator providing the listed experience | May appear as an external listing; it does not imply MICHI booking or partnership |
| `official_tourism` | Checked against an official tourism board or recognized official DMO | May be published with its source and verification date |
| `host_provided` | Entered by a MICHI host | Must be identified as host-provided; not used for official cultural claims |
| `community_provided` | Submitted by an authorized community source | Must be identified as community-provided and reviewed for scope |
| `unverified` | Source or claim has not passed its required review | Excluded from verified public catalog queries |
| `unknown` | Reliable information is not present | Show that the information has not been verified; do not infer a value |
| `stale` | The next verification date has passed or the source changed materially | Mark stale and direct the traveler to the official source |
| `simulated_demo` | Synthetic data used only in an explicitly authorized demonstration | No records or signals with this status are created, seeded, or displayed in the current MICHI application |

## Source priority

Use the source with authority over the specific field: a venue for today's venue rules; the municipal authority for city notices; a tourism organization for its visitor guidance; a primary operator for its own experience terms; and the Agency for Cultural Affairs for national cultural-property designation. General guidance does not replace a specific venue or host rule.

## Unknown means unknown

Coordinates, opening hours, admission, accessibility, dietary suitability, photography rules, prices, dates, availability, and crowd conditions remain null or unknown unless an applicable source explicitly supports them. Do not infer them from photos, unrelated listings, general customs, or AI output. A successful database import does not refresh `last_verified_at`; only a new source review does.

## External experience boundary

An external operator listing is sourced information, not a MICHI host relationship. It has `listing_source = external_official_listing`, `booking_mode = external` or `information_only`, and `michi_booking_enabled = false`. Only a separately onboarded MICHI host with actual MICHI-managed slots can be booked through MICHI.
