# MICHI source-backed tourism catalogue

Phase 3 introduces a curated, provenance-preserving public catalogue. The records are concise summaries and normalized facts, not copied articles. The source URLs are retained per record. Images are not copied or hot-linked, missing coordinates and venue facts remain unknown, and third-party experiences remain informational links that MICHI cannot book.

## Data boundaries

- `destinations`, `places`, and `external_experiences` contain reviewed, source-backed discovery data.
- `data_sources` is the initial approved domain registry. An active source allows only explicitly selected records; it does not authorize crawling.
- No simulated destination signals are created or displayed in this phase. Missing crowd, capacity, community, and transport readings remain unavailable.
- Phase 2 `experiences` and `experience_slots` remain MICHI host-owned booking inventory. External listings are never copied into those tables.
- `cultural_sources` and `cultural_content` contain short cited guidance summaries for later evidence retrieval.

Every published imported row must have a source registry foreign key, exact `source_url`, `canonical_source_url` where applicable, publisher/type/authority, retrieval and verification timestamps, verification state, and data truth category. `content_hash` supports change detection. Time-sensitive facts such as prices receive a shorter seven-day review interval; other snapshot records receive 180 days. Expired records are stale and should not be represented as current.

## Approved source registry

The initial allowlist is limited to exact HTTPS hosts. Source precedence is context-specific: a venue/operator for its own current rules; city/prefecture tourism for local visitor guidance; national government for national policy and official heritage designations; JNTO for national travel context. A general source never overrides a more specific venue rule.

| Source | Scope and intended use | Phase 3 state |
| --- | --- | --- |
| `japan.travel` (JNTO) | National travel, customs, responsible travel | Individually reviewed; robots root access checked |
| `mlit.go.jp` (Japan Tourism Agency) | National tourism policy and responsible travel | Individually reviewed; automated fetch disabled pending terms/robots review |
| `bunka.go.jp` (Agency for Cultural Affairs) | Official cultural-property status and heritage context | Individually reviewed; automated fetch disabled pending terms/robots review |
| `kyoto.travel` (Kyoto Travel) | Kyoto city discovery and responsible travel | Individually reviewed; automated fetch disabled pending terms/robots review |
| `global.kyoto.travel` | Kyoto congestion forecast service | Link-only; no supported MICHI data interface verified |
| `visitkanazawa.jp` (VISIT KANAZAWA) | Kanazawa discovery and thoughtful travel guidance | Individually reviewed; terms prohibit content/image republication; automated fetch disabled |
| `ishikawatravel.jp`, `hot-ishikawa.jp`, `pref.ishikawa.lg.jp` | Ishikawa regional and government information | Registered but not yet reviewed for ingestion |
| `hidatakayama.or.jp` (Hida Takayama Official Tourism Guide) | Takayama place and destination information | Individually reviewed Japanese pages; automated fetch disabled pending terms/robots review |
| `hida.jp` (Takayama City) | Municipal visitor notices and city information | Registered and reviewed as official; no records imported in this snapshot |
| `visitgifu.com` | Gifu regional discovery | Registered but not yet reviewed for ingestion |
| `kutanikosen.com`, `www.k-katani.com` | Operator-specific activity descriptions and current terms | Linked from official Kanazawa tourism listing; source pages reviewed; automated refresh disabled pending terms/robots review |

The registry is neither a crawling mandate nor evidence of endorsement/partnership. Do not classify TripAdvisor, social content, personal blogs, Wikipedia, or reviews as verified cultural truth.

## Current snapshot

The curated seed contains three destinations (Kyoto, Kanazawa, Takayama), official place records selected from their city tourism guides, three Kanazawa operator listings, and five concise guidance summaries from JNTO, Japan Tourism Agency, Agency for Cultural Affairs, Kyoto Travel, and VISIT KANAZAWA. It intentionally does not provide coordinates, live crowd readings, MICHI booking capacity, accessibility claims, venue opening hours, or copied source photography where those facts were not verified and cleared for use.

Kyoto congestion forecasts and Kanazawa comfort maps are external official links only. MICHI has not verified a supported data API for either service, so no crowd values are imported or displayed.

## Hosted catalogue verification

On 2026-10-08, the authenticated Supabase connector applied the three checked-in migrations to the configured project and imported this reviewed snapshot. The hosted Data API returned 3 destinations, 15 places, and 3 external experience listings. The database integrity query found no missing provenance and no external listing with MICHI booking enabled. `destination_health_signals` remains empty; no crowd or capacity values were seeded.

The checked-in snapshot was reviewed on 2026-10-07. Importing it does not recheck source pages, robots rules, or terms on the import date. The local CLI commands `npm run data:ingest` and `npm run data:verify` require a CLI project link and token; in this run, the same checked-in SQL was applied and verified through the authenticated Supabase connector because the CLI session was not linked. The repository source validator checks HTTPS and exact-host allowlisting only; it does not verify robots or terms.

## Refresh and review workflow

1. Select explicit source URLs and verify ownership, page availability, robots instructions, terms, and any API/feed option.
2. Prefer official APIs or datasets. Do not bulk crawl, bypass controls, or download restricted content. Disable automated retrieval where policy review is incomplete.
3. Normalize using the Zod-backed source normalizers. The exact host allowlist and HTTPS requirement are enforced in `lib/data-sources/registry.ts`.
4. Keep original language and exact URL, normalize only identity/deduplication URL, and do not fill absent fields by inference.
5. Review duplicates, conflicts, changes, stale fields, copyright/usage, and publication threshold before applying an updated snapshot.
6. Run source validation and database integrity verification after importing.

Commands:

```sh
npm run data:validate-sources
npm run data:ingest
npm run data:verify
```

`data:ingest` applies only the checked-in curated snapshot through the linked Supabase CLI. It does not fetch pages from the web. The current review is manual, and the current seed is a dated snapshot; do not rerun it to imply the sources were reverified today. Conflict behavior preserves existing place/listing records for manual review. The SQL verification query reports missing provenance, forbidden external MICHI booking flags, and simulated-signal category violations.

Before publishing new venue-specific rules or time-sensitive values, re-review the exact underlying venue/operator page and refresh its provenance timestamps. Never treat a cached snapshot as current solely because an import command succeeded.
