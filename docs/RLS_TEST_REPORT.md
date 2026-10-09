# RLS Test Report — Phase 16

## Project and method

Read-only audit used the connected Supabase project `sjfcwmaceduwdhpdccyh` (Michi, healthy, PostgreSQL 17, ap-southeast-2). The anonymous checks used the public/publishable API credential held in the local environment; its value is intentionally omitted. No service key was used to simulate an end user and no hosted data was changed.

## Live anonymous checks

| Table / endpoint | Result | Interpretation |
|---|---|---|
| `profiles` | HTTP 401 | denied |
| `bookings` | HTTP 401 | denied |
| `recommendation_logs` | HTTP 401 | denied |
| `traveler_reflections` | HTTP 401 | denied |
| `admin_audit_log` | HTTP 401 | denied |
| `host_applications` | HTTP 200, zero visible rows | RLS returned no records |
| published `destinations` | HTTP 200, two rows | public published catalog access works |

Every public table observed in the schema audit had RLS enabled. The hosted profile grant check showed authenticated SELECT only; UPDATE was not granted. Some operational rate-limit/invitation tables have no policies and explicit client grants are revoked; this is intentional denial, not public access.

## Not verified live

Traveler-to-traveler isolation, host-to-host isolation, DMO destination assignment, admin-only mutation, service-role bypass boundaries, notification/reflection writes, and storage upload ownership require authenticated fixture accounts and an isolated Supabase test environment. The production project has one profile, no MICHI host experiences, no slots, and no bookings. Creating fake accounts or test capacity in production was not appropriate.

## Release gate

Before production launch, run a disposable Supabase branch/project integration suite covering anon, traveler A/B, host A/B, DMO assignment A/B, and admin roles. Assert both denied reads and denied writes, and verify public share tokens reveal only the intended snapshot. Preserve RLS; do not solve fixture failures by disabling it.
