# Phase 16 Security Audit

Audit branch: `test/phase-16-security`. Baseline: Phase 15 merge commit `640acf2ba3034d8af23b6a8a5f29b221d4a740db`. Hosted Supabase changes were read-only.

## Findings and fixes

| Severity | Finding | Evidence / disposition |
|---|---|---|
| Medium, fixed | Several JSON APIs used `request.text()` without a byte cap, allowing unnecessarily large request bodies to be buffered before schema validation. | Added streaming byte-count limits to every route handler that reads a request body; oversized bodies return 413 and unreadable/malformed bodies return 400. Unit tests cover declared length, actual stream size, and stream errors. |
| Medium, fixed | Cultural evidence endpoint could fall back to a process-local rate limiter in production when privileged Supabase configuration was absent. This limiter is not shared across server instances. | Production now returns 503 without the shared backend; deterministic policy tests cover production/development behavior. The Cultural Companion and guest limits already fail closed. |
| Low, fixed | Standard clickjacking, MIME-sniffing, referrer, and browser capability response headers were absent. | Added X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and a restrictive Permissions-Policy in Next configuration. Browser-level delivery verification remains pending. |
| Informational | Supabase security advisor lists `get_shared_itinerary(uuid)` for anon/authenticated execution. | Inspected function: reads only explicitly shared itinerary snapshots using a share token and selected public fields. Intended public feature; it does not expose profile or booking notes. Keep token entropy and share revocation covered by tests. |
| Informational | Three rate-limit/invitation tables have RLS enabled but no row policies. | Table grants/revokes are intended to deny direct client access; inspect grants after every schema change. No policy was added that could widen client access. |
| Operational, unresolved | Supabase Auth leaked-password protection is disabled in hosted project settings. | Cannot be changed through the current SQL migration path. Enable in Supabase Auth security settings before production launch. |
| Operational, unresolved | No isolated project/role fixtures were available for authenticated RLS or concurrent booking integration tests. | No destructive production tests were run. These remain release gates. |

## Controls inspected

- All observed public tables report RLS enabled in hosted project metadata.
- Anonymous API checks denied access to `profiles`, `bookings`, `recommendation_logs`, `traveler_reflections`, and `admin_audit_log` (HTTP 401); host application returned no visible rows; published destinations returned public rows.
- Authenticated `profiles` has SELECT but not UPDATE table grant in hosted grants, so the self-update policy does not permit role changes through the client SQL API.
- Booking RPCs use `SECURITY DEFINER` with empty search path, revoke PUBLIC/anon execution, require authenticated role and owner/host checks, and lock the slot row before adjusting capacity.
- Admin source ingestion is guarded by admin checks and exact URL/domain approvals; fetched text has explicit byte/time/type limits and redirect/robots checks.
- Gemini is server-side; prompt says supplied evidence is the only factual source, output is schema-validated, and citations are reconstructed from retrieved IDs. API key values were not emitted in this report.
- Git ignore protects `.env.local`; it is not tracked. CI has no production credentials.

## Residual risks

No formal penetration test, browser DAST, CSP deployment validation, authenticated role matrix, staging upload test, or live Gemini prompt-injection suite was performed. Google Maps browser key restrictions and Gemini/Supabase provider-side key rotation are not verifiable from repository code. Do not represent this audit as proof of legal compliance or perfect security.
