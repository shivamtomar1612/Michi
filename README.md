# MICHI

MICHI is a responsible Japan tourism and cultural-exchange platform. It helps travelers discover culturally grounded experiences while taking destination capacity, accessibility, community consent, source quality, and local benefit into account.

MICHI is designed around responsible discovery rather than generic AI itinerary generation. Recommendation scores and Destination Health calculations are deterministic. Cultural explanations use retrieved, provenance-aware evidence; Gemini can explain supplied evidence but is not a source of truth.

## Product scope

The application includes the traveler discovery and itinerary journey, cultural knowledge and companion, Supabase authentication and role-aware workspaces, host experience and capacity controls, booking and notification flows, and the Cultural Passport and reflection experience. The DMO and admin routes provide role-protected operational interfaces.

Public discovery includes source-backed destinations and places plus verified external experience information. External listings are not MICHI partners and are not bookable through MICHI unless a host has separately completed MICHI verification and onboarding.

## Current development checkpoint

- Phases 0–12 are represented in the application; Phase 12.5 documents a localhost and performance stabilization pass.
- Phase 13 has not started.
- The latest stabilization report records passing lint, TypeScript, unit-test, and production-build checks. It also records limits: authenticated role workflows were not exercised, no Playwright suite is configured, and the hosted catalogue has no MICHI host experiences or availability slots. See [the recovery report](docs/LOCALHOST_RECOVERY_REPORT.md) and [performance audit](docs/PERFORMANCE_AUDIT.md).
- The audited public catalogue snapshot contains three destinations, fifteen places, and three external listings. These records carry source provenance; source reviews and snapshot freshness are documented in [REAL_DATA.md](docs/REAL_DATA.md).
- No real MICHI host, host-owned slot, community sentiment, or complete verified destination-health signal is manufactured to fill product gaps. Read [the production data audit](docs/PRODUCTION_DATA_AUDIT.md) and [production data recovery report](docs/PRODUCTION_DATA_RECOVERY.md) before treating the hosted service as launch-ready.

## Technology

- Next.js App Router, React, strict TypeScript, and Tailwind CSS
- Supabase Auth, PostgreSQL, Row Level Security, and Storage
- Zod validation and server-side route handlers
- Gemini for evidence-grounded cultural explanations
- Google Maps Platform for optional map views, with a list fallback
- Vitest for unit tests

## Architecture

The repository is organized by application routes, reusable components, domain features, shared libraries, server-only data access, Supabase migrations and seeds, tests, and operational documentation. See [architecture.md](docs/architecture.md), the [architecture decision record](docs/decisions/0001-platform-architecture.md), and the domain guides in `docs/`.

```text
app/                 App Router pages, route handlers, and auth callback
components/          Shared UI and navigation
features/            Traveler and domain feature modules
lib/                 Shared utilities and client-safe primitives
server/              Server-only data access and business logic
supabase/migrations/ PostgreSQL schema, policies, and RPC changes
supabase/seed/       Curated source-backed catalogue snapshot
tests/unit/          Offline unit tests
docs/                Architecture, provenance, setup, and phase reports
```

## Local development

Requirements: Node.js 20.9 or newer and npm. `package-lock.json` is the authoritative dependency lockfile.

```bash
npm ci
Copy-Item .env.example .env.local   # PowerShell; on macOS/Linux use: cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Keep the development server running in its terminal. Detailed setup and recovery steps are in [DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md).

### Environment variables

Copy the blank, safe template in `.env.example` to `.env.local` and set only values for integrations you intend to use. `.env.local` and other local environment files are ignored by Git.

Browser-visible values are limited to `NEXT_PUBLIC_SUPABASE_URL`, the Supabase anon/publishable key, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID`, and `NEXT_PUBLIC_APP_URL`. Browser keys must be restricted to the required APIs and allowed origins.

Keep `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`, and `RATE_LIMIT_SALT` server-only. `AI_MODEL`, `EMBEDDING_PROVIDER`, and `EMBEDDING_MODEL` are server configuration. Never commit actual credentials or place private keys in any `NEXT_PUBLIC_` variable.

## Supabase setup

1. Create or select a Supabase project and configure its URL and publishable/anon key in `.env.local`.
2. Sign in to the Supabase CLI and link the intended project: `npx supabase login` then `npx supabase link --project-ref <project-ref>`.
3. Review the migrations and the target schema, then apply them with `npx supabase db push`. The migrations include policies and role-specific access controls; do not disable RLS to resolve access problems.
4. Configure Supabase Auth Site URL and callback URLs for local and deployed origins, then verify signup, email confirmation, login, and recovery in the target project.
5. Run the source validation, curated snapshot ingest, and catalogue verification only when connected to the intended database. These commands can affect hosted data; review their implementation and target before running them.

Do not add production credentials to GitHub Actions. Only use privileged Supabase keys in trusted server environments. See [REAL_DATA.md](docs/REAL_DATA.md), [DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md), and [PRODUCTION_DATA_AUDIT.md](docs/PRODUCTION_DATA_AUDIT.md).

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checking |
| `npm test` | Run offline Vitest unit tests |
| `npm run build` | Create the production build |
| `npm run ai:verify` | Perform live Gemini and RAG verification; requires configured services and may use API quota |
| `npm run data:validate-sources` | Validate reviewed source URLs against the allowlist |
| `npm run data:ingest` | Import the curated catalogue snapshot to the configured Supabase project |
| `npm run data:verify` | Check catalogue provenance and booking boundaries in Supabase |

For a local code-quality pass:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The current unit test setup covers `tests/unit/**/*.test.ts`. A Playwright end-to-end suite is not configured yet. Live Supabase, Gemini, and Google Maps behavior must be tested separately with the intended project and credentials.

## Data, trust, and responsible use

- Every verified cultural or tourism claim needs source provenance and a suitable verification status.
- Official tourism sources are not commercial MICHI partners or host authorization.
- External listings use external information/booking links. Do not label them as “Book with MICHI.”
- Unknown availability, accessibility, community readiness, crowd pressure, and other health evidence remain unknown; they are not replaced with invented scores.
- Simulated signals, if enabled in an isolated demonstration, must be labeled as simulated and must never be described as live.
- DMO reporting is aggregated and must not disclose traveler-level records.
- Host rules are host-provided and cannot be labeled official government guidance.

## Known operational limitations

The latest reports describe a working local build, not a blanket production certification. The hosted project has no verified MICHI host inventory or real slot capacity in the audited snapshot, so MICHI-managed booking availability depends on genuine host onboarding. Complete verified Destination Health scores require fresh, sourced evidence for every required component. Authenticated role workflows and live integrations still require deployment-specific verification. Consult the linked audit reports for exact evidence and remaining steps.

## License

No license is currently declared. Unless a license is added, reuse and redistribution are not granted by this repository.
