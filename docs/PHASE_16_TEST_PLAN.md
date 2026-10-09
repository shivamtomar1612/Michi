# Phase 16 Test Plan

## Scope and trust boundaries

The audit covers the Next.js 16 App Router, localized public and protected routes, `proxy.ts`, server actions, route handlers, Supabase Auth/PostgreSQL/RLS, host uploads, source ingestion, Gemini, Google Maps configuration, and the GitHub CI workflow. Trust boundaries exist between browser and server, guest and signed-in users, each authenticated role, application server and Supabase, administrator input and fetched source sites, and MICHI and Gemini/Google Maps.

## Inventory

| Area | Main surfaces | Security property |
|---|---|---|
| Authentication | `/auth/*`, `/auth/callback`, `proxy.ts`, `server/auth/guards.ts`, `features/auth/actions.ts` | Supabase session is server-validated; callback redirects stay local; protected roles are checked server-side |
| Guest/public | localized home, discover, destinations, experiences, shared itinerary | Public access exposes only approved public records and deliberately shared itinerary snapshots |
| Traveler | plans, itineraries, bookings, profile, passport, reflections | User ownership enforced in server actions, RLS, and transactional RPCs |
| Host | experience CRUD, slots, bookings, community, settings | Verified host identity and ownership; paused listings excluded from new recommendations |
| DMO | destination dashboards and aggregate RPCs | destination scope and aggregation; individual traveler details excluded |
| Admin | moderation, source registry, ingestion review, audit | server-side admin guard and audited privileged mutations |
| APIs | recommendations, itinerary generation, booking, cancellation, reflection, evidence, assistant, analytics, cron | bounded input, schema validation, authorization, rate limits, safe errors |
| Cultural ingestion | `features/cultural-knowledge/security.ts`, admin knowledge API | exact approved URLs, HTTPS, public DNS, pinned address, revalidated redirects, robots, timeout and response bounds |
| Booking | `request_experience_booking`, cancellation/host-decline RPCs | row locks and atomic capacity updates; owner/host/status checks |
| External services | Gemini and Google Maps | secrets server-only; cultural answers grounded in retrieved evidence; browser map key is intentionally public and must be key-restricted |

## Test pyramid and execution

- Unit: `npm test` (Vitest). Phase 16 adds bounded-body and production rate-limit configuration regression tests.
- Static: `npm run lint`, `npm run typecheck`, `npm run build`.
- Dependency: `npm audit` and production-only audit.
- Live RLS: read-only anonymous publishable-key requests against the connected Supabase project. No production writes were performed.
- Integration/E2E: blocked for privileged role contexts and booking concurrency because no isolated Supabase test project, fixture accounts, or slots were available. Do not substitute production data or fabricated accounts.
- External-service adversarial tests: deterministic unit-level behavior only; no uncontrolled Gemini requests or Maps billing calls.

## Required release-gate cases

1. Guest reads published destinations; private profiles, bookings, reflections, recommendation logs, and audit logs are denied.
2. Traveler A cannot read or mutate traveler B's records.
3. A host cannot manage another host's experience, slots, or bookings.
4. DMO aggregation respects destination assignments and minimum cohort suppression.
5. Admin mutations require server-side admin authorization and write audit events.
6. Booking concurrent requests cannot exceed capacity; cancellation restores capacity exactly once.
7. Host pause prevents new booking/recommendation candidates while preserving confirmed bookings.
8. Gemini uses only retrieved evidence; model-provided citations/URLs cannot become trusted citations.
9. Ingestion rejects private IPs, non-HTTPS, unapproved hosts/URLs, unsafe redirects, disallowed robots paths, oversized responses, and unsupported content types.
10. Malformed/oversized JSON is rejected before buffering the entire request.
11. Maps failure leaves the accessible destination/experience list available.
12. English/Japanese keyboard and mobile layout checks remain required before release.

## Not yet executed

Authenticated cross-role RLS probes, real concurrent booking transactions, full Playwright journeys, real Gemini attack prompts, browser header/CSP review, and field Core Web Vitals require isolated credentials/test resources or a browser-driven staging environment. They are release blockers for claims that depend on those properties.
