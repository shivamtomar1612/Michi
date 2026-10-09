# MICHI Phase 14.5 — Implementation Plan and Change Log

## Guardrails

- Keep Supabase, auth, RLS, role authorization, APIs, migrations, deterministic scores, evidence ranking, citations, booking transactions, and analytics semantics intact.
- Keep guests able to explore and preview itineraries without signup.
- Render only real catalog records. Preserve external-vs-MICHI booking distinctions and honest unknown states.
- Avoid new dependencies unless a measured design requirement cannot be met with the current stack.
- Keep server rendering for data routes and confine client code to interaction needs.

## Planned stages

### 14.5A — Product and UX audit

- Inventory actual public, traveler, host, DMO, admin, and API routes.
- Inspect public page behavior and protected-route guards.
- Record truth and usability issues in `docs/REDESIGN_AUDIT.md`.
- Record available design, browser, Git, Supabase, and deployment tools in `docs/PLUGIN_UTILIZATION_PLAN.md`.

### 14.5B — Design system

- Record confirmed product truth in `PRODUCT.md` after the structured priority response.
- Establish a shared design direction and tokens in `docs/MICHI_DESIGN_SYSTEM.md`.
- Specify interaction and reduced-motion rules in `docs/MOTION_SYSTEM.md`.
- Inventory existing and newly generated/approved images in `docs/ASSET_MANIFEST.md`.
- Commit the stable design-system milestone before broad page edits.

### 14.5C — Interface redesign

- Rework global styling and navigation with a guest-first public journey.
- Recompose the landing page and public discovery/detail pages while keeping current query, filter, source, and booking-link behavior.
- Refine common workspace shell and high-traffic traveler/host/DMO/admin surfaces without altering role guards or server actions.
- Do not create routes for unavailable product areas or represent external listings as MICHI inventory.

### 14.5D — Motion and interactions

- Use motion only for meaningful page entry, selection, or feedback; content remains visible without animation.
- Honor reduced-motion preferences and avoid new animation dependencies unless necessary.
- Use generated assets only as clearly non-documentary artwork; do not infer a real location from them.

### 14.5E — QA and handoff

- Verify representative public, traveler, host, DMO, and admin states as available.
- Check responsive widths, keyboard use, focus, contrast, no horizontal overflow, and browser console/network errors.
- Run repository lint, typecheck, tests, and production build.
- Record exact evidence and remaining account/data limitations in `docs/VISUAL_QA_REPORT.md` and `docs/REDESIGN_HANDOFF.md`.

## Change log

- Initial plan written before UI implementation. No product code changed yet.
