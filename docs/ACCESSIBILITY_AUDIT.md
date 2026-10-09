# MICHI accessibility audit — Phase 15

## Scope and status

This is an engineering review of the current implementation, not a WCAG conformance certification. The changes add a localized skip link to primary shells, preserve semantic navigation and headings in the revised public pages, use locale-aware labels for language selection and navigation, and retain keyboard-operable native inputs, links, buttons, details/summary controls, and drawers. Japanese typography uses a CJK-friendly fallback and strict line breaking.

Automated lint/type checks and existing unit tests are the only checks recorded here until the final validation run is completed. No screen-reader or assistive-technology session has been performed in this change.

## Findings

| Area | Finding | Priority | Action/status |
|---|---|---:|---|
| Language changes | Locale switch retains the current path, query, and fragment and warns when form values differ from defaults. | Medium | Implemented; needs manual keyboard and screen-reader verification. |
| Route navigation | Plain framework links could lose the active locale prefix. | High | Localized routes and shared UI links now use the `next-intl` navigation helpers. Both locales and a protected-route redirect were smoke-tested. |
| Skip navigation | Skip link is present in public, auth, workspace, and key guest flows. | Medium | Verify every target resolves to a unique `#main-content` landmark. |
| Focus visibility and touch sizes | Shared focus styles and mostly 40–48 px controls are present. | Medium | Contrast, visible focus, and target dimensions still need a representative rendered-page audit. |
| Screen-reader announcements | Loading and errors use status/alert semantics in updated flows. | Medium | Review route changes, dialogs, status updates, and map fallback with assistive technology. |
| Source language | Source-provided descriptions can differ from the selected UI locale. | High | Intentionally preserve source meaning; add source-language cues and reviewed translations before translating sensitive cultural content. |
| Remaining route coverage | Several auth, booking, reflection, passport, host, DMO, and admin views have not received a full accessibility/localization pass. | High | Audit each surface before claiming full Phase 15 completion. |

## Required manual verification

- Keyboard-only walkthrough at 320 px mobile and desktop widths, including menus, language switch, forms, maps, dialogs, and focus return.
- Screen-reader review of landmark order, headings, labels, errors, dynamic status, map/list alternative, and language changes.
- Contrast checks for text, borders, focus indicators, and status badges; color must not be the only signal.
- Text resizing to 200%, reduced-motion setting, and long English/Japanese strings.
- Automated axe or equivalent scans on representative public, auth, traveler, host, DMO, and admin routes.

Do not describe MICHI as WCAG 2.2 AA compliant until these checks are completed and failures are resolved.
