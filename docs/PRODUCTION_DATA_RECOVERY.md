# MICHI production data recovery — 2026-10-08

## Status

**The hosted data/schema recovery is applied, but product launch acceptance is not complete.** The confirmed project is Michi (`sjfcwmaceduwdhpdccyh`, `ap-southeast-2`). A protected host onboarding and transactional booking migration was applied. The one existing Auth user now has a traveler profile. No host, experience slot, booking, community report, or destination-health signal was fabricated.

The requested 15–30 external listing target was not met: the hosted catalogue contains 3 external listings. Full health evidence and real MICHI host inventory remain absent. Details and table-level audit are in `docs/PRODUCTION_DATA_AUDIT.md`.

## Supabase audit and counts

| Measure | Initial total | Final total |
| --- | ---: | ---: |
| Auth users / profiles | 1 / 0 | 1 / 1 |
| Destinations | 3 | 3 |
| Places | 15 | 15 |
| Verified external experiences | 3 | 3 |
| MICHI experiences / slots / bookings | 0 / 0 / 0 | 0 / 0 / 0 |
| Destination health signals | 0 | 0 |
| Cultural sources / content | 5 / 5 | 5 / 5 |
| Community feedback | 0 | 0 |
| Analytics events / recommendation logs | 0 / 0 | 0 / 0 |
| Host applications / invitations | Not present | 0 / 0 |
| Recommendation feedback | 0 | 0 |

The 3 external listings are Kanazawa Katani gold-leaf pasting, Kutani Kosen pottery painting, and Kutani Kosen potter's wheel. They remain external-information links; they do not have MICHI capacity or booking slots. No new experiences were ingested in this run: fetched 0, imported 0, updated 0, rejected 0. Candidate pages reviewed for discovery were VISIT KANAZAWA activities and Kyoto Travel experiences, but source terms/robots/licensing and record-specific fields were not fully reviewed, so they were not imported.

The one existing profile is a traveler. No admin, DMO, or host account exists, so an owner-controlled initial admin must be securely provisioned before operator review and invitations can be performed. The source validator passed 14 approved domains and 49 HTTPS URL allowlist checks; this does not certify current access, terms, or licensing.

## Implemented locally

- External discovery is separate from MICHI host inventory. It ranks by verified title/category/description interest overlap, displays provenance and limitations, and leaves availability and health unknown. It will not show a false availability or low-pressure claim.
- MICHI recommendations require an open, future, genuinely capacity-bearing slot. Unknown requested accessibility is ineligible when confirmed accessibility is required. Missing health evidence omits that scoring component, reweights known components, and marks confidence partial; no made-up neutral values are used.
- Destination Health retains available component evidence, identifies missing components, and emits no complete score while evidence is incomplete. A forecast is not labeled live.
- Traveler host applications collect operator identity, authorization evidence, experience/rules/accessibility, availability/capacity plan, and cancellation terms. Applicant data cannot grant host access. The admin review path requires an explicit ownership verification attestation. External listing association is optional and still requires admin review.
- Verified hosts can draft listings, manage genuine dated slots, pause recommendations, and receive booking requests. Public listing approval is a separate admin action.
- Booking requests call a database RPC that locks the slot, validates the host/listing/slot and acknowledged rules, checks remaining capacity, prevents duplicate active traveler-slot requests, and reserves capacity atomically. Hosts can confirm requests. External listings never use these booking functions.
- Admin operational metrics are database-backed and unavailable rather than fabricated if a source query fails. Invitations are implemented, but email sending requires a server service-role key, app URL, and configured Supabase SMTP.

## Migration applied

`supabase/migrations/20261008104333_production_host_onboarding.sql` was applied through the connected Supabase plugin and recorded remotely as migration `20261008104333 production_host_onboarding`. `supabase/migrations/20261008104914_host_booking_decline.sql` was applied as `20261008104914 host_booking_decline`.

The migrations add host application and invitation tables, admin review RPC, safe profile backfill for existing Auth IDs, traveler-default signup handler, verified-host gating for public listings and slots, external listing association, provenance and freshness fields/statuses for health signals, capacity-safe booking request/confirm/decline RPCs, active-booking uniqueness, and missing foreign-key indexes. Declining a pending host request releases its reserved capacity transactionally; confirmed cancellation remains manual. Existing records were preserved and no tables were truncated. The existing enabled Auth trigger was confirmed before applying; managed `auth.users` was not altered.

Every inspected public table has RLS enabled. The migration revokes anon/authenticated execution on the public event-trigger helper while leaving the automatic database event trigger intact. DMO metrics are aggregated and internally role-checked. The generated local `types/database.ts` now comes from the hosted schema after migration.

## Destination Health and evidence

There are zero hosted health signals, so no complete score is available for any destination. The five missing components are crowd pressure, remaining capacity, community readiness, transport accessibility, and seasonal suitability. The Kyoto congestion forecast and Kanazawa comfort resources remain links only; no supported API integration was established. No source data was used to imply real-time occupancy.

## Verification

- Supabase plugin project identity, migration history, table schema, row totals, relationships, indexes, RLS-enabled state, Auth/profile parity, source counts, freshness, and security/performance advisor findings were inspected.
- Both migrations applied successfully; post-migration checks confirmed 1 Auth user, 1 profile, 0 missing profiles, and the new tables/RPCs. The enabled signup trigger was verified after the change.
- The latest Supabase advisor reports no remaining unindexed foreign keys. It still reports unused indexes on mostly empty tables and multiple permissive SELECT policies used for separate access paths. Security findings are: the service-role-only invitations table intentionally has no client policy; authenticated RPCs are flagged as SECURITY DEFINER but check role/ownership internally; leaked-password protection remains disabled and needs an Auth setting change.
- TypeScript database types were regenerated from hosted schema.
- Local lint, typecheck, 55 unit tests, and production build results are recorded in the completion response.
- The local CLI is not linked/authenticated in this workspace, so `npm run data:verify` returned `ProjectRefNotLinkedError`. The remote catalogue was queried through the Supabase plugin instead.
- No signed-in end-to-end flow or real booking concurrency test ran because there is no MICHI host, slot, or booking inventory and no test identities were created.

## Remaining blockers and manual actions

1. **No participating operators exist yet.** Invite a real operator, collect authorization evidence, review it as an admin, and approve the operator before creating MICHI inventory.
   The only existing account is a traveler. Securely provision the first admin through an owner-controlled Supabase setup step; do not promote an account based on untrusted signup metadata. Operator email delivery also needs server-side service credentials, public app URL, and configured SMTP.
2. **No active MICHI slot or capacity exists.** Hosts must supply genuine dates and capacity. Booking cannot work until a listing is verified, published, and has an open future slot.
3. **Cancellation workflow is incomplete.** Cancellation rules are currently free text; there is no automated cancellation/refund/capacity-release workflow. Keep confirmed booking cancellation operationally manual until a policy-aware flow is implemented.
4. **Destination Health has no evidence.** Find supported official data/operator/community feeds with provenance, scopes, freshness, and permission before publishing complete scores.
5. **External discovery quantity remains 3, not the requested 15–30.** Additional official/operator source terms, robots, licensing, record details, and duplicate checks must be verified before import.
6. **Operational gaps remain:** browser E2E/session tests, host booking RPC scenario/concurrency tests, invitation email delivery, host suspension workflow testing, source-ingestion failure monitoring, and external recommendation feedback UI. `host_invitations` intentionally has no authenticated-user RLS policy; it is accessible only through the server service role.
7. Supabase Auth's leaked-password protection is disabled according to the security advisor; enable it in Supabase Auth settings. Confirm Vercel uses the audited project and test its redirect/SMTP configuration.

No credentials or keys are copied into source or this report. The initial failed migration attempt was rolled back; the successful version avoids modifying the managed Auth table.
