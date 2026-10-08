# MICHI DMO metric definitions

All measures are destination-scoped and limited to a fixed UTC calendar month. The dashboard reports **MICHI platform activity**, not all tourism to the place. Suppressed, missing, and unavailable values are not zero.

| Metric | Source and definition | Reporting gate / limitation |
|---|---|---|
| Destination discovery | Distinct short-lived browser session IDs with `destination_viewed` for the destination | At least 5 distinct sessions; not a count of people or total visitors |
| Experience discovery | Distinct session IDs with `experience_viewed` linked to the destination | At least 5 distinct sessions; one session can view multiple listings |
| Recommendation sessions | Distinct session IDs with `recommendation_generated` for the destination | At least 5 distinct sessions; event is recorded after the sourced recommendation/itinerary candidates are returned |
| Alternative consideration | Distinct sessions that chose/considered a responsible alternative | At least 5 distinct sessions; the destination field identifies the alternative being considered |
| Itinerary generation | Distinct sessions whose generated itinerary candidate set included the destination | At least 5 distinct sessions; this is generated-plan activity, not completed travel |
| Confirmed MICHI bookings | Count of confirmed or completed rows in `bookings` whose `created_at` falls in the reporting month | At least 5 distinct traveler accounts; external operator reservations are excluded |
| Recorded booking value | Sum of `total_price_jpy` for the included confirmed/completed MICHI bookings | Same 5-traveler threshold; booking record amount is a proxy, not payment confirmation or realized revenue |
| Active verified experiences | Count of published, verified, unpaused MICHI experiences | At least 5 distinct active host accounts |
| Active host cohort | Distinct hosts with active verified experiences | At least 5 hosts before exact values appear |
| Upcoming slot capacity | Sum of remaining capacity for open slots starting in the reporting month | At least 5 distinct active host accounts; not total destination capacity |
| Slot utilization | Reserved guest places / slot places for active verified experiences in the month | At least 5 distinct active host accounts and nonzero slot capacity |
| Community-representative reports | Sentiment categories and mean reported pressure from approved, consented, non-withdrawn feedback from assigned representatives | Host observations are reported separately. Each sentiment category and pressure average independently requires at least 5 distinct contributors. Self-reported context is not a resident census or verified crowd measurement. |
| Host observations | Same dimensions, limited to verified MICHI hosts associated with the destination | Always labeled host-provided; category-level threshold applies independently |
| Cultural learning | Distinct short-lived sessions with a successful evidence-backed Cultural Companion answer | At least 5 distinct sessions; questions, citations, and transcripts are not returned to DMO |
| Private reflection participants | Distinct traveler accounts with a private reflection tied to a completed booking at the destination/month | At least 5 distinct travelers; reflection content is never selected or returned |
| Passport engagement | Distinct travelers with a deterministic achievement linked to a completed booking at the destination/month | At least 5 distinct travelers; individual achievement details are not returned |
| Destination Health | Existing deterministic score from verified current component evidence, using the existing 30/25/20/15/10 weighting | Shown only when every required current component passes the engine's provenance/freshness checks. Otherwise show available evidence and missing components; no default values. |

## Event semantics

Events are accepted only from a strict event allowlist and a random UUID session ID. The API enforces same-origin requests, a small payload limit, UUID validation, and bounded event-specific metadata. No names, contact details, free-text preferences, or exact movement history are accepted. Event tracking occurs at page mount or explicit user action, not arbitrary React renders. Session IDs live in per-tab `sessionStorage` and are not linked to profile IDs.

- `destination_viewed`: one destination detail view mount.
- `experience_viewed`: one experience detail view mount, linked to its destination and experience.
- `recommendation_generated`: one returned candidate-set action for each destination represented in that set.
- `alternative_considered`: explicit selection of an alternative candidate.
- `itinerary_generated`: returned itinerary candidate set for each included destination.
- `cultural_learning_interaction`: a successful Cultural Companion response with retrieved citations; no question text or answer is logged as this event.
- `destination_health_viewed`, `alternative_shown`, `alternative_selected`, and `popular_destination_retained`: existing Phase 4 interactions.
- Reflections, bookings, and Passport metrics use canonical database records rather than client-submitted analytics events.

## Known coverage gaps

The current hosted data has no MICHI experiences, slots, bookings, current Health signals, or feedback, and the only profile observed was a traveler. Most operational measures will therefore remain suppressed or unavailable until verified operators onboard and genuine activity accrues. The health engine does not infer real-time crowding from static destination popularity. No external booking click is counted as a MICHI booking.
