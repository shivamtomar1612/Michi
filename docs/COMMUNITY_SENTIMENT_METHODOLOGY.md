# Community feedback methodology

## Purpose

MICHI collects context from participating hosts and specifically authorized community representatives. Reports are evidence about a contributor's observation, not a representative poll of all residents. MICHI does not use the word “community sentiment” to imply population-wide opinion.

## Who may contribute

- A verified MICHI host may report only for a destination where the host has an experience listing. The record is permanently classified as `host` context.
- A community representative must have an active, administrator-granted `community_representative` assignment for the selected destination. The contributor context is `community_representative`.
- A host or tourism listing is not automatically treated as a community representative. Signup metadata cannot grant contributor authorization.

## Submission and consent

The structured dimensions are visitor pressure, cultural respect, operational strain, local economic benefit, community readiness, and environmental concern. The contributor can select positive, neutral, or concerned; provide an optional 0–100 pressure observation; and add optional context.

Aggregate-use consent is explicit and required. Reports begin in `pending` moderation status and are not included in destination aggregates until an administrator approves them. Existing role checks, destination assignments, and RLS are enforced in the database. One report per account, destination, category, and day is allowed. The submission form advises against personal details; DMO responses never contain narrative text.

## Moderation

An administrator reviews relevance, respectful wording, privacy, and the report's contributor context. Approval requires aggregate consent. Rejected or pending reports do not appear in DMO results. No AI sentiment classification is performed in this phase. A positive/neutral/negative selection remains a contributor self-report, not a model-generated classification or verified factual statement.

## Aggregation and suppression

- Host observations and community-representative reports are aggregated and displayed separately.
- Reporting periods are fixed, UTC calendar months. No arbitrary date ranges are supported.
- The total context cohort must include at least five distinct contributors before the context is marked available.
- Each positive, neutral, or concerned category is independently withheld until at least five distinct contributors appear in that category during the month.
- Average pressure is withheld until five distinct contributors supplied pressure observations. Each contributor is averaged once before the group average is calculated.
- Counts represent distinct contributors, not report rows. No individual category, text, identifier, or user-level feedback is returned.
- Month-over-month comparisons use adjacent non-overlapping calendar months. Suppressed values are never converted to zero.

## Withdrawal and retention

Authors may withdraw their own report. The database function verifies `auth.uid()` against the report author, sets the withdrawn state, clears narrative text and numeric pressure immediately, and removes aggregate consent. It leaves only the minimal report tombstone needed to prevent re-use until scheduled deletion.

Supabase Cron removes reports older than 25 months each day. The retention period leaves room for the dashboard's bounded 24-month calendar history. If the scheduled job fails, administrators must investigate its run history; data should not be treated as deleted until job execution is verified.

## Interpretation limits

- An authorized representative sample is not a random or census sample.
- Contributors may have different incentives, exposure, and definitions of pressure or benefit.
- Counts describe the MICHI platform and the subset that consented, was approved, and met threshold.
- No weighting, extrapolation, or population-level inference is performed.
- Missing, suppressed, or unavailable reports do not imply positive sentiment or no pressure.
- Free-text content is not summarized by Gemini or sent to DMO users.
