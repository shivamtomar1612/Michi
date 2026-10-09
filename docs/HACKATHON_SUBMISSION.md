# MICHI hackathon submission package

## Project

- **Title:** MICHI — Responsible Japan Discovery
- **Tagline:** Travel deeper. Leave lighter.
- **Repository:** [github.com/shivamtomar1612/Michi](https://github.com/shivamtomar1612/Michi)
- **Live application:** Not available/verified. The connected Vercel account currently has no MICHI project. Do not submit a placeholder URL as live.

## Problem

Many travel tools optimize for a visitor's list of attractions without making destination pressure, cultural context, community readiness, accessibility evidence, or local benefit clear.

## Solution

MICHI is designed to support source-backed cultural discovery and deterministic responsible recommendations. It aims to explain tradeoffs, preserve provenance, respect unknown capacity/health evidence, and distinguish external information listings from genuinely onboarded MICHI hosts.

## Differentiators

- Deterministic, explainable recommendation and Destination Health logic.
- Authority-ranked cultural evidence retrieval; Gemini may explain retrieved evidence but is not the source of truth.
- Guest-first discovery and itinerary preview.
- Explicit data truth labels and host-controlled capacity model.
- Community/DMO metrics designed for aggregation and privacy.

## Technology and architecture

Next.js App Router, TypeScript, React, Supabase/PostgreSQL/RLS, Gemini server-side, Google Maps Platform, and Vercel as the intended deployment platform. See [architecture docs](architecture.md) and [data provenance](DATA_PROVENANCE.md).

## Demonstration guidance

Use the [five-minute demo plan](HACKATHON_DEMO_PLAN.md) and [fallback slides](DEMO_BACKUP_SLIDES.md). Current data supports a read-only discovery walkthrough only. Do not submit live recommendations, bookings, reflection, or AI questions against production during a presentation. There are no genuine MICHI host accounts, bookable slots, or complete destination health signals in the audited catalogue. Gemini generation last failed due to quota exhaustion (HTTP 429).

## Impact methodology and limitations

MICHI defines metrics and a pilot roadmap in [impact metrics](IMPACT_METRICS.md) and [pilot roadmap](PILOT_ROADMAP.md). No reduction in congestion, increase in local income, or improvement in cultural understanding has been measured. Do not claim partners, endorsement, or measurable impact without evidence and consent.

## Responsible design

Preserve exact source provenance. Do not treat a public tourism listing as operator authorization. Keep unknown accessibility, booking capacity, community readiness, and crowd pressure unknown. Label simulated operational signals. Respect venue and host rules, community consent, and privacy.

## Submission readiness

**Not ready for a live-URL submission:** Preview/Production deployment and URL are blocked pending access to the correct Vercel project and environment verification. The repository and demo materials are available. External forms or announcements have not been submitted.
