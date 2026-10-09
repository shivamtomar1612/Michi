# MICHI Threat Model

## Assets

- Authentication sessions, profile and preference data
- Booking identities, dates, guest counts, requirements, notes, and acknowledgments
- Host identity, experience rules, availability, and contact/ownership evidence
- DMO destination access and aggregated community/traveler metrics
- Admin audit and moderation records
- Verified cultural evidence, source provenance, and verification decisions
- Gemini, Supabase, and Google Maps credentials/configuration
- Availability/capacity integrity and public trust in source/health labels

## Roles and trust boundaries

Guests may read approved public listings and submit rate-limited preferences. Travelers own personal records and bookings. Hosts manage only their verified listings and relevant bookings. DMOs receive scoped aggregates. Admins can review/approve sources and records. The browser is untrusted; all ownership, role, price, and capacity checks must be repeated server-side or in database policies/RPCs. External source text and user prompts are untrusted data, even when retrieved from an official domain. Gemini output is untrusted until schema and citation validation.

## Attack scenarios and current controls

| Scenario | Likelihood / impact | Controls observed | Residual risk |
|---|---|---|---|
| Cross-user/host data access | Medium / High | RLS owner policies, authenticated server guards, role and ownership checks in RPCs | Full authenticated role matrix has not been live-tested |
| Privilege escalation via profile role | Medium / Critical | Profile update grant is SELECT-only for authenticated; server derives role from profile; admin/host assignment uses privileged paths | Re-audit every grant after migrations and test with real role fixtures |
| Booking race/oversell | Medium / High | SQL transaction, `FOR UPDATE` slot lock, capacity check + increment, locked cancellation | No isolated concurrent DB test executed |
| Forged booking price or owner | Medium / High | RPC derives traveler from `auth.uid()`, price from experience, validates host/listing/slot | Needs integration tests against isolated DB |
| Prompt injection or fabricated cultural claims | High / High | Evidence-only system instruction, retrieved evidence, bounded history/input, JSON schema, server-reconstructed citation IDs | Real adversarial model tests and downstream rendering review remain blocked |
| RAG source poisoning / SSRF | Medium / High | Admin-only exact URL approval; HTTPS/host allowlist, DNS public-address checks and pinning, redirect checks, robots, size/time/type limits | Must keep DNS/IP edge-case tests and source terms review current |
| Public API abuse | Medium / Medium | bounded request bodies, schema validation, origin checks, database-backed limiter; evidence endpoint now fails closed in production without shared limiter key | Trusted proxy IP extraction and upstream WAF limits need deployment validation |
| Credential leakage | Low / Critical | ignored env files, server-only secret access, CI secrets absent, no tracked `.env.local` | Hosted credential rotation and GitHub secret scanning are operational controls |
| XSS / unsafe content rendering | Medium / High | structured content and React escaping; ingestion normalizes extracted text | Review all future rich-text rendering; no browser DAST performed |
| CSRF / cross-origin writes | Medium / High | write APIs compare Origin to request origin; Supabase cookie/session protections | Server actions and deployment proxy behavior still need staging browser testing |
| DMO inference | Medium / High | aggregation RPCs, destination scope assignments, cohort suppression | Verify on real multiple-destination fixture data; production data sparse |
| Upload abuse | Medium / Medium | Supabase Storage policies scoped to verified host paths; browser-side image handling | File-size/type/signature policy must be reviewed and tested with staging uploads |
| Availability / cost abuse | Medium / Medium | bounded bodies, request rate limits, Gemini timeouts, no Gemini during ordinary page render | Provider quotas, WAF thresholds, alerting and budget limits remain deployment work |

## Priorities

P0 release blockers: live role isolation failures, exposed credentials, overbooking, or ungrounded cultural claims. P1: production shared rate-limit availability, source SSRF, admin authorization/audit, upload validation. P2: headers, observability, dependency monitoring, performance/a11y regression coverage. This model is an engineering assessment, not a legal or formal penetration-test opinion.
