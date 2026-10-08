# MICHI Architecture

## Purpose

MICHI is a responsible Japan tourism and cultural-exchange platform. Its core product question is: **what experience fits this traveler while respecting destination capacity, cultural context, accessibility, community consent, and local economic benefit?** It is not a generic AI itinerary generator.

This document establishes architecture boundaries for incremental product phases. Do not implement future product features as part of the architecture foundation.

## System shape

```text
Traveler | Host | DMO | Admin interfaces
                    |
             Next.js App Router
         server actions / route handlers
          |          |             |
         Auth   domain services   AI/RAG
                    |             |
         recommendation engine   Gemini explanations
                    |             |
         destination health   verified evidence retrieval
                    |             |
                  Supabase
   PostgreSQL, Auth, Storage, RLS, Realtime
       PostGIS / pgvector when available
                    |
    Google Maps | Gemini | approved sources
```

## Application organization

Prefer domain-oriented modules as the application grows:

```text
app/                         Next.js routes and layouts
components/                  shared UI primitives
features/                    domain UI and client-side workflows
  auth/ destinations/ experiences/ recommendations/
  destination-health/ cultural-knowledge/ cultural-companion/
  itineraries/ bookings/ passport/ community/ dmo/ admin/ analytics/
lib/                         shared configuration and utilities
server/                      server-only services and authorization
types/                        shared domain types
hooks/                        reusable React hooks
supabase/
  migrations/                reviewed schema and policy changes
  seed/                      curated source-reviewed catalogue snapshots
tests/                        unit, integration, and Playwright E2E tests
docs/                         architecture, operational, and product guidance
```

Keep server and client boundaries explicit. Put privileged operations in server-only code and enforce authorization in server/database layers, not only in UI role checks. Use Zod at trust boundaries. Prefer reusable components and shared business logic over duplicated feature implementations.

## Platform choices

- **Web:** latest stable Next.js compatible with the repository, App Router, strict TypeScript, React, Tailwind CSS, shadcn/ui, and Lucide.
- **Interaction and visualization:** use Framer Motion only when it clarifies a meaningful interaction; use Recharts for relevant data visualizations.
- **Backend and persistence:** Next.js server actions/route handlers with Supabase PostgreSQL, Auth, Storage, RLS, and Realtime. Use PostGIS where available. Add pgvector only when semantic embeddings are enabled.
- **AI and cultural retrieval:** Gemini is called server-side. PostgreSQL full-text/keyword retrieval is the baseline; pgvector is optional. Retrieval must rank evidence deterministically by source authority and provenance.
- **Maps:** Google Maps Platform, with appropriately restricted public browser keys.
- **Validation and forms:** Zod and React Hook Form where forms warrant it.
- **Quality and deployment:** unit, integration, and Playwright E2E coverage for implemented behavior; deploy on Vercel when deployment is in scope.

Dependencies and environment requirements should be introduced only in the phase that needs them. Do not add secrets or real provider values to the repository.

## Domain boundaries and flows

### Traveler

Discover → preferences → responsible recommendations → destination health → compare alternatives → itinerary → cultural preparation → local booking → participation → reflection → Cultural Passport.

### Host

Register → host dashboard → create experience with cultural context and participation rules → set availability/capacity → manage bookings and visitors → pause/resume recommendations → community feedback and impact.

### DMO

Destination overview → destination health → visitor pressure and dispersion → community sentiment → host capacity → local economic proxy → cultural and trust metrics. DMO reporting is aggregated and must not expose individual traveler information.

### Admin

Manage users and destinations → verify hosts → moderate experiences → manage cultural sources → review ingested knowledge, staleness, and conflicts → system health.

These journeys describe product boundaries, not implemented functionality.

## Responsible recommendation engine

Recommendation ranking is deterministic application logic, never a Gemini ranking decision. Candidate scoring should account for:

- personal match;
- cultural depth;
- local benefit;
- accessibility;
- availability; and
- destination health.

The engine should preserve explainable factor contributions and provenance so travelers and operators can understand why a recommendation appears. Gemini may explain the deterministic result using retrieved evidence.

## Destination Health Engine

Destination health should consider crowd pressure, remaining capacity, community readiness, transport accessibility, and seasonal suitability. Store source and observation timestamps for its inputs. MICHI currently has no approved signal integration and does not generate or display simulated crowd information; those values remain unavailable.

## Cultural knowledge and AI

The approved knowledge path is:

```text
official or community source
  → ingestion and SSRF-safe validation
  → provenance and verification review
  → chunking/indexing
  → authority-ranked retrieval
  → evidence-grounded Gemini explanation with citations
```

Gemini is an explanation layer, not the cultural database. It must not invent culture, rituals, laws, venue restrictions, photography policies, opening hours, accessibility, transport schedules, sacred practices, or host rules. If reliable retrieved evidence is absent or conflicting, the system should abstain or clearly surface uncertainty rather than fabricate an answer.

Record source identity, authority, verification status, applicable destination/topic, retrieval/update timestamps, and conflict/staleness state. Protect ingestion from SSRF and review uploaded content before indexing.

## Community control and bookings

Hosts control capacity, availability, visibility, participation rules, photography rules, accessibility information, cancellation rules, and recommendation pause/resume. Pausing recommendations affects discovery only; it must not erase or silently cancel confirmed bookings. Capacity-aware booking must enforce availability and capacity in trusted server/database operations to avoid oversubscription.

## Data truth and privacy

Every displayed datum must retain a truth category:

| Category | Meaning |
| --- | --- |
| Verified official data | Reviewed against an authoritative official source |
| Community/host-provided data | Supplied by a host or community; not represented as official verification |
| AI-generated explanation | Generated from retrieved evidence and presented with citations |
| Simulated demo data | Synthetic or illustrative data, visibly labeled; MICHI currently creates and displays none |
| Unverified data | Not yet confirmed by an appropriate reviewer/source |
| Stale data | Past its freshness expectation; show its last-checked date where useful |

Never visually present one category as another. Minimize personal data collection. Do not collect unnecessary precise movement history. Aggregate DMO reporting and exclude individual-level traveler details.

## Security and operational boundaries

- Never hard-code credentials or expose server secrets through `NEXT_PUBLIC_*` variables.
- Keep `.env.local` and other local environment files ignored; commit only blank examples.
- Use Supabase RLS and database/server authorization for every privileged operation.
- Validate server input with Zod; validate upload type, size, and content handling.
- Protect public/expensive endpoints with rate limits appropriate to the operation.
- Protect URL-based ingestion against SSRF, including redirects and private/internal destinations.
- Keep Gemini and privileged Supabase calls server-side.
- Surface loading, error, and empty states; visible actions must work or be clearly disabled.
- Maintain responsive behavior and accessible semantics/keyboard operation.

## Incremental delivery rules

Each phase inspects and preserves existing work, implements only its requested scope, and documents architecture changes. Add tests for important business logic as features are implemented. Run the available lint, TypeScript, build, and relevant test commands at the end of implementation phases. The initial architecture-only foundation had no package manifest; Phase 1 establishes the Next.js frontend and its lint, type-check, and build commands.

## Phase 1 frontend boundary

Phase 1 established public pages and role-specific workspace shells. Phase 2 replaced the auth preview with Supabase Auth and server/database role checks. No synthetic destination, experience, host, photography, crowd, or capacity records are included in the application. Product workflows that mutate booking or discovery data remain deferred until their corresponding phases.

## Phase 2 Supabase foundation

`lib/supabase/client.ts` and `lib/supabase/server.ts` create typed browser and cookie-backed server clients with `@supabase/ssr`. Root `proxy.ts` refreshes sessions for workspace requests; each workspace page independently verifies the user and their database-backed `profiles.role`. `server/supabase/admin.ts` only returns a service-role client after server-side admin authorization. Signup never accepts a role; an Auth trigger creates a `traveler` profile and reads only the display name from user metadata.

The first migration creates core MICHI tables, foreign keys, checks, indexes, updated timestamps, grants, and RLS policies. Public reads are limited to published destinations/experiences and verified fresh cultural content. Travelers see their own private records; hosts manage their own experiences and slots and read related bookings; DMO access is an aggregate-only database function that suppresses destinations with fewer than five completed/confirmed bookings. There is no direct client booking write permission; capacity-safe booking is deferred to its own transactional server/database phase. Privileged admin operations verify the database-backed admin role server-side. Phase 6 knowledge mutations use the authenticated server client with admin RLS policies; the service-role key is reserved for protected rate-limit maintenance when configured.

The configured Supabase project is active and has the core, catalogue, health, host onboarding, and cultural knowledge migrations applied. Signup/profile creation still depends on verified Auth redirect/email settings. Promote the first admin using the steps in the README when an owner account is ready. `types/database.ts` is regenerated from the connected hosted schema.

## Phase 6 cultural knowledge

The evidence retrieval, source approval, content review, and freshness model are documented in `docs/CULTURAL_KNOWLEDGE.md`. Admin-selected URLs are fetched only after source terms and domain approval, and each record remains unpublished until review. Public retrieval uses PostgreSQL full text and can use optional pgvector embeddings; Gemini is not called by the evidence API.

## Phase 7 cultural companion

The Cultural Companion uses `retrieveCulturalEvidence()` for every answer. The model receives only retrieved evidence and a bounded, transient conversation context. It cannot choose confidence or citations: the server keeps retrieval confidence, accepts only evidence IDs returned by retrieval, and reconstructs source URLs and verification metadata from database records. Unsupported questions abstain; stale/conflicting evidence lowers confidence and is called out. If Gemini is unavailable or returns invalid output, the API returns the retrieved excerpts and citations directly. Questions and conversation text are not persisted; privacy-limited analytics store only a random conversation UUID and coarse response metadata. The Gemini key stays in server environment configuration.
