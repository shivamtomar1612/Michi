# Moderation workflow

## Content reports

Authenticated travelers, hosts, DMOs and admins can report a public destination, place, external experience, MICHI experience, or cultural content record. The server action validates UUIDs, target type, reason and a 10–1200 character explanation. The database checks that the target is currently eligible for public reporting, limits each account to ten reports in a rolling 24-hour window, and prevents duplicate open reports on the same item.

The reporter may read their own report and request one reconsideration after resolution or dismissal. New reports begin as `pending`; an administrator may mark them `under_review`, `resolved`, or `dismissed`, using a reason code and optional private note. The item is not automatically removed. Review decisions and appeals are audit logged. Internal notes are not returned to reporters or DMO users.

## Community feedback

The existing Phase 13 queue remains separate. Community feedback requires consent and appropriate host/community-representative authorization. Only approved, consented, non-withdrawn reports can affect aggregates. Narrative feedback and contributor identity remain private.

## Cultural knowledge

The existing `/admin/knowledge` workflow reviews exact evidence, provenance, source access terms, freshness, and conflicts before publication. Equal-authority conflicts require human review. Disabling a record preserves its evidence record rather than deleting it.

## Reconsideration and retention

Reporter reconsideration attaches to the original report and does not create a new moderation decision. Reports are retained in the database for audit and follow-up; this phase does not define a deletion schedule. The report queue is accessible only to admins; each reporter can view only their own submissions. No report details are sent to DMO analytics.
