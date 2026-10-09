# MICHI Phase 0–14 Audit Baseline

Audit date: 2026-10-09 (Asia/Calcutta)
Baseline commit: `dee896a0ea64ebcfe0b0012ba574e611d06f8caa` (`feat: add Phase 14 admin governance`)
Audit branch: `audit/phase-0-to-14-verification`
Main: fast-forwarded to the same Phase 14 commit before the audit branch was created.

## Scope and source limits

This report audits the repository, current local application, connected Supabase project, and approved source URLs. Per the user's direction, the original PDF compliance review is excluded. No PDF-based compliance conclusion is made.

The live project is Supabase project `sjfcwmaceduwdhpdccyh`, matching the project URL configured locally. The audit used read-only SQL for current records plus one guarded, additive provenance correction. The standard Supabase MCP migration listing/SQL tools intermittently failed token refresh; the alternate connected Supabase SQL tool and migration listing succeeded.

## Environment snapsho

- Git working baseline: Phase 14 commit `dee896a`; audit edits are isolated on the audit branch.
- Package manager: npm; `package-lock.json` is present.
- Runtime: Next.js App Router, TypeScript, React, Supabase SSR/client libraries.
- `.env.local` exists locally and is ignored by Git. No values are reproduced here. Its server-only `SUPABASE_SERVICE_ROLE_KEY` is empty; Gemini generation also currently fails due upstream quota.
- Local Next.js development server: an existing process for this project answered on `http://localhost:3000`; the duplicate startup attempt could not bind because that port was already occupied.
- Test suite: 19 files and 117 unit tests passed on the audit branch. There is no substantive Playwright suite (`tests/e2e/.gitkeep` only).
- Audit-branch checks: `npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS (19 files / 117 tests); `npm run build` PASS (Next.js 16.4.0, 52 static pages generated); `npm run data:validate-sources` PASS (14 domains / 49 URLs); `git diff --check` PASS.

## Existing state and known limitations

- No MICHI host experiences, host slots, bookings, destination health signals, or community feedback are in the live project.
- One real traveler profile is paired with one Auth user. No host, DMO, or admin test account was available.
- The public catalog contains 3 official destinations, 15 official place records, and 3 real external Kanazawa experience listings. The listings are information/external-booking only.
- The destination health engine correctly has no complete live score to show because required evidence is absent.
- Cultural Companion evidence retrieval succeeds for one active verified record, but the production endpoint returns 503 without a server-side Supabase service credential. The live Gemini generation request was HTTP 429 (quota exceeded).
- Source registry validation passed (14 approved domains, 49 reviewed URLs), but runtime metadata shows robots status checked only for JNTO; other domains are marked `not_checked_by_runtime`. This does not establish that all source terms or robots rules were reviewed.
- Supabase security/performance advisor retrieval was blocked by connector authentication refresh failure. RLS is enabled on inspected public tables; this is not a substitute for a full advisor review or all-role adversarial tests.

## Baseline measurements

The already-running development server was cold for some routes after edits. Three requests were attempted per path; the first request includes route compilation and is not comparable to warm navigation.

| Route | HTTP | First request | Subsequent observed requests |
|---|---:|---:|---:|
| `/` | 200 | 17.913 s | 0.281 s, 0.244 s |
| `/discover` | 200 | 4.438 s | 0.469 s, 0.443 s |
| `/destinations` | 200 | 2.657 s | 0.492 s (third sample did not complete within the measurement window) |
| `/experiences`, `/traveler/plan` | Not captured in this measurement pass | — | — |

These are local HTTP response timings, not browser paint metrics or production Core Web Vitals. A request loop stalled while compiling later paths; it was not treated as a successful timing result. After the production build, one smoke request per route returned HTTP 200 for `/`, `/discover`, `/destinations`, `/experiences`, and `/traveler/plan`.

## Git and safety

- Phase 14 was fast-forwarded into `main`, and the push to `origin/main` succeeded before this audit branch was created.
- No force push or history rewrite was used.
- A safe scan of all reachable Git commit content found no matching high-confidence secret patterns. `.env.local` is not tracked; `.env.example` is the only tracked environment template.
- This scan cannot prove the absence of every possible credential format. The Gemini key was pasted in prior conversation context; rotate it before production use.
