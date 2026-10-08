# ADR-001: Establish MICHI's platform architecture

## Status

Accepted as the project foundation; implementation is incremental.

## Date

2026-10-07

## Context

MICHI must connect traveler, host, DMO, and admin workflows while accounting for cultural trust, destination capacity, community consent, accessibility, and local benefit. A generic AI itinerary generator would not provide the deterministic ranking, evidence provenance, host control, privacy, or auditability the product requires. The repository had no existing implementation or technical conventions at the start of this phase.

## Decision

Use a Next.js App Router application with strict TypeScript and domain-oriented modules. Use Supabase PostgreSQL/Auth/Storage/RLS as the application backend, with PostGIS and pgvector introduced only when their corresponding capabilities are built. Use Gemini server-side for evidence-grounded explanation, not as a source of cultural truth or a destination-ranking engine. Use deterministic code for recommendations and authority-ranked PostgreSQL retrieval for cultural knowledge. Maintain explicit source/truth labels and enforce community controls, aggregated DMO access, data minimization, and server/database authorization.

Add platform dependencies and implementation only in the phase that needs them. Keep this foundation limited to architecture, documentation, blank configuration examples, ignore rules, and reserved directories.

## Alternatives considered

### Generic AI-generated itineraries

Rejected because probabilistic generation alone cannot reliably enforce capacity, community rules, destination health, evidence provenance, or stable ranking.

### Client-side AI and privileged data access

Rejected because provider secrets and authorization must remain server-side and be enforced by trusted server/database controls.

### Separate search/vector infrastructure from the start

Deferred. PostgreSQL full-text search is the baseline; pgvector is an optional future capability. Avoid operating additional systems until semantic retrieval is required.

## Consequences

- Future feature work has clear domain and security boundaries.
- Recommendations and destination health must expose deterministic inputs and provenance.
- Cultural answers require retrieved, reviewable evidence and citation; missing evidence requires abstention.
- Supabase policy design is part of feature implementation, not a UI-only follow-up.
- The repository is documentation/skeleton only until a later phase adds the Next.js application and dependencies.
