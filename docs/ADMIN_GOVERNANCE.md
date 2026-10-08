# Admin governance

## Access model

Admin pages and mutations use `requireRole(["admin"])` on the server. Privileged Supabase access is isolated to `server/supabase/admin.ts`, which repeats the role check before reading `SUPABASE_SERVICE_ROLE_KEY` or the configured server secret. Admin navigation is a convenience only; RLS, database functions, and action-level checks enforce access.

The user directory is read-only and paginated. It shows profile name, role, creation time, and profile update time; it does not expose login email, auth metadata, preferences, tokens, or arbitrary role changes. Verified host onboarding remains the only host-role grant workflow. DMO access remains destination-scoped through the Phase 13 assignment RPCs.

## Operational surfaces

- `/admin`: exact-count data health and platform activity from Supabase.
- `/admin/users`: bounded name/role filtering and 25-row pages.
- `/admin/destinations`: edit description and cultural summary, and change publication status. Existing provenance is preserved. Publishing requires verified-official evidence.
- `/admin/bookings`: read-only support details with status, listing, visit time, guest count, and recorded JPY amount. Personal traveler details and private booking fields are omitted.
- `/admin/reports`: status-filtered content reports, reasoned decisions, private review notes, and reconsideration messages.
- `/admin/audit`: paginated append-only governance events.
- `/admin/knowledge/*`, `/admin/dmo-access`, `/admin/community-feedback`: existing source governance, scoped access, and community moderation, linked from admin navigation.

## Actual metrics

Counts are direct database counts. Query failures display “Unavailable”; no fallback or simulated number is used. Recommendation requests, itinerary generations and Companion questions are analytics events. These describe MICHI use, not total tourism volume. Booking amounts are recorded booking value, not verified revenue. Health scores remain derived from sourced evidence.

Failed ingestion previews and failed privileged operations are counted from audit events over the prior 30 days. The platform does not yet have a general runtime error/alert pipeline, so admin reports do not imply that all infrastructure failures are monitored.

## User account limitations

MICHI has no account restriction/suspension model. Administrators cannot suspend, delete, or arbitrarily change profile roles through this console. Before adding those capabilities, the platform needs a policy for booking retention, host appeal, user notice, access revocation, and account restoration.
