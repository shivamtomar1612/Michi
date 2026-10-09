---
name: MICHI
description: A considered, evidence-led way to discover Japan.
colors:
  primary: "#963b2b"
  primary-deep: "#793020"
  paper: "#f7f5ef"
  surface: "#fffefa"
  surface-muted: "#efede5"
  ink: "#202b30"
  ink-muted: "#59636a"
  border: "#d9d6cd"
  border-strong: "#aaa69b"
  success: "#536b5c"
  moss-muted: "#778b76"
  indigo-muted: "#536177"
  warning: "#786033"
  danger: "#8a3826"
  information: "#425e6b"
  sage-wash: "#e9ece5"
  paper-warm: "#f0ede5"
  sage-gray: "#e7e9e2"
  card-hover: "#e8e4da"
typography:
  display:
    fontFamily: "Iowan Old Style, Palatino Linotype, Book Antiqua, Yu Mincho, Noto Serif JP, Georgia, serif"
    fontSize: "clamp(3.25rem, 6vw, 6rem)"
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: "-0.055em"
  body:
    fontFamily: "Avenir Next, Avenir, Segoe UI, Noto Sans JP, sans-serif"
  label:
    fontFamily: "Avenir Next, Avenir, Segoe UI, Noto Sans JP, sans-serif"
    fontSize: "0.65rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.19em"
rounded:
  control: "2px"
  panel: "4px"
spacing:
  page-gutter: "clamp(1.25rem, 4vw, 3.5rem)"
  content-width: "1280px"
  section-block: "clamp(4.5rem, 8vw, 7.5rem)"
  button-height: "44px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
---

# Design System: MICHI

## Overview

**Creative North Star: "The Considered Travel Journal"**

MICHI's implemented public experience pairs the calm reading rhythm of a travel journal with the clarity of an evidence-led discovery product. Warm paper, deep ink, restrained vermilion, generous image space, and editorial serif headings make Japan and its places the focus. The traveler discovery journey leads; responsible recommendations are the signature next step, and guest browsing is useful before sign-in.

The current public homepage opens with a documentary Kenrokuen Garden photograph, visible credit, and direct discovery actions, then moves into real destination choices and responsible-travel context. Source status, booking distinctions, and missing evidence are stated where they matter. This document records the frontend system in code; it is not a visual approval of the homepage capture. Host, DMO, and admin dashboards are not represented as redesigned here.

**Key Characteristics:**
- Image-led travel storytelling with place, creator, and license context.
- Warm neutral surfaces and confident, readable ink typography.
- Direct public exploration before account creation.
- Factual states and provenance remain visible in the interface.

## Colors

The palette uses warm paper and natural muted tones around deep blue-green ink; vermilion is reserved for actions, focus, and editorial emphasis.

### Primary
- **Restrained Vermilion** (`{colors.primary}`): Primary actions, links, labels, focus, and selective emphasis.
- **Deep Vermilion** (`{colors.primary-deep}`): Hover and pressed states for primary actions.

### Neutral
- **Warm Paper** (`{colors.paper}`): Main page canvas and public navigation.
- **Soft Porcelain** (`{colors.surface}`): Form fields and reading surfaces.
- **Quiet Paper** (`{colors.surface-muted}`): Section contrast and calm content groupings.
- **Deep Blue-Gray Ink** (`{colors.ink}`): Main text and dark contrast sections.
- **Muted Ink** (`{colors.ink-muted}`): Supporting copy and secondary detail.
- **Soft Divider** (`{colors.border}`): Fine rules and quiet outlines.
- **Firm Divider** (`{colors.border-strong}`): Stronger boundaries where needed.
- **Moss** (`{colors.success}`) and **Muted Moss** (`{colors.moss-muted}`): Positive/source cues and restrained natural accents.
- **Muted Indigo** (`{colors.indigo-muted}`): Secondary map and destination context.
- **Caution Ochre** (`{colors.warning}`), **Brick Error** (`{colors.danger}`), and **Slate Information** (`{colors.information}`): Status roles; pair each with readable text or a non-color cue.
- **Sage Wash** (`{colors.sage-wash}`), **Warm Stone** (`{colors.paper-warm}`), **Sage Gray** (`{colors.sage-gray}`), and **Card Hover Stone** (`{colors.card-hover}`): Existing low-contrast section and hover fills on the public homepage.

**The Evidence Stays Legible Rule.** Color never carries verification, health, warning, or booking meaning by itself; use a text label or accessible icon as well.

## Typography

**Display Font:** Iowan Old Style, Palatino Linotype, Book Antiqua, Yu Mincho, Noto Serif JP, Georgia, serif
**Body Font:** Avenir Next, Avenir, Segoe UI, Noto Sans JP, sans-serif
**Label/Mono Font:** No separate mono face is established; labels use the body stack.

**Character:** The serif system gives place and story headings an editorial voice, with Japanese serif fallbacks. The sans-serif system keeps navigation, controls, and evidence labels direct and readable, including Japanese fallback support. No remote font is required.

### Hierarchy
- **Display** (500, `clamp(3.25rem, 6vw, 6rem)`, 0.96 line-height): The public homepage hero statement.
- **Editorial display** (500, `clamp(3.5rem, 8.4vw, 7.5rem)`, 0.94 line-height): Shared large editorial display utility where used.
- **Section heading** (regular, 1.875rem to 2.8rem, 1.12 line-height): Public section titles, with responsive sizing.
- **Body** (system sans-serif, browser-default base size; common reading copy 0.875rem to 1rem, leading 1.5–1.75): Explanations, navigation, and product details. Keep essential instructions and attribution comfortably readable.
- **Label** (700, 0.65rem, 1.4 line-height, 0.19em tracking, uppercase): Eyebrows and compact section labels; do not use for essential long-form copy.

## Layout

Use a centered editorial content area capped at 1280px with fluid side gutters (`clamp(1.25rem, 4vw, 3.5rem)`). Sections use generous responsive vertical spacing (`clamp(4.5rem, 8vw, 7.5rem)`) and shift from stacked mobile layouts to asymmetric columns and destination grids at wider breakpoints. The public homepage gives its landscape hero the first visual position, keeps its copy and actions in an ivory panel, then introduces region links. Preserve the image subject and readable credit on narrow screens; the primary exploration action remains easy to find. Use rules, type, and whitespace before adding boxes. This describes the implemented public pattern, not a required composition for every surface.

## Elevation & Depth

Depth is mostly tonal and editorial: paper variations, thin rules, image overlays, and occasional low shadows distinguish surfaces. The system includes a restrained floating shadow (`0 12px 32px rgb(32 43 48 / 10%)`) for elevated controls such as the mobile drawer; use it sparingly. The hero uses a small panel shadow, while destination and experience content relies more on crop, tonal contrast, and borders than on floating-card effects.

## Shapes

Controls use nearly square corners (2px); small reading panels use a slight 4px radius. Most destination and editorial content stays square-edged, using borders, image crops, and typography for form. Avoid rounding every content group into a card. Image crops may shape composition, but must not remove place context or visible credit.

## Components

### Buttons
- **Character:** Clear, compact actions with restrained movement and strong focus visibility.
- **Shape:** Nearly square corners (2px), 44px minimum height, 20px horizontal padding, 14px semibold text.
- **Primary:** Vermilion fill and white text; darken on hover.
- **Secondary:** Transparent fill, ink text, and a subtle ink border; the border and background strengthen on hover.
- **Quiet / light:** Text-forward or paper-filled alternatives are available for context-specific actions.
- **Hover / Focus:** A 1px upward hover shift and 200ms state transition; visible 2px vermilion focus ring with offset. Active state returns to rest and slightly compresses. Disabled controls are visibly muted and do not move.

### Inputs / Fields
- **Style:** White surface, subtle ink border, square corners (2px), 48px minimum height, and comfortable horizontal padding.
- **Focus:** Vermilion border and a soft vermilion ring; retain the global visible focus treatment.
- **Labels / errors:** Use persistent labels and explicit error and required status in the surrounding form pattern.

### Navigation
- **Style:** Sticky warm-paper bar with a fine lower rule, compact sans-serif links, and a direct Explore Japan action.
- **Responsive behavior:** Desktop links appear at wide widths; a labeled menu button opens a keyboard-operable side drawer on smaller screens. Keep navigation controls unobscured and provide visible focus.

### Cards / Containers
- **Style:** Destination choices lead with documentary imagery and a readable place name. External experience cards use a quiet tinted title area, fine borders, and compact source/status details.
- **Provenance:** Keep source type, verification status, date, and official destination/booking path understandable. External listings are informational and must not appear MICHI-bookable.
- **Depth:** Prefer tonal panels and rules; card outlines can strengthen on hover without a heavy lift.

### Provenance Labels
- **Style:** Compact, text-bearing badges distinguish verified, unknown, and stale records. A source label uses a moss rule; stale states use a separate warm warning treatment.
- **Behavior:** Keep verification state and freshness textual. Missing dates remain explicitly missing; do not imply a current health reading when evidence is unavailable.

### Photo Credit
- **Style:** Small but readable attribution placed adjacent to the photograph; creator and license link to their source pages.
- **Behavior:** State when the image is cropped for layout. Do not imply endorsement or MICHI partnership.

## Do's and Don'ts

### Do:
- **Do** keep public discovery useful to guests before sign-in.
- **Do** use the verified Kenrokuen image with its adjacent linked creator and license credit; use only verified, attributed documentary imagery for real places.
- **Do** preserve source, verification, freshness, and booking distinctions close to the decision they inform.
- **Do** keep unavailable destination-health evidence explicitly unavailable.
- **Do** honor visible keyboard focus and `prefers-reduced-motion`; make content available without entrance animation.
- **Do** pair status colors with text or accessible icon labels.

### Don't:
- **Don't** use generated concept artwork as factual destination, operator, or activity photography.
- **Don't** present external listings as bookable through MICHI without host authorization and real capacity.
- **Don't** present principles as measured community outcomes or fabricate destination health, inventory, access, or partnerships.
- **Don't** use stereotypical Japanese motifs or generic AI-dashboard styling as visual shorthand.
- **Don't** turn every group of content into a rounded, floating card.
