# MICHI Final Product Audit — Phase 17

**Audit date:** 2026-10-09

**Environment:** local production server build at `http://localhost:3000` plus read-only queries to Supabase project `sjfcwmaceduwdhpdccyh`.
**Scope:** route reachability, hosted data truth, demo readiness, selected browser inspection, and repository verification. This is not a complete production certification.

## Data and provenance

The hosted catalog contains 3 published destinations, 15 places, and 3 verified-primary external experiences. The underlying reviewed snapshot date is 2026-10-07, not the audit date. Current hosted counts: profiles 1 (traveler), MICHI experiences 0, slots 0, bookings 0, destination health signals 0, community feedback 0, cultural sources 6, cultural content 5, analytics events 45, host applications 0, passport achievements 0, traveler reflections 0. No production data was changed by the Supabase audit queries.

The three external listings are informational and carry operator URLs: Kanazawa Katani Gold Leaf Pasting Experience; Kutani Kosen Kutani Ware Etsuke; Kutani Kosen Potter’s Wheel. They are not MICHI hosts or partners. No crowd, capacity, community readiness, or destination health score is available. The catalogue has no verified coordinates for markers. External accessibility remains unknown where not stated.

The local passport demo has one illustrative achievement, visibly tagged demo. It is not a hosted record.

## Route and product checks

| Area | Result | Evidence / limitation |
| --- | --- | --- |
| Homepage | Pass | Browser rendered editorial homepage and public navigation. Root `/` redirects to `/en`. |
| Discover | Pass for page load | HTTP 200 and browser accessibility tree show public preferences, source-backed lists, and unknown health/coordinates. Recommendation submission was not run because it consumes rate limit and emits activity events. |
| Destinations | Pass for page load | `/en/destinations` and `/en/destinations/kyoto` returned HTTP 200. |
| Experiences | Pass for page load | Listing and Kanazawa Katani detail returned HTTP 200; browser showed external-only status and operator link. The provenance date interpolation was corrected and the built HTML renders “Last checked Oct 7, 2026.” |
| Guest itinerary page | Pass for page load | `/en/traveler/plan` and `/ja/traveler/plan` returned HTTP 200. Generation, compare, local reordering, and save-after-auth were not executed end to end. |
| Cultural Companion | Partial | UI and evidence panel are present. No live question submitted in this phase because the endpoint records analytics and calls external Gemini; last Gemini report records quota failure. |
| Booking | Not operationally demonstrable | 0 MICHI experiences, slots, and bookings. No fake reservation was created. |
| Traveler passport/reflection | Protected, no demo account | GET redirects to sign-in. Hosted achievements and reflections are empty; one local illustrative item is labeled demo. |
| Host / DMO / admin | Protected | Unauthenticated GETs redirect to sign-in. No demo role accounts; role workflows not exercised. |
| Japanese localization | Partial | Japanese Discover and planner returned HTTP 200. Full locale content and interaction review not performed. |
| Accessibility / responsive | Partial | Browser tree confirms semantic headings, links, and labeled controls on selected desktop pages. No automated WCAG/axe scan or full mobile breakpoint matrix ran. |
| Security / isolation | Blocked for role E2E | Production schema/RLS audited previously; isolated staging roles and concurrent booking tests require a separate environment. No changes to production RLS in this phase. |

## Route smoke test

GET-only local HTTP checks returned 200 for `/en/discover`, `/en/destinations`, `/en/destinations/kyoto`, `/en/experiences`, `/en/experiences/kanazawa-katani-gold-leaf`, `/en/about`, `/en/traveler/plan`, `/en/auth/login`, `/en/auth/signup`, `/ja/discover`, `/ja/traveler/plan`. The root redirected to `/en`. Unauthenticated `/en/traveler/passport`, `/en/host`, `/en/dmo`, and `/en/admin` redirected to localized sign-in. No booking/recommendation/AI mutation endpoint was submitted.

## Issue fixed during audit

`LastVerified` rendered the English `Last checked {date}.` translation without supplying its `date` variable, exposing `{date}` in the browser and appending the date after it. The component now passes the formatted date through the translation interpolation. The production build passed, and a GET-only request to the rebuilt experience page returned HTTP 200 with the corrected rendered label. The literal translation template remains in the page's serialized message catalog, but it is not the rendered label.

## Checks performed

- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `npm test` — PASS, 23 files / 129 tests.
- `npm run build` — PASS when `SWC_NATIVE_BINDING_CACHE` pointed to a writable per-user cache. The first build and first server start without that override failed because this Windows environment could not load/materialize the SWC native binding under its default cache ACL; no application source change was needed for that environment issue.
- Production server — started on port 3000 with the same local cache override. Public and protected route checks returned the expected statuses listed above.
- Browser review — desktop homepage, Discover page, and one external experience detail were inspected. No automated E2E, automated accessibility scan, or mobile viewport matrix ran.
- No recommendation, Companion, booking, reflection, or admin mutation was invoked during the route smoke test. Hosted counts remained at the audited values.

## Known release blockers

1. No isolated demo/staging Supabase environment or authorized traveler/host/DMO/admin demo accounts.
2. No real MICHI host, slots, bookings, or current destination health signals; booking and health demo steps cannot be honestly completed.
3. Latest Gemini verification reported quota exhaustion (HTTP 429) for generated answers. The fallback worked, but live generation is not dependable.
4. No Playwright E2E suite is configured; route checks and browser review are not a full regression suite.
5. WCAG automated scan and complete responsive checks were not run.
6. Source rows are from a dated reviewed snapshot and were not re-verified at each origin during this audit.
7. Supabase Auth leaked-password protection and Maps production key restrictions remain manual production hardening items from prior audits.

## Overall result

**Not ready for an end-to-end operational hackathon demo or production launch.** The public discovery portion is demonstrable with honest limitations. The remaining work requires a funded/approved isolated environment, authorized accounts, real host participation, current health evidence, and live-service validation. See [HACKATHON_DEMO_PLAN.md](HACKATHON_DEMO_PLAN.md) and [DEMO_FALLBACK_PLAN.md](DEMO_FALLBACK_PLAN.md).
