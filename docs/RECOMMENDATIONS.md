# Responsible recommendations

MICHI has two distinct pathways. `michi_verified` uses a reviewed host listing with a real open slot and sufficient capacity for the selected dates. `external_verified` uses a current sourced operator listing for discovery; it has no MICHI slots, capacity claim, or MICHI booking action. Gemini does not rank either pathway.

## MICHI host score

The original weights remain: Personal Match 25%, Cultural Depth 20%, Local Benefit proxy 15%, Accessibility Match 10%, Availability 10%, Destination Health 20%. A host candidate is excluded if unpublished, unverified, paused, over a known budget limit, outside a requested region, missing confirmed requested access, or lacking an open slot with remaining capacity on the requested dates.

When complete current Destination Health evidence exists, use the full formula. When health is missing, omit its 20% weight and divide the weighted sum of known components by 0.8. Return `destinationHealth: null`, `evidenceCompleteness: 80`, and `recommendationConfidence: partial`. This is a preference fit score, not a claim of low crowd pressure or 80% certainty. Crowd tolerance is omitted from Personal Match when crowd pressure is unknown. Simulated health never contributes to a host score. No arbitrary 50/75/100 substitutes are used.

Availability is derived only from actual open dated slots. Host-led local benefit is labeled a proxy for host participation; it is not a revenue or residency estimate. Verified host authorization is expected to be enforced by the operator application review and booking function in the pending production migration.

## External discovery

External results require a verified published destination, current verified external record, HTTPS official and provenance URLs, and at least one interest term match. Only title, category, and short source-based description contribute to the `interestCompatibility` percentage. This percentage is independent of the six-factor host score and is never presented as verification certainty. Known over-budget prices and out-of-region records are excluded. Any requested confirmed accessibility excludes listings with unconfirmed access. Unknown language, dietary accommodation, price, availability, and health are disclosed, not converted to bonuses. The traveler opens the official operator or booking URL.

The response and private log retain each pathway and source metadata separately. External choices do not use the existing host-only `recommendation_feedback.experience_id` foreign key; accepted/rejected external feedback still requires a separate protected schema path.

## Current production limit

Anonymous hosted reads on 2026-10-08 showed three current external listings and zero public MICHI host listings, slots, or health signals. Protected table totals and Auth users cannot be established until privileged Supabase access is restored. The new host onboarding migration and its server/UI flows have not been applied to the hosted database because the Supabase plugin OAuth refresh failed. MICHI booking must not be advertised until that migration, real host verification, genuine slots, and live transaction tests complete.
