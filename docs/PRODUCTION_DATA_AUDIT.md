# MICHI production data audit — 2026-10-08

## Project and method

The Supabase plugin identified exactly one matching project: **Michi**, reference `sjfcwmaceduwdhpdccyh`, region `ap-southeast-2`, active/healthy. This matches the hostname configured by the local app. The Vercel deployment environment was not inspected, so its project cannot be confirmed from this audit.

The hosted schema was inspected through the connected Supabase plugin after the original connector's OAuth refresh failed. Table counts and RLS status below are database totals from the plugin, not anonymous-client estimates. Catalog, Auth, policies, and indexes were queried read-only before applying the recovery migration. The applied migration is listed separately.

## Hosted counts and truth status

| Table | Initial total | Final total | Evidence/freshness | Recommendation blocker |
| --- | ---: | ---: | --- | --- |
| `profiles` | 0 | 1 | One corresponding Auth account; missing profile repaired with default traveler role | No host or DMO account |
| `destinations` | 3 | 3 | All 3 `verified_official / official_tourism`; last verified 2026-10-07 | No current health evidence |
| `places` | 15 | 15 | All 15 `verified_official / official_tourism`; last verified 2026-10-07 | Field-level completeness varies |
| `external_experiences` | 3 | 3 | All 3 `verified_primary`; last verified 2026-10-07; next review 2026-10-14 | External only; availability not integrated |
| `experiences` | 0 | 0 | No MICHI host listings | No MICHI-bookable recommendations |
| `experience_slots` | 0 | 0 | No dated capacity | No MICHI bookings possible |
| `bookings` | 0 | 0 | No booking records | None |
| `destination_health_signals` | 0 | 0 | No signals; complete score unavailable | All five components missing |
| `cultural_sources` / `cultural_content` | 5 / 5 | 5 / 5 | Five publicly verified source/content records | Not a substitute for health or operator capacity |
| `community_feedback` | 0 | 0 | No community reports | No sentiment evidence |
| `analytics_events` / `recommendation_logs` | 0 / 0 | 0 / 0 | No event or recommendation records | No operational coverage yet |
| `host_applications` / `host_invitations` | 0 / 0 | 0 / 0 | Added by the recovery migration | No operators onboarded |
| `recommendation_feedback` | 0 | 0 | Existing table | No decisions recorded |
| `itineraries` / `itinerary_items` | 0 / 0 | 0 / 0 | RLS enabled | No traveler itinerary records |
| `traveler_feedback` / `passport_achievements` / `notifications` | 0 / 0 / 0 | 0 / 0 / 0 | RLS enabled | No corresponding activity |

Auth/profile reconciliation before the migration: 1 Auth user, 0 profiles, 1 missing profile, 0 orphan profiles. After: 1 Auth user, 1 profile, 0 missing profiles. The existing signup trigger `on_auth_user_created` was present and enabled; its handler now inserts the profile with the default traveler role. No identity details are included in this report.

The sole current profile has the `traveler` role. There are no admin, DMO, or host profiles, so the host-review queue exists but no one can administer it until an owner-controlled admin is provisioned through a trusted setup path.

## Relationships, indexes, and policies

Live table introspection confirmed the expected foreign-key relationships: profiles to Auth users; destinations to source registry; places and experiences to destinations; experiences to host profiles; slots to experiences; bookings to traveler, experience, and the composite slot/experience pair; and cultural, feedback, analytics, itinerary, passport, notification, and recommendation rows to their owners and related records.

RLS was enabled on every inspected public table, including profiles, destinations, places, external experiences, host inventory, bookings, signals, cultural content, and private traveler tables. The original policies restrict profile reads to self; public discovery to published/verified records; booking reads to the traveler or relevant host; and recommendation logs to their owner. The recovery migration added applicant/admin policies and server-protected review/booking RPCs. DMO metrics use an aggregate security-definer function that checks the caller's DMO role and suppresses destinations with fewer than five completed/confirmed bookings.

Existing primary, unique, lookup, owner, status, and search indexes were inspected. The recovery migration added missing foreign-key coverage for analytics users, booking slot/experience, feedback authors, external listing places, and itinerary-item destination/experience references. The migration also added a partial unique index preventing duplicate active bookings by one traveler for the same slot.

## Source and freshness findings

The source registry contains 14 entries. It is an allowlist, not permission to crawl. The three external listings are Kanazawa Katani gold-leaf pasting and two Kutani Kosen ceramics activities. Their source URLs are operator pages and their listing mode is external; this does not imply a MICHI partnership or confirm current booking capacity. No new listing was fetched or imported during this recovery.

The local source validator passed for 14 approved domains and 49 HTTPS URLs against the checked-in reviewed seed. This validates allowlist format and link host membership only; it does not establish current source availability, legal permission, or licensing.

No current signal exists for crowd pressure, remaining capacity, community readiness, transport accessibility, or seasonal suitability. Therefore MICHI must not display a verified Destination Health score. The migration added explicit statuses for official observations/forecasts, operator/community reports, modeled estimates, demo, and unavailable values, with retrieval timestamps and metadata. Existing signal rows, if any, are conservatively marked unavailable; hosted count was zero.

The reviewed snapshot contains official records dated 2026-10-07. Terms, robots rules, licensing, and operator-specific field provenance were not re-reviewed for every source in this recovery. No new source was treated as authorized for scraping.

## Security and remaining warnings

The Supabase security advisor initially reported that `public.rls_auto_enable()` was executable by anon/authenticated roles; the recovery migration revoked those API grants while leaving the database event trigger intact. Remaining security notices are understood: `host_invitations` has no client policies and is service-role only; authenticated-executable security-definer RPCs each enforce role/ownership inside their function; leaked-password protection is disabled and must be enabled in project Auth settings. The invitation table's no-policy finding is intentional.

The performance advisor initially identified six missing foreign-key indexes; these were added by the recovery migration, and the latest advisor run reports no unindexed foreign keys. It reports unused indexes while the tables are empty, and multiple permissive read policies where separate owner/host/public access paths are required. Do not remove indexes or combine policies without workload data and policy-equivalence checks.

## Deployment and verification scope

The local application uses this project ref, but Vercel variables and production URL redirects were not inspected. Public routes and anonymous inventory were locally inspected; authenticated signup/login, email delivery, role-specific pages, host review, slot management, and booking concurrency require an end-to-end session test with real test accounts. No demo accounts, hosts, slots, capacity, community sentiment, or health signals were created.

The migrations ran through the Supabase plugin and are recorded as `20261008104333 production_host_onboarding` and `20261008104914 host_booking_decline`. Generated TypeScript types were refreshed from the resulting hosted schema. The local CLI remains unlinked, so `npm run data:verify` cannot run from this checkout; the hosted catalog itself was queried directly through the plugin.
