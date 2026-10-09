# MICHI Phase 14.5 — Implementation Plan and Change Log

## Guardrails

- Keep Supabase, auth, RLS, role authorization, APIs, migrations, deterministic scores, evidence ranking, citations, booking transactions, and analytics semantics intact.
- Keep guests able to explore and preview itineraries without signup.
- Render only real catalog records. Preserve external-vs-MICHI booking distinctions and honest unknown states.
- Avoid new dependencies unless a measured design requirement cannot be met with the current stack.
- Keep server rendering for data routes and confine client code to interaction needs.

## Stages

### 14.5A — Product and UX audit · complete

- Inventory actual public, traveler, host, DMO, admin, and API routes.
- Inspect public page behavior and protected-route guards.
- Record truth and usability issues in `docs/REDESIGN_AUDIT.md`.
- Record available design, browser, Git, Supabase, and deployment tools in `docs/PLUGIN_UTILIZATION_PLAN.md`.

### 14.5B — Design system · complete

- Record confirmed product truth in `PRODUCT.md` after the structured priority response.
- Establish a shared design direction and tokens in `docs/MICHI_DESIGN_SYSTEM.md`.
- Specify interaction and reduced-motion rules in `docs/MOTION_SYSTEM.md`.
- Inventory existing and newly generated/approved images in `docs/ASSET_MANIFEST.md`.
- Stable design-system milestone is documented; no separate release commit was made before the interface work.

### 14.5C — Interface redesign · public traveler surfaces implemented; role-specific visual review remains open

- Rework global styling and navigation with a guest-first public journey.
- Recompose the landing page and public discovery/detail pages while keeping current query, filter, source, and booking-link behavior.
- Refine the shared workspace shell without altering role guards or server actions. Host, DMO, and admin visual states were not individually redesigned or visually verified in this pass because authorized role sessions were unavailable.
- Do not create routes for unavailable product areas or represent external listings as MICHI inventory.

### 14.5D — Motion and interactions · refined after independent review

- Keep homepage content visible immediately; the shared reveal wrapper no longer uses scroll-triggered opacity transitions. The hero retains its brief entry treatment, and content remains visible without animation.
- Honor reduced-motion preferences and avoid new animation dependencies unless necessary.
- Use generated assets only as clearly non-documentary artwork; do not infer a real location from them.

### 14.5E — QA and handoff · checks pass; reviewed homepage fixes shipped

- Verify representative public states. Host, DMO, and admin states remain unverified without authorized role sessions.
- Responsive widths and mobile navigation keyboard behavior were checked for the public surfaces. A complete contrast audit, console/network review, and authorized host/DMO/admin visual pass remain open; Phase 15 remains out of scope.
- Run repository lint, typecheck, tests, and production build.
- Record exact evidence and remaining account/data limitations in `docs/VISUAL_QA_REPORT.md` and `docs/REDESIGN_HANDOFF.md`.
- The initial independent reviewer requested fixes to homepage labels, explanatory text size, repeated community copy, scroll-reveal motion, and concept-versus-code workflow state. These were addressed, then desktop, mobile, and 1265 × 711 screenshots were recreated. Final reviewer disposition: `ship` for the reviewed fixes, with no regressions. The review was scoped to the homepage and these findings; authenticated host, DMO, and admin views were not included.

## Change log

- Replaced the abstract homepage hero with a real, attributed Kanazawa garden photograph, concise editorial title, primary discovery action, and itinerary preview link. Kept the existing database-backed destination sections and source-backed records.
- Added attributed Kyoto, Kanazawa, and Takayama destination images to the homepage and destination cards. Cards retain verification status, source, and last-checked details.
- Added destination cards to Discover so destination search/filter results are visible beside external experience listings.
- Replaced decorative generic experience-card texture with an editorial typographic treatment; no experience is represented by an unrelated photograph.
- Reworked destination detail to use its attributed destination photograph and provenance panel. The on-page section navigation wraps on small screens and becomes sticky at larger sizes.
- Updated the shared public navigation and workspace navigation colors to the warm-paper and ink system. Kept account routes, role checks, and server actions intact.
- Replaced outdated copy that said host, booking, itinerary, and companion features were not connected. Copy now distinguishes available product surfaces from the currently empty MICHI host inventory and unavailable current Health evidence.
- Kept the recommendation form, itinerary builder, maps, source citations, host controls, DMO metrics, admin governance, and booking behavior on their existing code paths.
- Kept motion CSS-only. Content is visible by default and is not hidden when JavaScript is unavailable; reduced-motion settings still disable movement.
- Fixed the homepage display size after visual review so “Travel deeper.” and “Leave lighter.” each fit on one line at desktop widths.
