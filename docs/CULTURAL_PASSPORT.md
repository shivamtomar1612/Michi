# Cultural Passport (Phase 12)

The passport records participation and reflection, not a score of cultural expertise. Five aggregate metrics are calculated from the signed-in traveler’s MICHI booking, feedback, and itinerary-decision records.

## Reflection

After a host marks a MICHI booking completed, the traveler can submit one reflection from **My bookings**. The form asks what they learned, whether they completed cultural preparation and found it helpful, how confident they feel about the context, how meaningful it felt, and how the host experience was.

The reflection is written to `traveler_reflections`, an owner-only table. Under the existing feedback policy, hosts can read structured feedback scores and the preparation-completed status, but cannot read the reflection text. A database function verifies the authenticated traveler owns a completed booking and writes both the structured feedback and private reflection atomically.

## Metrics

- Experiences completed: completed MICHI bookings.
- Regions explored: distinct destination regions from completed MICHI bookings.
- Local experiences supported: distinct experiences completed with a verified host.
- Cultural preparation completed: completed booking feedback where preparation was self-reported complete.
- Responsible alternatives selected: accepted `michi_alternative` itinerary decisions.

Metrics are queried server-side for the authenticated traveler. No itinerary names, dates, notes, or booking references are included in a shared summary.

## Deterministic achievements

PostgreSQL triggers derive awards from completed bookings, saved reflections, verification records, acknowledgments, accepted alternative decisions, and current verified destination evidence. The existing `(traveler_id, type)` unique constraint plus `ON CONFLICT DO NOTHING` prevents duplicate awards.

- **Responsible Traveler**: completed MICHI booking with recorded host-rule acknowledgment.
- **Local Supporter**: completed experience whose host application is verified.
- **Respectful Explorer**: completed booking, acknowledged host rules, and self-reported completed cultural preparation.
- **Cultural Learner**: completed booking with a saved reflection.
- **Regional Explorer**: completed accepted MICHI alternative in a named region, with a fresh verified crowd-pressure signal of 40/100 or lower at completion. Missing or stale evidence means no award.

## Single demo example

The passport page has one static **Respectful Explorer** example in `features/passport/demo-data.ts`. It is explicitly marked “Demo example,” is excluded from metrics and earned achievements, and is never inserted into Supabase.

The additive migration `20261008165040_cultural_passport_reflection` is applied to the connected MICHI Supabase project. Live verification confirmed the reflection table has RLS and an owner-only read policy, the public reflection RPC is `SECURITY INVOKER`, direct authenticated inserts into the feedback table are revoked, all three award triggers are installed, and no reflection or achievement rows were created by this phase.

## Sharing and privacy

The share control invokes the browser share sheet or copies a short summary. It contains aggregate metrics and earned achievement names only. It excludes names, booking IDs, itinerary details, and written reflections. There is no public profile or public passport URL.
