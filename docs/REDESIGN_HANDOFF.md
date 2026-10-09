# MICHI Phase 14.5 handoff

## Design decisions to preserve

- Traveler discovery and responsible recommendations lead the experience.
- Use the image-led regional spread direction selected by the product owner.
- Keep the warm paper, ink, restrained vermilion, moss, editorial serif, and readable sans-serif design tokens in `docs/MICHI_DESIGN_SYSTEM.md` and `app/globals.css`.
- Keep guest exploration and itinerary preview open before authentication.
- Keep real destination photography visibly attributed; do not use concept art as documentary imagery.
- Preserve explicit unknown states for availability, health, accessibility, and impact.
- Keep external experience listings information-only until an operator has actually onboarded and verified authorization.

## Existing scope

The redesign refines the public homepage, discovery results, destination presentation, experience cards, shared navigation, and workspace shell. The existing itinerary, recommendation, booking, cultural knowledge, host, DMO, admin, and Cultural Passport behavior remains on its previous data and authorization paths. No backend schemas, business scoring, roles, booking semantics, or external integration contracts were changed.

## Review status

The finish reviewer returned `disposition: recapture`. The available desktop screenshot includes a transient compile indicator; clean desktop, mobile, and 1265 × 711 user-viewport captures were not available to the reviewer. This handoff records an implementation checkpoint, not final visual approval. Host, DMO, and admin authenticated appearances also remain unverified because authorized test sessions were unavailable.

## Recommended follow-up

1. Review the role-protected host, DMO, and admin views with authorized test accounts; check dashboard density, data provenance, tables, and mobile behavior.
2. Perform the dedicated Phase 15 accessibility and English/Japanese localization work. Test Japanese wrapping, focus, contrast, touch targets, and chart alternatives.
3. Recheck imagery permissions and preserve creator/license attribution when assets change.
4. Obtain field or preview performance measurements before making Core Web Vitals claims.
5. Add persisted visual regression captures using an approved browser screenshot workflow when available.

Phase 15 has not been started by this handoff.
