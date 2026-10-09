# Phase 14.5 Plugin Utilization

## Purpose

Record tool availability and actual use for MICHI's premium product redesign. The redesign is limited to presentation, navigation, responsive behavior, and visual feedback; it must preserve Supabase, auth/RLS, recommendation, health, cultural-evidence, itinerary, booking, host, DMO, and admin behavior.

## Discovery and plan

| Tool or workflow | Availability and limits | Intended role |
|---|---|---|
| Figma | Connected account is view-only; no editable design file can be created. | Inspect existing design references if useful; do not claim editable Figma deliverables. |
| Product Design / UI UX Designer | Skills available. | Route and task-flow audit, stakeholder-specific design decisions. |
| Impeccable | Skill and CLI available at the installed version. | Record product truth, establish a new visual direction, run the required single detector pass, and document the finished system. |
| Frontend engineering skills | Available. | Keep Server/Client boundaries, semantics, responsive layouts, and component quality. |
| BrowserAct | No BrowserAct MCP actions are exposed in this session. | Use the available browser automation for visual inspection and responsive QA. |
| Browser automation (Codex in-app browser) | Available; localhost initially refused connections until the dev server was started. | Inspect current routes, interact with public flows, capture design evidence, and check responsive states. |
| Canva | Connected, but no MICHI brand kit or existing MICHI design was found. | No marketing collateral is needed for this application redesign. |
| GitHub / Git | Existing GitHub repository and local Git access are available. | Work on `feature/michi-premium-redesign`; checkpoint each stable stage; do not merge to `main`. |
| Supabase | Connected project `Michi` is available. No hosted data changes are needed for this UI task. | Read-only verification of data truth and integration constraints. |
| Vercel | No MICHI project is available through the connected account. | Preview deployment is unavailable; do not create a project or deploy production. |
| Ace Knowledge Graph / Graph Mode | Ace can create a generic graph widget; no relevant design artifact capability was identified. Graph Mode is not exposed. | Not used because it adds no material design or implementation value. |
| Ponytail | Skill available, not a design artifact tool. | No repository-wide simplification pass; avoid expanding the visual task into unrelated refactoring. |
| Image generation | Available. | Use only for non-documentary decorative art if it materially improves the interface; never represent generated artwork as a real destination, host, or cultural event. |

## Actions performed so far

- Confirmed the redesign branch is clean and based on the Phase 14 `main` checkpoint.
- Inspected installed Next.js 16.4 App Router layout/page and Server/Client Component guidance before implementation.
- Started the local development server and confirmed `http://127.0.0.1:3000/` returns HTTP 200.
- Inspected the current homepage, Discover page, and Kanazawa destination detail in the browser.
- Figma account and Canva design inventory were checked earlier in this task: Figma is view-only; no Canva brand kit or MICHI design exists.
- Vercel project search returned no MICHI project. No preview deployment has been created.
- Supabase project/data inspection was read-only; no schema or record changes are planned.

## Constraints

- Do not add Convex or another backend.
- Do not fabricate inventory, live crowd data, host capacity, sentiment, health scores, bookings, or partnerships.
- External experiences remain external/information-only; no MICHI booking UI without real host onboarding and slots.
- Missing/unavailable evidence remains visibly unknown.
- Report tool limitations and actual artifacts at completion.

## Final use log

Update this table after implementation with concrete outputs, screenshots, tests, and limitations. This document is not evidence that an action was completed until its output is recorded here.
