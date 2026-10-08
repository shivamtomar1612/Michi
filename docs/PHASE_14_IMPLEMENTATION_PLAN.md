# Phase 14 implementation plan

## Verified starting point

- GitHub `main` was fetched and verified at `0079e155ca50aafd866f41c86f5d7a9adb3a5747`, with Phase 13 integrated. The worktree was clean before this phase.
- Work is isolated on `feature/phase-14-admin`, created from that `main` commit. `main` is not modified.
- The connected Supabase project is MICHI (`sjfcwmaceduwdhpdccyh`). Its migration history contains Phases 0–13. The hosted project had one traveler profile, three destinations, no MICHI hosts, experiences, slots, bookings, or community reports, and no pre-existing audit/report tables.
- Existing admin routes already covered host application review, experience approval, source/content governance, DMO access, and community-feedback review. These are reused.
- Live `information_schema.column_privileges` checks showed authenticated users can update profile preference/display columns but cannot update `profiles.role`. Privileged role changes stay inside existing verified-host and admin assignment workflows.

## Additive changes

1. Add an append-only governance audit table with administrator-only RLS reads, server/service-role insertion, bounded non-sensitive metadata, and update/delete rejection triggers.
2. Audit host application review and experience governance state changes inside the existing database transactions. Audit cultural evidence review through its existing review trigger. Add server audit events for domain/URL governance, content staging, ingestion preview outcomes, destination content edits, invitations, DMO assignments, and community-feedback moderation.
3. Add a private authenticated content-report queue with target validation, reason codes, bounded details, review reason/status, internal review note, one reconsideration request, a duplicate-open-report constraint, and a ten-per-account rolling 24-hour insert limit.
4. Add admin routes for operational activity, users, destination content, reports, bookings, and audit history. Bookings are read-only and omit traveler identifiers, private notes, acknowledgments, requirements, and payment credentials.
5. Preserve source provenance during destination edits. Publishing requires current verified-official provenance, official-tourism data status, an active official source registry entry, and a non-expired verification window; health/crowd scores are not editable.

## Security and product decisions

- Every admin page and action performs server-side role checks. Service-role access remains server-only and is obtained only after `requireRole(["admin"])`.
- User role visibility is read-only in the directory. Host verification grants host role through the existing review RPC. DMO authority remains destination-scoped; no arbitrary role editor was added.
- Reporters must be authenticated. Reports and reviewer notes are not public and never enter DMO aggregates. A reporter can read only their own submissions and request reconsideration after a final decision.
- Audit records contain actor, action, target, outcome, timestamp and safe metadata only. Raw report details, emails, phone numbers, credentials, cultural reflections and reviewer notes are excluded.
- No production users, hosts, reports, slots, bookings, or synthetic operational records were created.

## Verification plan

- Test access guard and policy design independently; inspect live RLS policies, grants, triggers, indexes, and row counts after migration.
- Add unit coverage for report validation, allowed targets/reasons, duplicate/rate-limit contracts, audit metadata safety, destination publication provenance, and pagination bounds.
- Run lint, TypeScript, the full existing unit suite, and production build. Report live role-path testing limits because the hosted project has no admin, host, or report fixtures available to exercise without fabricating accounts/data.
- Do not merge or deploy Phase 14. Push only the tested feature branch after all available checks pass.

## Explicit limitations

- Account suspension/deactivation is not implemented because there is no account restriction model or appeal-safe state in the existing schema. The admin directory therefore does not expose a fake control.
- Booking oversight is intentionally read-only; refunds and capacity edits require payment and transactional support that does not exist.
- Runtime application errors are not persisted in a dedicated observability system. Failed admin governance and cultural ingestion preview actions are logged; this does not represent all infrastructure errors.
- No authenticated admin account exists in the connected production project, so browser-based admin sign-in and privileged workflows cannot be exercised against real user credentials in this phase.
