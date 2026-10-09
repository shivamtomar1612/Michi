# MICHI Phase 14.5 visual QA

## Scope and evidence

The final production build was served locally at `http://localhost:3000`. Browser inspection covered the image-led public homepage, the guest-first navigation and calls to action, the Discover flow, destination detail, experiences, and the guest itinerary builder. The homepage was inspected at the available 1265 × 711 viewport. Earlier responsive checks covered the widths listed below.

The Codex browser returned screenshots inline but did not provide a supported way to save those captures into the repository. An earlier desktop PNG exists but contains a transient “Compiling…” indicator and is not valid review evidence. A DevTools capture attempt failed because Chrome's debugging endpoint was unavailable, and a separate launch attempt was blocked. There are no valid persisted `desktop.png`, `mobile.png`, or `user-1265.png` captures. The selected concept comp is a design reference, not a screenshot of the running application.

## Responsive checks

The following viewport widths were checked for horizontal overflow:

| Surface | Widths checked | Result |
| --- | --- | --- |
| Home | 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920 px | No horizontal overflow |
| Discover | 320, 390, 768, 1024, 1440 px | No horizontal overflow |
| Destination detail | 320, 390, 768, 1280 px | No horizontal overflow |
| Experiences | 320, 390, 1024, 1440 px | No horizontal overflow |
| Guest itinerary planner | 320, 390, 768, 1024, 1440 px | No horizontal overflow |

On mobile, the navigation drawer opened and closed with Escape, with focus returning to its close control. Destination section links wrap on small screens and only become sticky at the larger breakpoint. The itinerary planner remained usable at 320 px.

The Discover journey was exercised as a guest: interest and date filters were submitted, results displayed real external Kanazawa listings, and unknown availability and health remained explicitly unknown. Searching Kyoto and changing content filters updated results. No fake MICHI-host inventory was displayed.

## Visual findings and fixes

- Homepage composition follows the selected image-led direction, with the real Kenrokuen image, editorial type, clear Explore Japan action, itinerary preview, and three region links.
- Photo creator and CC BY 2.0 attribution are visible beside each real destination image.
- Destination photo credit was moved outside the hero to avoid overlapping its source/report controls at narrow widths.
- Destination section navigation wraps at mobile widths.
- A duplicate community explanation was removed from the homepage.
- Above-the-fold destination images use eager loading in accordance with the installed Next.js 16.4 guidance.
- Experience listings use a typographic treatment rather than an unrelated illustrative photo.

## Checks

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (19 files, 117 tests)
- `npm run build` — PASS (Next.js 16.4.0, Turbopack)
- HTTP GET — PASS (200) for `/`, `/discover`, `/destinations/kanazawa`, and `/experiences`
- Impeccable detector — PASS with no findings on the single required run; a second detector run was intentionally not performed.
- Independent Impeccable finish review — `recapture`; it rejected the available evidence and requires clean desktop, mobile, and 1265 × 711 screenshots before visual review can proceed.

## Not verified in this environment

- Host, DMO, and admin dashboards require authorized role sessions. Their route guards and data logic were left intact, but authenticated visual states were not opened in this browser run.
- A valid saved, full-page desktop/mobile screenshot set is not available. The independent review is blocked until those captures are saved and checked.
- No Vercel preview or production performance score was produced. The 54-second cold production compilation is a local build measurement, not a field performance metric.
- The DMO and host product states remain constrained by the actual empty MICHI host inventory and missing current Destination Health evidence documented in the existing production audit.
