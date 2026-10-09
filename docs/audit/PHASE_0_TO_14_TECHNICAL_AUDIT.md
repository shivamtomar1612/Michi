# MICHI Phase 0–14 Technical Audi

Audit date: 2026-10-09
Baseline: `dee896a0ea64ebcfe0b0012ba574e611d06f8caa`
Audit branch: `audit/phase-0-to-14-verification`
PDF compliance review: **Excluded by user direction.** This report does not claim compliance with the unavailable original six-page PDF.

## Executive resul

**Phase 14.5 readiness: NO-GO for production-quality/full integrated demo; conditional GO for a design-only review after the documented service and test gaps are accepted.** The core public site and catalog respond locally, and the deterministic algorithms plus unit test suite pass. The hosted project has no MICHI host inventory, slots, bookings, community feedback, or health signals, so key operational claims/workflows cannot be demonstrated with real data. Cultural Companion generation is blocked by missing server-side Supabase service credential and Gemini quota exhaustion. No full authenticated role matrix or Playwright E2E suite was available.

This is a bounded evidence-based audit, not proof that every possible flow or all 14 phases are defect-free. Phase 14 was merged to `main` before the audit branch was created. Audit fixes remain on the audit branch and have not been merged to `main`.

## Phase results

| Phase | Result | Evidence / limitation |
|---|---|---|
| 0 Architecture | VERIFIED_WITH_LIMITATIONS | App Router, strict TypeScript/Supabase domain structure and server/client separation are present; broad dependency/circular-import review not exhaustive. |
| 1 Frontend foundation | VERIFIED_WITH_LIMITATIONS | Public routes returned HTTP 200 locally; limited browser visual verification after audit edits. |
| 1.5 UI polish | NOT_TESTED | No redesign performed; accessibility and responsive checks not comprehensively rerun. |
| 2 Auth/database | VERIFIED_WITH_LIMITATIONS | Hosted schema and RLS inspected; 1 traveler/auth pair. Host/DMO/admin credentials unavailable for adversarial role tests. |
| 3 Official data | VERIFIED_WITH_LIMITATIONS | 3 destinations, 15 places, 3 external listings have provenance. Not all pages or terms were re-fetched/re-reviewed in this audit. |
| 3A source registry | VERIFIED_WITH_LIMITATIONS | 14 domains and 49 URLs pass source validator; registry explicitly does not confirm all robots/terms. |
| 4 Destination Health | VERIFIED_WITH_LIMITATIONS | Deterministic formula and unit suite exist; 0 current signal rows, so no real complete score can be validated or displayed. |
| 5 Recommendations | VERIFIED_WITH_LIMITATIONS | Deterministic recommendation implementation and tests exist; no MICHI host inventory or slots. External pathway is present but live recommendation journey not fully E2E-tested. |
| 5.1 Data recovery | VERIFIED_WITH_LIMITATIONS | Correct hosted project identified; real catalog and profile counts audited. No fake hosts, slots, or health data. |
| 6 Cultural RAG | VERIFIED_WITH_LIMITATIONS | 5 active official-verified records; Supabase retrieval returned 1 record in live verification. Full negative/conflict matrix not run against hosted fixtures. |
| 7 Cultural Companion | FAILED | Hosted route returned 503 because required server-side rate-limit credential is empty; endpoint must not weaken its protection. |
| 7.1 Gemini verification | FAILED | Model discovery HTTP 200, actual generation HTTP 429 quota exceeded. Endpoint integration cases returned 503; no Gemini response verified. |
| 8 Maps | VERIFIED_WITH_LIMITATIONS | Accessible list fallback exists; no verified place coordinates suitable for map inventory, and billing/key restriction audit not completed. |
| 9 Itinerary | VERIFIED_WITH_LIMITATIONS | Guest planning route returns 200 and unit tests pass; full multi-day, guest-save/auth restore and map journeys not E2E-tested. |
| 10 Host platform | VERIFIED_WITH_LIMITATIONS | Implementation and migrations exist; zero hosts and experiences, so CRUD/slot workflows cannot be exercised against a real host. |
| 11 Booking | VERIFIED_WITH_LIMITATIONS | Transactional booking implementation and tests exist; 0 slots/bookings; live concurrency test not run. Payments are not implemented. |
| 12 Passport/reflection | VERIFIED_WITH_LIMITATIONS | Implementation exists; single demo achievement explicitly labeled and excluded from earned metrics. Real completed booking flow unavailable. |
| 12.5 Stabilization | VERIFIED_WITH_LIMITATIONS | Existing server answers on port 3000 and core public HTTP checks pass; compilation latency appears on cold requests; complete browser/perf baselines unavailable. |
| 13 DMO/community | VERIFIED_WITH_LIMITATIONS | Implementation and tests exist; no real community feedback or operational outcomes; cohort dashboards cannot show evidence-backed metrics. |
| 14 Admin governance | VERIFIED_WITH_LIMITATIONS | Phase 14 checks passed before merge; public route redirects unauthenticated requests. Full admin workflows cannot be run without authorized admin account/data. |

## Localhost and public route smoke check

An existing MICHI Next.js process occupied port 3000; a second development process could not bind there. The existing process returned HTTP 200 for `/`, `/discover`, `/destinations`, `/experiences`, and `/traveler/plan` where captured. Public destination detail pages `/destinations/kyoto`, `/destinations/kanazawa`, and `/destinations/takayama`, plus auth routes were previously smoke-tested at HTTP 200 in this audit session. Protected `/traveler/bookings`, `/traveler/passport`, `/host`, `/dmo`, and `/admin` returned 307 to login without authentication, as expected.

Latest three-sample timings captured before the route loop stalled:

| Route | Status | Samples (seconds) |
|---|---|---|
| `/` | 200 | 17.913, 0.281, 0.244 |
| `/discover` | 200 | 4.438, 0.469, 0.443 |
| `/destinations` | 200 (third sample timed out) | 2.657, 0.492, incomplete |

First requests include development compilation; these are not production performance or Core Web Vitals measurements. Browser automation after the copy updates timed out, so final visual verification is incomplete.

## Data authenticity

The inspected live catalog records are official-source-backed, with the exact sources and limits documented in [DATA_AUTHENTICITY_AUDIT.md](DATA_AUTHENTICITY_AUDIT.md). The statement “all displayed data is real and verified” would be false: the site includes first-party product copy, a labeled demo passport illustration, no current health evidence, and no MICHI-host inventory. No simulated operational signals were found in the inspected database.

The audit corrected the stored source URL for Kanazawa Castle Park and Gyokusen-inmaru Garden to its specific official VISIT KANAZAWA page. It also corrected stale public homepage copy so it no longer says the Cultural Companion and host controls are entirely disconnected, and clarifies that there are currently no MICHI hosts or measured community outcomes.

## Integration, security, and data findings

- Supabase project matches `sjfcwmaceduwdhpdccyh`; table counts are in the data authenticity report.
- RLS is enabled on inspected public tables. Supabase security/performance advisors were run during the final pass; findings and limits are below.
- `.env.local` is Git-ignored and not tracked. A high-confidence pattern scan of reachable commit contents found no matching secret literals. This cannot detect every credential form; a Gemini key was pasted in prior conversation and should be rotated.
- Gemini is server-side; browser bundle scan found no Gemini credential pattern. Actual API generation is quota-blocked.
- Guest public routes work; private routes redirect to authentication. Role-specific private data separation was not fully tested due missing role accounts.
- No MICHI booking inventory exists; no real booking capacity/concurrency result can be claimed.
- Source registry URL validation passed, but terms/robots coverage remains incomplete. Do not start automated refresh until each intended URL's access rules are reviewed.

## Supabase advisor findings

The connected advisor endpoint became available during the final pass:

- Security: three RLS-enabled tables have no policies (`cultural_companion_rate_limits`, `guest_request_limits`, `host_invitations`). Their migrations grant access to `service_role` only and revoke client access, so no-policy deny-by-default is intentional; it also explains why the server-only service credential is required.
- Security: nine `SECURITY DEFINER` routines are executable by authenticated users, and one share RPC is executable by `anon`. The audited definitions check admin/DMO/verified-host/owner identity or require a share token and `visibility='shared'`. This matches their intended use, but the exposed RPC grants should remain covered by authorization tests.
- Security: Supabase Auth leaked-password protection is disabled. Enable it in the Supabase Auth password/security settings before production; no credentials or auth policy settings were changed during this audit.
- Performance: 67 indexes are reported unused, and eight tables have multiple permissive policies for the same action. Given the empty/new operational tables, unused-index data is not sufficient reason to drop indexes. Review policy overlaps with query plans before consolidating; no policy/index changes were made.

## Audit changes

- Updated homepage descriptions to reflect current Cultural Companion, host-onboarding, and DMO data states.
- Updated Kanazawa Castle Park provenance in `supabase/seed/real_tourism.sql`.
- Added and applied guarded migration `20261008201013_phase14_4_exact_catalogue_provenance.sql`; the hosted row was queried after application.
- Added this technical report, baseline report, and data authenticity report.

## Validation status

Audit-branch validation: `npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS (19 files / 117 tests); `npm run build` PASS (Next.js 16.4.0, 52 static pages); `npm run data:validate-sources` PASS (14 approved domains / 49 URLs); `git diff --check` PASS. The first Vitest attempt failed with Windows `spawn EPERM`; the rerun with required process permissions passed. Live AI verification: Gemini discovery PASS, generation FAIL (HTTP 429); Cultural Companion API FAIL (HTTP 503 due missing service-role credential). No browser E2E suite or accessible host/DMO/admin test accounts were available.

## Remaining actions before a confident release/demo

1. Configure the server-only Supabase service key through the secret manager/environment, then retest the Cultural Companion rate-limit RPC and endpoint.
2. Resolve Gemini quota and rotate the conversation-exposed key; rerun live generation and English/Japanese/citation tests.
3. Review robots and terms for each source before enabling any automated ingestion or refresh.
4. Onboard an actual authorized operator before presenting MICHI booking; do not seed fictional hosts or slots.
5. Add current, provenance-backed health inputs before showing a complete destination score.
6. Run browser E2E with authorized traveler, host, DMO, and admin accounts; include booking concurrency against isolated test data.
7. Obtain Supabase advisors once connector authentication works.
8. Review and merge audit-branch changes separately. Phase 14.5 has not started.
