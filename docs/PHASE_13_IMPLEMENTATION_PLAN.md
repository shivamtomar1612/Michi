# Phase 13 implementation plan

**Scope:** DMO destination intelligence, governed community feedback, and privacy-preserving MICHI analytics. Phase 14 and deployment changes are out of scope.

## Starting state verified

- The working branch is `feature/phase-13-dmo` at the Phase 12.5 baseline; the worktree was clean before this phase. GitHub's current `main` and the feature branch both point to that baseline.
- The connected Supabase project is the active `Michi` project (`sjfcwmaceduwdhpdccyh`, Postgres 17). Existing Phase 0–12 migrations are present in the project.
- Existing DMO route: `/dmo` is role-protected but displays a planned-signals empty state. There is no destination-scope assignment model.
- Existing data-access rules enforce owner/host reads for bookings and community feedback. Analytics events are insert-only for public clients; the current allowed events are the four Destination Health actions and `cultural_companion_question`.
- `community_feedback` currently stores destination, optional host/author, positive/neutral/negative sentiment, optional pressure score, free-text comment, and timestamp. It has no contributor authorization context, category, consent, or moderation fields.
- Live rows observed at planning time: 3 destinations, 15 places, 3 external experiences, 1 traveler profile, 28 analytics events (all `cultural_companion_question`), and zero MICHI experiences, slots, bookings, Destination Health signals, community feedback, passport achievements, reflections, or recommendation logs. No DMO profile or DMO assignment exists.
- The existing Destination Health engine uses the required fixed weights and returns incomplete evidence rather than inventing inputs. The hosted project has no Health signal rows, so a complete score must remain unavailable.
- Recharts is not installed. Charts will use lightweight, accessible SVG/HTML built from returned aggregate data and will render explicit insufficient-data states when suppression or missing evidence applies.

## Decisions and safeguards

1. Extend existing tables and analytics; do not create a parallel bookings or event system.
2. Add explicit, admin-managed destination access assignments with separate `dmo_analytics` and `community_representative` scopes. Assignments are not inferred from signup metadata. DMO analytics also requires the existing `dmo` app role.
3. Expose aggregate metrics through narrowly scoped database functions that verify the caller, app role, and destination assignment. Do not grant DMO direct reads of raw events, bookings, profiles, feedback comments, traveler reflections, or contact fields.
4. Require an explicit community-representative assignment or the existing host context to submit feedback. Keep original text private, require aggregate-use consent, and exclude unmoderated or withdrawn feedback from DMO aggregates.
5. Suppress small cohorts. Do not offer arbitrary overlapping reporting windows that permit subtraction attacks; use disjoint calendar reporting periods and explain the minimum cohort rule.
6. Compute Destination Health with the existing deterministic engine. Show score and component evidence only when all required current inputs meet the engine's provenance and freshness rules; otherwise show missing components and limitations.
7. Keep simulated data out of production metrics. No seed/demo feedback or fabricated visitor-pressure data will be added.
8. Make additive migrations only. Apply the reviewed migration to the connected project through the Supabase integration, verify policies and counts afterward, and retain an exact local migration file.

## Implementation milestones

### 1. Database authorization and data governance

- Add destination access assignments with grantor, access scope, timestamps, constraints, indexes, RLS, and service-role-only admin assignment/revocation functions.
- Add feedback category, contributor context, consent, moderation state, and withdrawal support to `community_feedback`; preserve all existing rows and defaults.
- Replace the public analytics insert policy with a strict allowlist for defined events and event-specific metadata validation.
- Add an aggregate-only DMO metrics RPC. It validates a selected destination and fixed reporting period against the authenticated caller's role and assignment. Its response contains aggregate counts, suppressed/unknown states, and definitions only.
- Add only indexes supported by the final query shape; preserve all existing indexes and policies not directly involved.

### 2. Server services and access-management actions

- Add server-only functions to list a DMO's assigned destinations and request the aggregate metrics RPC.
- Reuse the Destination Health engine/service for signal evidence and missing-component reporting.
- Add admin-only actions to grant/revoke access for existing profiles and review community feedback. Role elevation uses the service-role client only after server-side admin authorization; it never trusts client role fields.
- Add authorized host/community-representative feedback submission, consent, moderation visibility, and author withdrawal.

### 3. DMO portal and community interface

- Replace the `/dmo` placeholder with a destination-scoped overview, fixed calendar-month selector, evidence completeness, source/data status, platform activity, confirmed MICHI booking/capacity metrics, local-participation proxy, and cultural engagement aggregates.
- Add a community feedback route for approved contributors, plus an admin assignment and moderation interface.
- Keep external booking clicks separate from confirmed MICHI bookings. Label every platform-derived metric as MICHI activity, not real-world visitor volume.
- Add accessible chart and table alternatives, readable periods/units, loading/error/empty states, and mobile layout.

### 4. Event semantics and metric definitions

- Define typed, validated event names for destination/experience views, recommendation generation, alternative consideration, itinerary generation, cultural learning, and reflection. Booking totals remain derived from the canonical bookings table; no external click is counted as a booking.
- Emit events at explicit user actions or once-per-view boundaries, never during arbitrary renders. Do not attach profile data or free-text preferences to analytics events.
- Count distinct ephemeral session IDs for platform engagement and suppress cohorts under the defined minimum. Use distinct traveler/host cohorts for booking and capacity-derived metrics where needed.

### 5. Verification and reports

- Add deterministic unit tests for access scope, role checks, suppression, missing/stale evidence, metric calculations, event validation, feedback consent/moderation/withdrawal, and simulated-data separation.
- Run lint, TypeScript, unit tests, production build, Supabase security/performance advisors, and read-only aggregate queries against the connected project.
- Write `DMO_ANALYTICS_ARCHITECTURE.md`, `COMMUNITY_SENTIMENT_METHODOLOGY.md`, `METRIC_DEFINITIONS.md`, and `PHASE_13_TEST_REPORT.md` with actual results and unresolved deployment-specific limitations.

## Acceptance gates

- A DMO sees only explicitly assigned destinations and aggregate metrics; direct API requests cannot bypass scope checks.
- An unassigned user, traveler, host, or admin without the DMO role cannot call DMO analytics.
- Raw comments, traveler IDs, profile fields, bookings, and reflections do not appear in DMO responses.
- Fewer than five distinct contributors/sessions results in a suppressed or insufficient-data state, not a percentage or misleading chart.
- Missing or expired Health evidence is shown as unavailable; no default score is substituted.
- Only authorized hosts or assigned community representatives can submit feedback. Feedback is private until reviewed and consented for aggregation; authors can withdraw it.
- No demo record is mixed with hosted operational analytics.
- Existing public discovery, auth, booking, host, recommendation, and passport flows remain intact.
- The final branch is pushed to `feature/phase-13-dmo`; `main` remains unchanged and no Phase 14 work begins.

## Known risks to validate during implementation

- The hosted project has no DMO user or assigned destination, so a real end-user DMO login journey cannot be completed without an existing authorized DMO account. The admin assignment path will be testable with database fixtures and authorization unit tests; no DMO user will be fabricated.
- Current analytics are sparse and mostly cultural-companion questions. Most dashboard metrics will initially be suppressed or unavailable until genuine MICHI activity exists.
- The Supabase Performance Advisor previously reported unused indexes and multiple permissive policies. Phase 13 will review its post-migration findings and will not remove unrelated indexes or alter unrelated policies.
- A public-to-private or host contact export is not part of this phase. DMO access remains aggregate-only.
