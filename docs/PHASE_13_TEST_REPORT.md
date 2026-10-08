# Phase 13 Verification Report

## Scope

Phase 13 adds destination-scoped DMO reporting, a consent-based community feedback workflow, privacy-preserving analytics events, feedback moderation/withdrawal, and retention controls. No user, host, booking, slot, sentiment, or operational demo records were created.

## Hosted project audit

The connected MICHI project is `sjfcwmaceduwdhpdccyh`. Before and after the Phase 13 changes, its audited data counts were:

| Data | Count after migration |
| --- | ---: |
| Profiles | 1 (traveler) |
| Destinations | 3 |
| Places | 15 |
| Verified external experiences | 3 |
| MICHI host experiences | 0 |
| Experience slots | 0 |
| Bookings | 0 |
| Destination health signals | 0 |
| DMO/community access assignments | 0 |
| Community feedback | 0 |
| Analytics events | 28 |

There is no assigned DMO or community representative, so a real authorized DMO session and populated DMO dashboard could not be exercised against this project. Empty/insufficient-data states are the accurate production behavior. The 28 existing analytics events were preserved; no rows were added for testing.

## Database and privacy checks

- All Phase 13 migrations are recorded in the hosted migration history, including the follow-up assignment foreign-key indexes.
- Row-level security remains enabled. Community reports are author-readable, submitted only by eligible verified hosts or assigned community representatives, consent-gated, moderated before aggregation, and withdrawable by the author.
- DMO results are available only through destination-scoped aggregate RPCs. RPCs apply role and assignment checks, bounded non-overlapping calendar months, and minimum cohort suppression. Reflection output contains only a suppressed or threshold-qualified count; no reflection text or traveler identity is returned.
- The retention schedule is active: daily at 03:27 UTC, deleting community feedback older than 25 months.
- RLS policy inspection confirmed the analytics insert allowlist and bounded metadata checks. No direct DMO read policy exposes individual feedback, traveler records, or event rows.
- The Supabase performance advisor initially found two missing indexes for assignment foreign keys. Both were added and verified in the hosted schema. Remaining advisor messages include unused indexes (expected before data volume/use) and multiple pre-existing permissive policies on other tables.
- The Supabase security advisor still reports pre-existing items outside this phase: private rate-limit/invitation tables with RLS but no client policies, existing security-definer RPCs, and disabled leaked-password protection. Phase 13 RPCs require their intended authenticated role and destination scope; admin grant/revoke RPCs are not executable by `anon` or `authenticated`. These advisor notices remain visible and should be handled in a separate security-hardening task.

## Automated checks

- `npm test -- --run`: PASS — 18 test files, 113 tests.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS — Next.js compiled, typechecked, collected page data, and generated all 45 static pages/routes.
- Browser E2E: NOT CONFIGURED in this repository; no Playwright suite is available to run. The lack of a real DMO account also prevents live role-based DMO workflow verification.

## Remaining validation limits

- No DMO, community representative, verified host, MICHI experience, booking, health signal, or community report exists in the hosted project. Their populated production metrics cannot be verified without genuine onboarding and activity.
- Supabase Auth leaked-password protection is disabled in project settings. Enable it before opening public production signup.
- The connected project’s existing security-definer functions and RLS policies outside Phase 13 need a separate review; this implementation did not widen their permissions.
