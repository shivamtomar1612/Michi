# Destination Health

MICHI calculates Destination Health on the server from five current, verified observations:

```text
score = 0.30 * (100 - crowdPressure)
      + 0.25 * remainingCapacity
      + 0.20 * communityReadiness
      + 0.15 * transportAccessibility
      + 0.10 * seasonalSuitability
```

Scores are rounded to one decimal place. Status thresholds are Healthy (80–100), Good (60–79), Moderate Pressure (40–59), High Pressure (20–39), and Critical Pressure (0–19). Crowd pressure is an inverse factor; all other inputs are higher-is-better. Each value needs its own HTTPS source URL, source name/type/authority, observation timestamp, verification timestamp, truth category, and explicit live/snapshot/simulated mode. Any missing, stale, unverified, malformed, or out-of-range input leaves the whole score unavailable.

The `destination_health_signals` table is separate from the destination catalogue. It has no seed rows. Public reads require a verified, unexpired observation and a published, source-backed destination; only server/admin ingestion paths may write. Simulated input, if ever introduced for an explicitly authorized demonstration, is labeled Simulated and cannot be presented as live.

Alternative scoring is deterministic: 20% traveler-interest Jaccard match, 20% sourced cultural-relevance score, 10% geographic feasibility, 15% remaining capacity, 10% accessibility, 15% community readiness, and 10% destination health. Geographic feasibility decreases linearly from 100 at the preferred destination to 0 at 300 km. The engine refuses to rank candidates without the preferred destination's verified coordinates, non-empty traveler interests, and complete candidate evidence. A nudge never prevents a traveler from continuing with the preferred destination.

Phase 4 analytics use only the four named event types, a per-tab random UUID, and destination IDs. The endpoint rejects unknown fields, limits payload size, checks same-origin requests, and never records precise movement or traveler profile data. DMO reporting must aggregate these events and must not expose individuals.

The configured Supabase project has the health schema applied, but `destination_health_signals` contains no records. No health score or alternative ranking is available until all required factors have current, verified evidence. The destination comparison deliberately displays an evidence-unavailable state and always lets a traveler continue with the selected destination. The ranking function is deterministic and covered by unit tests; the current catalogue does not provide traveler interests, verified destination coordinates, or candidate cultural relevance, accessibility, capacity, and community evidence needed to produce real ranked alternatives. No crowd or capacity signals are simulated.

The server rejects missing, malformed, unverified, stale, future-dated, or out-of-order component provenance. A simulated truth category cannot be accepted with a live or snapshot mode. If current verified crowd evidence indicates high pressure, the UI provides a responsible nudge even when there is not enough evidence to name an alternative.
