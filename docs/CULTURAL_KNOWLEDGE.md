# MICHI Cultural Knowledge

## Purpose and trust boundary

The cultural knowledge system returns retrieved evidence with provenance. Gemini is never the source of truth and is not called to answer cultural questions. The /api/cultural/evidence route returns excerpts and citations only. If the evidence is missing, stale, conflicting or weak, the response says so rather than filling the gap.

Existing Phase 3 cultural summaries were preserved. They were backfilled into the Phase 6 fields with their original source, authority metadata, retrieval date and verification dates. No new tourism pages were imported by this phase.

## Storage model

The cultural_sources table retains its original columns and adds normalized source name, base URL, source type, authority level, verification default, geographic scope, active flag, approved domains and exact approved URLs. Automatic ingestion defaults to disabled. The initial registry includes Japan Tourism Agency, JNTO, Agency for Cultural Affairs, Kyoto Travel, the existing verified Kanazawa source, and an inactive Takayama placeholder.

The cultural_content table stores evidence chunks and links to a source and, for host rules, an experience. It records category, language, exact source URL, canonical URL, authority, scope, time sensitivity, retrieval and verification timestamps, verification status, content hash, reviewer and review note. Full text uses a generated tsvector with a GIN index.

The embedding column uses an unbounded extensions.vector type. No vector dimension is selected in DDL. Each stored vector records its model and actual dimensions. Semantic matching checks both at query time. There is no vector index until a deployment standardizes a model and dimension; semantic retrieval is optional and keyword retrieval continues to work without it.

## Evidence lifecycle

1. An administrator adds or selects a source.
2. The administrator records that the source terms and robots policy were reviewed. This activates the source domain, but it does not activate automatic crawling.
3. The administrator approves one exact URL on that domain.
4. Preview fetches that page only. It checks HTTPS, exact approved hostname, DNS addresses, redirects, robots rules, timeout, response size and content type.
5. Extraction removes navigation and page chrome, retaining headings, paragraphs, lists and quotations. Chunks keep their title and source URL.
6. Text is normalized and SHA-256 hashed. Duplicate source/hash pairs are ignored.
7. Submitted chunks remain inactive and pending_review.
8. An administrator approves, rejects or disables each chunk. Official verification requires an official source type and authority level of at least 3. Host rules can only be community verified.
9. Public retrieval uses active, verified, fresh content under RLS. Admin review can see pending, stale and conflict-flagged records.

Manual entry is available for pages where extraction is unsuitable. Manual entries still require a source and an exact approved URL, and they enter the same review queue.

## Source precedence and deterministic ranking

Evidence retrieval applies contextual precedence before its numeric tie-break score:

1. Experience-specific verified host rule
2. Destination-specific official temple, shrine or museum source
3. Destination-specific municipal authority
4. Destination-specific prefecture authority
5. National government or tourism authority
6. Recognized cultural institution or DMO
7. Other approved source

The numeric score also combines lexical or semantic relevance, scope specificity, authority level, verification and freshness. Exact experience and destination filters prevent a rule for another place or host from entering the result. Heritage designation authority can be declared through metadata.authorityScope = cultural_property_designation and receives a contextual priority override.

Equal-authority conflicts with the same administrator-assigned metadata.conflictKey stay in the result and lower confidence to low; the engine does not choose a winner. Admin review displays those conflicts for resolution.

## Freshness and confidence

Records without a valid verification timestamp are stale. Opening information, festivals and any record marked time-sensitive expire after six hours. Other records expire after 180 days. An earlier next_verification_at also makes a record stale.

Confidence is deterministic:

- High: fresh, verified, authority 4 or 5, and at least half the query terms match. A scoped, community-verified host rule can also be high for its own experience.
- Medium: fresh approved evidence with a relevant match and authority 3 or higher.
- Low: stale or missing verification, pending/unverified status, a conflict, or insufficient relevance.

Embeddings can improve candidate recall but do not change confidence. The API reports each evidence record's limitations and last verification date. Confidence describes evidence quality, not certainty about a traveler's outcome.

## Host rules

An experience update synchronizes its host-supplied rules into evidence only when the experience is published, verified, not paused, and its host has a verified host application. The record is source_type host, verification_status community_verified, and linked to that experience_id. Pausing or unpublishing the experience deactivates its rule evidence. These rules outrank general guidance for that one experience and never become general cultural truth.

## Security and rate limits

Admin pages call requireRole([admin]); admin route handlers repeat an authenticated profile-role check. RLS permits public reads only for active, verified, fresh content and allows management only to administrators. Application logic is not the sole authorization boundary.

Ingestion accepts HTTPS only, exact host allowlisting, public DNS addresses only, pinned DNS results, same-approved-host redirects, robots.txt checks at each redirected page, an eight-second timeout, a 1 MB response cap and HTML/XHTML/plain-text content types. Non-200 robots responses fail closed except 404. CAPTCHA, authentication, paywall and anti-bot behavior are not bypassed.

The database enforces 10 ingestion previews per administrator per minute and 30 evidence requests per hashed requester per minute when the server has its privileged Supabase key. The public role cannot execute the evidence rate-limit RPC or access its table. If the server key is absent, the evidence route uses a process-local limit until production secret configuration is supplied. The rate limit stores a one-way requester hash rather than raw IP.

## Admin routes

- /admin/knowledge: current database counts and recent records.
- /admin/knowledge/sources: source registration, terms/domain approval, exact URL approval, preview, manual entry and source disable/review.
- /admin/knowledge/content: content and provenance catalog, including freshness warnings.
- /admin/knowledge/review: pending, stale and conflict-flagged records with approve, reject, reverify and disable actions.

## Current connected project state

The Supabase project used for the Phase 6 migrations is sjfcwmaceduwdhpdccyh. The migration preserved the five existing cultural content records; all five have a source URL and last verification timestamp. No new source page was ingested in this phase. Existing approved sources have ingestion disabled and no terms-review timestamp, so the workflow correctly requires an administrator to review source access before fetching pages. The Takayama placeholder remains inactive. The current project has no configured embedding provider unless EMBEDDING_PROVIDER=gemini, EMBEDDING_MODEL, and a server-side GEMINI_API_KEY are provided.

## Operations

Before using ingestion in production, sign into an administrator account, open the source registry, inspect the source's terms and robots rules, record that review, approve a specific source URL, preview it, and inspect chunks before staging them. Review staged content and assign accurate category, language, scope, sensitivity and conflict keys. Avoid approving time-sensitive material without a current retrieval timestamp.
