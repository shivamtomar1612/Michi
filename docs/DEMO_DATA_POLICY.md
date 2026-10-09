# MICHI Demo Data Policy

## Current hosted snapshot (read-only audit, 2026-10-09)

The connected Supabase project is the MICHI project `sjfcwmaceduwdhpdccyh`. This phase used it only for reads. Counts observed:

| Data | Count | Permitted demo description |
| --- | ---: | --- |
| Profiles | 1 | One existing traveler account; not a demo identity. Do not use or expose it. |
| Published destinations | 3 | Kyoto, Kanazawa, Takayama; the reviewed source snapshot was checked 2026-10-07. |
| Places | 15 | Source-backed catalogue records; no verified coordinates are currently available for map markers. |
| Verified external experiences | 3 | Real Kanazawa operator listings, informational only; source check date 2026-10-07. |
| MICHI host experiences | 0 | No host-participating inventory. |
| Experience slots | 0 | No MICHI availability to book. |
| Bookings | 0 | No MICHI bookings. |
| Destination health signals | 0 | No current verified health score or crowd evidence. |
| Cultural sources/content | 6 / 5 | Approved source registry and concise evidence summaries; freshness remains record-specific. |
| Community feedback | 0 | No community sentiment evidence. |
| Passport achievements | 0 | No earned achievement in the hosted data. |
| Traveler reflections | 0 | No reflections. |
| Analytics events | 45 | 28 Companion-question, 9 health-view, and 8 destination-view events. Event counts are not unique people or tourism outcomes. |

The product also contains **one local static passport illustration** (`Respectful Explorer`), marked as a demo example. It is not a hosted achievement, completed experience, real traveler outcome, or proof of impact.

## Truth labels

- **Verified official / operator:** summarize only the exact reviewed record and preserve its source and review date. The 2026-10-07 review is not a claim of rechecking on demo day.
- **MICHI verified host:** none currently.
- **Availability:** external operators’ availability is not integrated; MICHI slots do not exist.
- **Destination Health:** unavailable. Do not infer pressure, capacity, community readiness, access, or seasonal suitability.
- **Simulated:** only the single static passport illustration is currently present; it is clearly marked. No simulated operational signals are present in the hosted project.
- **Analytics:** instrumentation activity only; no personal movement history or outcome claims.
- **AI:** Gemini can explain retrieved evidence but cannot provide an independent cultural source. Latest recorded live verification hit quota exhaustion.

## Demo environment rules

1. Keep all presentation interactions against the hosted production catalog read-only.
2. Do not create or modify production profiles, roles, host applications, experiences, slots, bookings, itineraries, feedback, knowledge records, or analytics to stage a demo.
3. Do not use the existing traveler profile as a shared demonstration account.
4. Do not place passwords, reset links, service credentials, or API keys in Git, screenshots, slides, browser URLs, or this repository.
5. Create role accounts and simulated operational records only in an isolated staging project/branch after it is approved and provisioned. Keep staging secrets in a secret manager and simulated labels persistent in the UI.
6. Never fabricate an operator, partnership, host authorization, booking, visitor count, sentiment, capacity value, or impact result.
7. If the staging environment is unavailable, use the static explanatory slide content in [DEMO_BACKUP_SLIDES.md](DEMO_BACKUP_SLIDES.md), not fake application output.

## Provenance

The catalog snapshot and policies are documented in [REAL_DATA.md](REAL_DATA.md). The hosted records were applied from a reviewed snapshot; this audit did not re-fetch each source site. The external records are Kanazawa Katani’s Gold Leaf Pasting Experience and two Kutani Kosen Kiln experiences. Each page displays an operator-source link and identifies it as an external listing without MICHI booking.
