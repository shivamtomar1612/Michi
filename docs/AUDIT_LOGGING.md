# Audit logging

## Storage and access

`public.admin_audit_log` records privileged governance events. RLS is enabled. Authenticated administrators may read through the admin policy; only the server-side service role can insert. There are no client insert policies. A database trigger rejects updates and deletes, including attempts made with the service role. Database-owner maintenance remains outside the application immutability boundary.

## Fields

- `actor_id`: administrator/reviewer profile, or reporter for an appeal event.
- `action`: stable operation key.
- `target_type` and `target_id`: affected record identifier.
- `outcome`: `success`, `denied`, or `failed`.
- `created_at`: database timestamp.
- `metadata`: bounded JSON object (2 KB max) for non-sensitive change facts.

The database rejects selected sensitive metadata keys. Application code also checks metadata keys and size before insertion. Audit metadata excludes emails, phone/address, comments, reflections, passwords, access tokens, keys, cookies, and reviewer notes. Host verification and experience state changes are logged by database triggers in the transaction that changes their state. Report review and appeal events are likewise trigger-recorded. Some other server actions log immediately after the data mutation; those operations surface a warning if audit insertion fails and are not transactionally coupled.

## Events

Events include host application reviews, experience governance state changes, cultural content review, source creation/domain and URL approval/disablement, ingestion preview outcome, content staging, destination edits, invitations, destination access grants/revocations, community-feedback decisions, content-report decisions, and reporter appeals.

The admin UI offers descending timestamp pagination and optional target-type filtering. No full audit history is loaded on the overview page. This phase does not define retention or export; those require an approved governance policy.
