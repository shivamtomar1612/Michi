# DMO analytics architecture

## Trust boundaries

- `/dmo` is protected by the existing Supabase profile-role guard. A `dmo` role alone does not grant access to a destination.
- `destination_access_assignments` grants a separate destination and access scope. A DMO dashboard only lists active `dmo_analytics` assignments belonging to the signed-in user.
- The browser receives only published destination labels and the JSON returned by scoped aggregate RPCs. It never queries raw bookings, analytics events, reflections, profiles, or feedback comments.
- `dmo_destination_month_metrics` checks `auth.uid()`, the profile's database role, and the destination assignment. `dmo_reflection_month_metric` uses the same checks. Both use fixed calendar months and strict parameter validation.
- The legacy `dmo_destination_metrics()` function is retained only for compatibility and is now assignment-scoped. The previous implementation of the monthly aggregate is renamed to an internal function with execution revoked from API roles; the public wrapper replaces its feedback breakdown with independently suppressed results.
- Admin access changes use `admin_grant_destination_access` and `admin_revoke_destination_access`, restricted to the server service-role client. Server actions separately verify the current admin profile. Granting DMO analytics can promote an existing traveler profile to `dmo` in the same transaction; it cannot create an account or promote a host/admin.

## Data paths

```text
Signed-in DMO
  -> own active destination assignments (RLS)
  -> public published destination metadata
  -> scoped month aggregate RPC (role + assignment checks)
  -> current verified Destination Health evidence (existing engine)
  -> responsive dashboard and table alternatives

Verified host / assigned community representative
  -> server-side role and destination-scope check
  -> consented private report, moderation_status=pending
  -> admin review using the service-role client
  -> approved report contributes only to anonymous aggregates
```

RLS remains enabled. No service-role client is used in browser code. Direct reads of analytics events and feedback remain unavailable to DMO users. Feedback authors can read their own reports and use an author-bound withdrawal function. Withdrawal immediately removes free-text narrative and pressure score, revokes aggregate consent, and retains only a minimal tombstone until the retention job removes the row.

## Reporting and suppression

- A DMO selects one UTC calendar month at a time. Supported months are bounded to the current month and the prior 24 months. Arbitrary date ranges are not accepted.
- Month comparisons are adjacent, disjoint calendar months; there are no custom overlapping filters or arbitrary cohorts.
- Browser engagement metrics use short-lived, random session identifiers. The minimum reporting threshold for these metrics is five distinct sessions; this is a reporting threshold, not a claim that sessions are unique people.
- Booking, host, passport, reflection, and community metrics use distinct traveler, host, or contributor accounts as the relevant cohort. Values are withheld below five.
- Sentiment is released separately by contributor context (host-provided versus authorized community representative) and separately per category. Each reported category requires five distinct contributors. Pressure averages require five distinct contributors who supplied a pressure value.
- These safeguards reduce disclosure risk but do not make published aggregates anonymous in the mathematical sense. MICHI does not expose names, IDs, comments, session IDs, booking references, or individual reflections to a DMO.

## Data and limitations

The dashboard reads canonical MICHI operational data and privacy-limited `analytics_events`. All discovery, itinerary, and cultural-learning events are explicitly collected at a view or action boundary; identifiers remain an ephemeral browser session ID. Booking counts and recorded booking value come from MICHI bookings, not external-booking clicks. Recorded booking value is a platform proxy, not proof of payment, realized revenue, or total local economic impact.

Destination Health reuses the existing deterministic engine and weights. Its score is shown only when all five fresh, suitable, verified components are available. Each available component retains its source and observation metadata. Missing or incomplete evidence produces an unavailable state, never a zero/default score. Current health evidence may be viewed even where there are no operational DMO metrics.

Current audited hosted state before Phase 13 implementation: 3 published destinations, 15 places, 3 verified external experiences, 1 traveler profile, 28 prior analytics events (cultural-companion question events), and no DMO assignments, MICHI host experiences, slots, bookings, health signals, or community feedback. The dashboard is therefore expected to show unavailable/suppressed states until genuine MICHI activity accrues.

No demo or simulated records are included in these DMO data paths. Published tourism catalogue data remains source-backed public information, not MICHI partner inventory.

## Operational notes

- Admin routes: `/admin/dmo-access` and `/admin/community-feedback`.
- Authorized feedback route: `/community/feedback`; hosts also have `/host/community`.
- Community reports are retained for up to 25 months. The `michi-community-feedback-retention` Supabase Cron job deletes expired rows daily. The DMO reporting window is 24 months to preserve complete calendar-month data.
- Run Supabase security and performance advisors after schema changes. Security-definer functions are intentionally used for scoped aggregate/withdrawal operations; grants are explicitly limited and every analytics function validates identity and scope.
- Supabase Cron job history is available in the project's Database Cron dashboard/table.
