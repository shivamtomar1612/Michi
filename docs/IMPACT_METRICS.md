# MICHI Impact Metrics and Evidence

## What is measured now

The 2026-10-09 read-only Supabase audit observed 45 rows in `analytics_events`:

| Event | Count | What it can support | What it cannot support |
| --- | ---: | --- | --- |
| `destination_viewed` | 8 | Recorded destination page-view events | Unique travelers, visitors to the destination, or reduced crowding |
| `destination_health_viewed` | 9 | Recorded views of the health section | Health status, crowd pressure, or dispersion; no signals exist |
| `cultural_companion_question` | 28 | Recorded Companion submissions | Answer quality, learning, or cultural understanding without outcome evaluation |

No `recommendation_generated`, `itinerary_generated`, or conversion outcome appears in the observed counts. Counts may include repeated activity and should not be interpreted as people. The source schema and event behavior should be reviewed before any public reporting.

## Current product inventory, not impact

- 3 source-backed destinations, 15 places, 3 verified external experience records in the reviewed snapshot.
- 0 participating MICHI hosts, 0 MICHI experience slots, 0 MICHI bookings.
- 0 current destination health signals and 0 community feedback records.
- 0 hosted passport achievements and 0 traveler reflections.

These are inventory and evidence-coverage facts. **MICHI has not demonstrated reduced overtourism, improved local income, visitor dispersion, increased host benefit, or improved cultural understanding.**

## Defensible pilot indicators

Agree definitions, consent, comparison periods, and release thresholds with participating communities before collection.

1. **Evidence completeness:** share of recommendations with current, verified evidence for each decision-critical factor. Report denominator, missing fields, source dates, and confidence.
2. **Responsible alternative consideration:** share of eligible sessions where an alternative is shown, selected, or declined. A selection is a product behavior, not proof of destination dispersion.
3. **Local host activity:** number of confirmed and completed MICHI bookings with verified participating hosts; report cancellations separately. Do not equate booking value proxy with host income.
4. **Preparation and reflection:** completion rate for optional cultural preparation and consent-based reflection, plus survey response counts and limitations. Do not infer learning from a click.
5. **Community readiness and feedback:** count and recency of voluntarily submitted, host- or community-linked observations, with aggregation thresholds and suppression for small groups.

## Measurement safeguards

- No precise movement histories or individual traveler exposure to DMO users.
- Distinguish observed official, operator-provided, community-reported, modeled, simulated, and unavailable data.
- Report freshness, source, denominator, missingness, sample size, and uncertainty.
- Define a baseline and comparison method before claiming change; seek community agreement on what success means.
- A demo scenario must be labeled simulated and excluded from production or pilot metrics.
- Do not publish small-cell DMO aggregates that could reidentify a host or traveler.

## Demo statement

“We have instrumentation for product engagement, not measured tourism outcomes. Our first pilot would test whether people consider alternatives, whether verified host experiences can be delivered on host-set terms, and whether participating communities find the reporting useful.”
