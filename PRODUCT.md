# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Travelers exploring Japan who want experiences that match their interests while respecting cultural context, accessibility, destination capacity, and community consent. Hosts need control over how their experiences are presented and when visitors may participate. DMOs need aggregated destination-level insight. Admins need auditable governance, source review, and moderation tools.

## Product Purpose

MICHI helps travelers discover and plan culturally meaningful journeys through Japan while supporting responsible visitor distribution, community control, and local economic benefit. Success means a traveler can understand and compare credible options before choosing, and communities retain control over participation and capacity.

## Positioning

MICHI combines deterministic, explainable recommendations with destination evidence, verified cultural knowledge, host-controlled experience participation, and reflection. It optimizes for the fit between traveler, place, and community readiness rather than generating a generic AI itinerary.

## Operating Context

Traveler journey: discover, set preferences, compare recommendations and destinations, preview an itinerary, prepare culturally, participate, reflect, and keep a Cultural Passport. Hosts manage experiences, rules, availability, bookings, and discovery visibility. DMOs see aggregated and non-personal destination insight. Admins verify hosts and sources, moderate content, and monitor data quality.

## Capabilities and Constraints

- The traveler-facing discovery and responsible recommendation journey leads the product hierarchy; recommendations are the signature interactive feature.
- Guests can browse public destinations and experiences, request recommendations, and preview itineraries before creating an account. Account-specific saving, booking, and dashboards remain protected.
- Recommendation scores are deterministic. Gemini may explain retrieved, ranked evidence and organize validated candidate IDs; it is not the cultural source of truth and does not rank destinations.
- Public destination, place, and external experience records must retain their provenance and verification status. External listings are informational and cannot be presented as MICHI-bookable without host authorization and real capacity.
- Destination Health requires current, sourced component evidence. Missing signals remain unavailable; simulated values must be visibly labeled and isolated.
- Hosts control capacity, participation rules, availability, and recommendation visibility. Pausing discovery does not remove confirmed bookings.
- DMOs see aggregated information only. Private traveler details, admin notes, credentials, and host-private contact data stay protected.
- UI redesign must preserve Supabase, authentication, authorization, RLS, APIs, transactions, analytics meanings, source validation, privacy, and accessibility behavior.

## Brand Commitments

MICHI is a responsible Japan tourism and cultural-exchange platform. The product philosophy and primary line are “Travel deeper. Leave lighter.” The requested visual direction is Japanese editorial minimalism, luxury travel storytelling, and intelligent product design: warm ivory, deep ink, restrained vermilion, elegant typography, cinematic imagery, and subtle motion. Avoid stereotypical Japanese motifs and generic AI-dashboard styling.

## Evidence on Hand

- The repository includes the application, Supabase migrations, source registry, reviewed catalogue snapshot, tests, and product documentation.
- The checked-in catalogue includes three official destination records, fifteen official place records, three external operator listings in Kanazawa, and five concise cultural guidance records, as documented in `docs/REAL_DATA.md` and `docs/PRODUCTION_DATA_AUDIT.md`.
- Those documents report no MICHI host listings, active MICHI slots, or current Destination Health signals. This work must not invent them.
- No approved MICHI photography library, logo kit, or Figma edit seat was available at the start of this redesign. Any generated art must remain clearly non-documentary.
- There are no verified partnership claims or measured community-impact outcomes to display.

## Product Principles

1. Make discovery useful before asking for an account.
2. Balance personal relevance with place and community context.
3. Show sources, limits, and uncertainty where decisions are made.
4. Keep host consent and capacity in host control.
5. Never invent cultural facts, inventory, impact, access, or live conditions.

## Accessibility & Inclusion

Accessibility information must be explicit and evidence-backed. Requested accessibility constraints remain hard constraints when evidence is unknown. Interfaces must support keyboard access, readable contrast, responsive layouts, reduced motion, and future English/Japanese localization without assuming that unknown accessibility is confirmed.
