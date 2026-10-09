# MICHI internationalization architecture

## Implementation

- English (`en`) and Japanese (`ja`) are configured with `next-intl` 4 and the Next.js App Router.
- Locale-prefixed routes use `/en/...` and `/ja/...`; `/` redirects to `/en`. API routes and the Supabase auth callback remain unlocalized service endpoints.
- `i18n/routing.ts` is the supported-locale source of truth. `i18n/navigation.ts` exports locale-aware navigation helpers. UI links inside localized pages use these helpers so navigation keeps the selected locale.
- `i18n/request.ts` selects the message catalog, while `app/[locale]/layout.tsx` validates locale segments, sets the document `lang`, and provides messages.
- English and Japanese catalogs are stored in `messages/en.json` and `messages/ja.json`; unit tests enforce namespace/key parity.
- Shared locale-aware formatters are in `i18n/formatters.ts`, with `Asia/Tokyo` as the default time zone.

## Localized product areas

The landing page, public discovery/destination/experience browsing, map controls and list fallback, evidence badges, recommendation controls and explanations, authentication forms, itinerary preference flow, workspace navigation, Destination Health labels, traveler profile, booking list, reflection form, Cultural Passport, and saved itinerary detail use localized UI messages.

Verified source text is not automatically translated in the UI. Source descriptions and cultural guidance remain in their recorded language to avoid changing cultural meaning. They should be accompanied by source language metadata and translated editorial summaries only when a reviewed translation exists. This is particularly important for rules, accessibility, dietary safety, and operator instructions.

## Coverage and review status

Core traveler-facing localization and locale routing are implemented. Some operational host, DMO, and admin content, as well as some data-provided status and server-generated messages, remains English. Do not describe Japanese as a complete translation of every screen until this remaining coverage is addressed.

Automated lint, type checking, unit tests, production build, and route smoke checks passed on 2026-10-09. Fluent Japanese review and assistive-technology review have not been performed and remain human release gates; see `docs/PHASE_15_TEST_REPORT.md` and `docs/JAPANESE_REVIEW_CHECKLIST.md`.

## Adding messages

1. Add the same namespace and key in both catalogs.
2. Use ICU placeholders for interpolated values and keep placeholder names aligned.
3. Keep translations context-aware; do not translate proper names, official source names, or quoted source content without a reviewed translation.
4. Run lint, type checking, unit tests, and the production build.
5. Review the rendered English and Japanese layouts at mobile and desktop widths.
