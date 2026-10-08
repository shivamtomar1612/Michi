# Phase 9 — Responsible Itinerary Builder

## Architecture

`/traveler/plan` is an authenticated traveler route with an eight-step preference flow. It calls the existing deterministic recommendation service first. That service applies eligibility constraints and scores MICHI host listings; verified external listings remain a separate discovery pathway with interest compatibility only. The generator filters refreshed database results against the traveler's own recommendation log before returning candidates.

Gemini is an optional organizer. The server sends it only candidate IDs, titles, destination names, the travel style, interest tags, deterministic scores, and indexes of deterministic reasons. Its response must include every candidate exactly once and select an existing reason index. Invalid output, unavailable credentials, and API failure fall back to deterministic ordering. The model cannot create activities, explanations, or evidence.

Saving rechecks the recommendation log, current listings, destination provenance, and selected MICHI slots. The itinerary records date-specific host availability as a timestamped snapshot; it does not create a booking or reserve capacity. External listings have no generated slot, and unknown prices remain marked unknown. Route distance/time is stored as unavailable until a supported route estimate is integrated.

## Persistence and privacy

Migration `20261008132037_phase9_responsible_itineraries.sql` adds item provenance and status snapshots, an owner-scoped `itinerary_decisions` table, an atomic owner-checked reorder RPC, and a revocable share token. `20261008132449_phase9_itinerary_data_quality.sql` indexes decision foreign keys and includes explicit unknown-cost and snapshot details in the shared view. Both migrations were applied to the connected MICHI Supabase project `sjfcwmaceduwdhpdccyh` on 2026-10-08. Existing owner-only itinerary policies are retained. The public share RPC returns a fixed allowlist of itinerary and item fields and never returns traveler identity or booking notes. Turning sharing off clears the token; each new link replaces the old token.

## User features

- Generate plans from dates, starting destination, interests, budget, travel pace, accessibility and dietary needs, and crowd preference.
- Review separately labeled `Original Preference` and `MICHI Alternative` candidates, then accept, keep, or compare choices. These decisions are recorded against the traveler's recommendation log.
- Save a private itinerary, edit its name/dates/budget, reorder or remove stops, duplicate it, or create/revoke a read-only share link.
- Open saved itinerary item snapshots with their source, data status, cost status, availability check time, Destination Health status, and transport limitation.

## Data constraints

- External listings remain information-only/external and show their official link. MICHI never creates their availability.
- MICHI slots are rechecked when saving but can still fill after the snapshot; a separate booking flow is required to reserve them.
- Missing Destination Health and route data remain unavailable; no synthetic score or travel time is produced.
- A traveler must be signed in with the `traveler` role. The Supabase migration is applied, but useful matches still depend on the current verified inventory and host slots in the project.

## Verification

Unit tests cover deterministic organizer ordering, rejecting invented/duplicate/missing IDs and invalid reason indexes, request validation, duplicate selections, and stable matching of recommendation context. The checks below were run for this phase.

Validation on 2026-10-08:

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm test` — passed, 13 files and 93 tests.
- `npm run build` — passed; itinerary generation, management, and public share routes are included.
- Production route smoke check — login returned 200; unauthenticated `/traveler/plan` redirected to login (307); an unknown public share token returned 404.
- Hosted Supabase counts after migration: 3 destinations, 0 MICHI experiences, 3 external experiences, 0 experience slots, 0 destination health signals, 0 itineraries, 0 itinerary items, and 0 itinerary decisions.

The local smoke check had no authenticated traveler session, so it did not submit a real saved plan. The hosted project currently has no MICHI host experiences or slots and no health signals. The external pathway can return only matching verified records among its three listings; it does not promise a match for every preference. A real traveler login plus genuine inventory is required to verify the complete interactive journey against live user data.
