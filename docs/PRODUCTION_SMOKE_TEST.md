# Preview and production smoke test

**Status:** BLOCKED — no MICHI Vercel Preview or Production URL is available from the connected Vercel account. Do not mark a route as passed based on local build output.

Record the target URL, deployment ID, commit SHA, environment, date, tester, and whether the backing Supabase project is isolated before running this checklist. Use only authorized test accounts and non-destructive actions.

| Area | Check | Result |
| --- | --- | --- |
| Availability | HTTPS root responds and assets load | BLOCKED — no deployment URL |
| Public journey | Home, Discover, destinations, experiences, source links | BLOCKED |
| Internationalization | English/Japanese route switch and content | BLOCKED |
| Planning | Guest recommendation and itinerary preview | BLOCKED; must use isolated backend to avoid production writes |
| Cultural Companion | Retrieval, citations, abstention, Gemini response | BLOCKED; latest live Gemini report records HTTP 429 quota exhaustion |
| Maps | Map loads or accessible list fallback works | BLOCKED; provider restrictions/billing unverified |
| Authentication | Signup, callback, login, recovery, logout | BLOCKED — no deployment/Auth redirects verified |
| Traveler | Saved itineraries, booking list, passport privacy | BLOCKED — authorized isolated test identity required |
| Booking | Slot availability, confirmation, cancellation, capacity | BLOCKED — no real MICHI slots exist in the audited catalogue |
| Host | Experience/slot controls and rule provenance | BLOCKED — no real host account or inventory |
| DMO | Aggregation and privacy boundaries | BLOCKED — no authorized DMO test account |
| Admin | Verification/moderation authorization | BLOCKED — no authorized admin test account |
| Errors | Provider outage, empty data, unauthorized requests | BLOCKED |

After Preview exists, execute all checks there first and preserve sanitized evidence. Do not exercise write flows against production unless a specific safe production test has been approved and isolated from real users.
