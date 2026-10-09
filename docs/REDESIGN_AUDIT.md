# MICHI Phase 14.5A — Product and UX Audit

## Audit scope and evidence

Audited on 2026-10-09 against the current `feature/michi-premium-redesign` checkout. The local Next.js 16.4 development server started and returned HTTP 200 for the homepage. Browser inspection covered the homepage, Discover, and Kanazawa detail. The browser viewport available during this audit was 905px wide; it exposed the tablet-to-mobile navigation treatment. Dynamic authenticated dashboards were inventoried from their actual route files and layouts, but no role-specific account was used to enter them. This is a frontend audit, not a full business-logic or accessibility certification.

The user confirmed that Traveler Discovery → Responsible Recommendations → Cultural Experience should lead the visual hierarchy. Cultural discovery is the emotional entry; responsible recommendations are the signature product interaction. Itinerary/Cultural Companion, local experiences/booking, and Cultural Passport follow that journey. Host, DMO, and Admin workspaces remain professional and role-specific, but secondary in the public brand hierarchy.

## Actual route inventory

### Public

- `/` — editorial landing page
- `/about` — product and principles page; also serves the “How it works” navigation link
- `/discover` — guest preference form, verified catalog/map-list, search, filters, and recommendations
- `/destinations` — destination index
- `/destinations/[slug]` — destination context, places, external experiences, sources, health evidence, and map/list
- `/experiences` — experience index
- `/experiences/[slug]` — external or MICHI experience detail and booking information
- `/share/itinerary/[token]` — public shared itinerary page

### Authentication and public interaction

- `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/callback`
- `/report/new`, `/report/mine`, `/community/feedback`

### Traveler

- `/traveler` — account workspace
- `/traveler/plan`, `/traveler/plan/[id]` — guest-capable planner and itinerary detail
- `/traveler/itineraries`, `/traveler/bookings`, `/traveler/passport`, `/traveler/profile`, `/traveler/host-application`

### Host

- `/host`, `/host/experiences`, `/host/experiences/new`, `/host/experiences/[id]`, `/host/bookings`, `/host/analytics`, `/host/community`, `/host/settings`

### DMO

- `/dmo` — DMO workspace

### Admin

- `/admin`, `/admin/audit`, `/admin/bookings`, `/admin/community-feedback`, `/admin/destinations`, `/admin/dmo-access`, `/admin/knowledge`, `/admin/knowledge/content`, `/admin/knowledge/review`, `/admin/knowledge/sources`, `/admin/reports`, `/admin/users`

### API routes

API route files exist for admin knowledge, AI cultural assistant, analytics, booking and cancellation, cron reminders, cultural evidence, itinerary generation, recommendation and recommendation feedback, and traveler reflection. No new route is required for this redesign.

## Current-state findings

### Homepage

- The core message and primary “Explore Japan” action are present, and the landing page correctly fetches the existing catalog server-side.
- The current first viewport is a dark abstract grid rather than destination imagery; the composition feels like a generic tech landing page and has no visual link to the sourced destinations.
- A 905px browser width still uses the compact navigation; the landing page itself relies on a very large display heading and a long sequence of similarly structured text sections.
- Some statements conflict with the implemented product: the page says the Cultural Companion is “not connected yet” and host listing/booking controls “are not connected yet,” while assistant, host, and booking routes/integrations exist. The accurate state is that assistant availability depends on server credentials/quota and retrieved evidence, and there are no onboarded MICHI hosts or active slots. Verified knowledge/catalogue coverage is limited.
- Data-truth language is comparatively strong: missing destination health is called unavailable and external experiences are not represented as MICHI-bookable.

### Discover

- Guest access works; preferences include interests, regions, budget, dates, pace, accessibility, dietary preferences, languages, and crowd tolerance.
- The page also exposes a sourced map/list, a catalog search, content-type filters, and three external experience listings.
- Important distinctions are present in text (external inventory, unknown capacity/health, verified accessibility constraints), but the first form and discovery inventory are vertically long and compete for attention.
- At 905px, the page has substantial empty space above the form. Search and filter controls are lower than the key preference form, reducing scan efficiency.
- Places and external experiences without verified coordinates are explicitly not mapped, which preserves truth.

### Destination detail (Kanazawa)

- Provenance, source URL, last-checked date, reporting action, page-section links, and the no-marker fallback are present.
- Source-backed context and structured place information are available. Health evidence is explicitly unavailable.
- The page is text-dense and the map/list section appears early relative to visitor context; a more editorial page hierarchy could separate visitor orientation, places, evidence, and alternatives.

### Role workspaces

- Actual role-specific route trees exist and Host layout enforces `requireRole(["host"])`. DMO/Admin are separate surfaces, not public landing content.
- The current audit did not authenticate as host, DMO, or admin. Visual/functional details of protected dashboards remain to be checked with authorized accounts; no role checks were bypassed.
- Keep host controls operational and direct, DMO views evidence-based and aggregated, and admin pages dense/task-oriented. A marketing layout should not be imposed on operational screens.

## Prioritized opportunities

1. Establish a coherent visual world from the actual product: editorial travel surface for guests, restrained shared tokens, operationally dense layouts for workspaces.
2. Improve the first viewport with a truthful, non-documentary visual asset or properly licensed imagery; do not use generated art as evidence of a real venue.
3. Make the guest discovery action and preferences easier to scan, with search, region/interest filters, verified inventory, and unknown evidence visually distinct.
4. Replace stale integration claims with current, precise statements based on actual data and feature availability.
5. Recompose destination and experience details to make identity, source, status, and visitor action easy to find without hiding provenance.
6. Make the host, DMO, and admin surfaces consistent but role-appropriate; preserve existing controls and server authorization.
7. Improve responsive navigation, typography wrapping, focus visibility, empty/error/loading states, and reduced-motion behavior.

## Confirmed design priority

The user chose a concept-image-first workflow and confirmed the visual direction: premium Japanese cultural travel storytelling, warm ivory/deep ink/restrained vermilion, elegant typography, cinematic photography, and subtle motion. The final concept approval remains a separate checkpoint before implementation. No real destination photo is currently cleared for use in the repository.

## Scope limits

- No active host inventory or date-specific slots were observed in the live project audit; the design must not imply MICHI booking availability.
- No current destination health signal set was available; no verified score may be rendered.
- No host/DMO/admin credentials were used in this audit, so protected routes were inventoried but not visually verified.
- Screenshot observations are from the current in-app browser capture; an automated screenshot archive and all responsive widths are still outstanding.
- Screenshot review cannot establish full WCAG conformance; keyboard, contrast, screen-reader, and control-state checks remain required.
