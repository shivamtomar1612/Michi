# MICHI Design System

## Design intent

MICHI should feel like a considered Japanese travel journal: editorial, calm, image-led, and trustworthy. The traveler journey leads the visual hierarchy. Responsible recommendations are the signature product interaction; host, DMO, and admin workspaces use the same visual language with denser layouts appropriate to their tasks.

## Visual principles

- Lead with real, place-identified photography and visible attribution.
- Use warm paper, deep ink, and restrained vermilion for actions and emphasis.
- Let typography, spacing, and fine rules provide structure before using panels or cards.
- Keep source status, freshness, booking mode, and unknown evidence visible where a traveler makes a decision.
- Preserve distinct visual contexts for travelers, hosts, DMOs, and admins without making the public journey feel like an operations dashboard.
- Never imply that a source, host, destination, or experience has partnered with MICHI without evidence.

## Foundations

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--color-background` | `#f7f5ef` | Warm page canvas |
| `--color-surface` | `#fffefa` | Forms and raised reading surfaces |
| `--color-surface-muted` | `#efede5` | Quiet section contrast |
| `--color-foreground` | `#202b30` | Primary ink text |
| `--color-foreground-muted` | `#59636a` | Secondary copy |
| `--color-border` | `#d9d6cd` | Subtle separators |
| `--color-border-strong` | `#aaa69b` | Stronger dividers |
| `--color-accent` | `#963b2b` | Restrained vermilion actions and labels |
| `--color-accent-hover` | `#793020` | Hover and pressed accent |
| `--color-success` | `#536b5c` | Positive, evidence-backed status |
| `--color-warning` | `#786033` | Caution and freshness status |
| `--color-danger` | `#8a3826` | Errors and destructive actions |
| `--color-information` | `#425e6b` | Informational status |

Color alone must not communicate a state. Pair it with text or an accessible icon label. Verify text and control contrast for each actual background.

### Type

- Display and editorial headings use the existing serif system stack, including Japanese serif fallbacks.
- Body, navigation, labels, and controls use the existing sans-serif system stack with Japanese fallback.
- Keep body copy comfortable at 16px or larger for primary reading; use smaller sizes only for secondary metadata and never for essential rules or image attribution.
- Use sentence case for headings, short line lengths for editorial copy, and uppercase only for small, tracked section labels.
- Avoid shipping remote fonts as a runtime dependency; the local system stack keeps first paint stable and supports Japanese fallback.

### Layout and shape

- Use the existing fluid page gutter and 1280px editorial content width as the baseline.
- Public pages use generous section spacing and a clear reading measure; operational workspaces may use denser grids.
- Controls use a small, consistent radius. Avoid turning every content group into a rounded card.
- Use strong image crops as a composition choice, not as a way to hide image context or credit.

### Imagery and provenance

- Documentary photographs must have a verified subject, source page, creator, license, and visible attribution.
- Photo credits link to the source page and license and do not imply endorsement.
- If an image is cropped by CSS, document that treatment and preserve the source file unchanged.
- Do not use concept comps or generated landscape/craft images to represent real destinations, operators, or activities.
- Do not add a destination image when no appropriately licensed, verifiable photograph is available; use a typographic destination link instead.

## Component behavior

- Navigation: keyboard-operable, clear focus, responsive at narrow widths, and does not obscure the page.
- Buttons and links: visible focus, adequate hit area, clear action wording, and non-color affordances.
- Forms: persistent labels, clear errors and required status, and preserved guest work when authentication is requested.
- Badges: distinguish official, operator, host, stale, simulated, and unknown records with both text and icon/shape.
- Cards: show actual record provenance and booking mode; external records must not look MICHI-bookable.
- Loading and error states: keep their layout stable and explain the next available action.

## Responsive behavior

- Design from mobile through wide desktop; the primary public action remains discoverable on every viewport.
- At small widths, preserve the image-led story without placing text over the key subject or trapping the navigation.
- Prefer stacking and horizontal scrolling only for purposeful carousels; provide a non-scrolling alternative when the information is essential.
- Prevent horizontal overflow and preserve readable attribution and evidence labels on mobile.

## Accessibility

- Use semantic landmarks and a single primary heading per route.
- Support complete keyboard operation and a visible focus indicator.
- Honor `prefers-reduced-motion`; all content must remain available without animation.
- Keep page zoom and text resizing usable; do not fix essential text to a clipped size.
- Provide useful alternative text for documentary images. Decorative images use empty alt text.
- Do not use color alone to signal health, verification, or warnings.

## Product truth rules

- Missing Destination Health evidence remains unavailable, not a green/yellow/red estimate.
- Source and host records retain their original provenance and verification state.
- External listings show official information/booking links; only verified onboarded hosts with real slots can be booked with MICHI.
- Impact language describes principles unless actual measured data is present.
- Do not show placeholder analytics as operational results.
