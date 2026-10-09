# Phase 15 test report

## Engineering changes covered

- English and Japanese route configuration and message catalogs.
- Locale-preserving navigation for localized route links.
- Localized public discovery and recommendation surfaces, authentication form labels, itinerary preference flow, shared workspace navigation, and Destination Health UI labels.
- Locale-aware date, time, and currency formatting.
- Message-catalog parity and formatter unit tests.

## Automated results

Results are recorded after the final validation run. Do not treat a successful unit-test suite as proof that every route is translated or that Japanese copy is culturally reviewed.

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 21 test files, 123 tests |
| `npm run build` | PASS — Next.js 16.4 production build; 91 pages generated; clean compile took 62 seconds |
| English/Japanese route smoke checks | PASS — `/en`, `/ja`, discovery, destinations, experiences, itinerary, login, and signup returned 200; `/` locale redirect and protected `/ja/host` redirect verified |
| Japanese server-rendered copy | PASS — landing, itinerary, and auth headings present in Japanese HTML |
| Locale-aware protected redirect | PASS — unauthenticated `/ja/host` redirects to `/ja/auth/login` |
| Git diff whitespace check | PASS |
| Assistive-technology review | Not performed |
| Fluent Japanese review | Not performed |

## Known coverage limits

Auth action validation/service errors, booking and reflection workflows, itinerary detail/share pages, Cultural Passport, and several host, DMO, and admin pages still contain English UI. Some dynamic labels and backend-generated messages may also remain English. Source-authored records intentionally remain in their supplied language. Full bilingual release acceptance is not met until these areas are translated or clearly reviewed and the Japanese copy receives fluent human review.
