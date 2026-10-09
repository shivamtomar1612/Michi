# MICHI internationalization architecture

## Current implementation

- English (`en`) and Japanese (`ja`) are configured with `next-intl` 4 and the Next.js App Router.
- Locale-prefixed routes use `/en/...` and `/ja/...`; `/` is redirected by the locale middleware. API routes and the Supabase auth callback remain unlocalized service endpoints.
- `i18n/routing.ts` is the supported-locale source of truth. `i18n/navigation.ts` exports locale-aware `Link`, `redirect`, `usePathname`, `useRouter`, and `getPathname` helpers. UI links inside localized pages must use these helpers so navigation keeps the selected locale.
- `i18n/request.ts` selects the message catalog, while `app/[locale]/layout.tsx` validates locale segments, sets the document `lang`, and provides messages.
- English and Japanese catalogs are stored separately in `messages/en.json` and `messages/ja.json`. `tests/unit/i18n-messages.test.ts` checks namespace/key parity.

## Localized product areas

The landing page, public discovery/destination/experience browsing, map controls and list fallback, evidence badges, recommendation controls and explanations, authentication form labels, itinerary preference flow, workspace navigation labels, and Destination Health labels use localized message catalogs. Auth form redirects carry the selected locale. Shared date, time, number, and JPY formatting is in `i18n/formatters.ts` and uses the selected locale with `Asia/Tokyo` as the default time zone.

Verified source text is not automatically translated in the UI. Source descriptions and cultural guidance remain in their recorded language to avoid changing cultural meaning. They should be accompanied by source language metadata and translated editorial summaries only when a reviewed translation exists. This is particularly important for rules, accessibility, dietary safety, and operator instructions.

## Remaining localization coverage

Phase 15 is not a Japanese translation of every application surface yet. Auth action validation/service errors, booking/reflection forms, itinerary detail and sharing, passport, host, DMO, and admin pages still contain English UI strings. Database-provided status labels and some recommendation explanations may also be English. The Japanese locale must not be represented as complete until those interfaces have been translated and reviewed.

The existing auth callback and API endpoints are intentionally not locale-prefixed. Redirect targets must preserve the initiating locale when returning to UI pages.

## Adding messages

1. Add the same namespace and key in both catalogs.
2. Use ICU placeholders for interpolated values and keep placeholder names aligned.
3. Keep translations context-aware; do not translate proper names, official source names, or quoted source content without a reviewed translation.
4. Run lint, type checking, unit tests, and the production build.
5. Review the rendered English and Japanese layouts at mobile and desktop widths.
