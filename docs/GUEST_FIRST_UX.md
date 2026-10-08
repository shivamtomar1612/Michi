# MICHI guest-first experience

## Public routes

These routes render without an authenticated Supabase user:

- `/`, `/discover`, `/destinations`, `/destinations/[slug]`
- `/experiences`, `/experiences/[slug]`, `/about`
- `/traveler/plan` for itinerary generation and preview only
- Public destination health summaries, approved cultural evidence, and external operator links embedded in those pages

The discover page includes the deterministic recommendation form. It sends submitted preferences to the server for the current request; guest preferences are not written to `recommendation_logs` or attached to a fabricated profile. Public catalog queries continue to use the browser-safe Supabase key and database RLS.

## Protected routes

- `/traveler` and saved itinerary detail routes under `/traveler/plan/[id]`
- `/traveler/itineraries`, `/traveler/bookings`, `/traveler/passport`, `/traveler/profile`
- `/traveler/host-application`
- All `/host/*`, `/dmo/*`, and `/admin/*` routes

The Next.js proxy makes an exact exception for `/traveler/plan`; private child routes remain protected. Each protected server page/action also checks the user role, and Supabase RLS remains enabled.

## Guest recommendations and itinerary drafts

The recommendation endpoint accepts an optional authenticated user. Guest requests receive the same deterministic, public-data scoring and provenance fields. The endpoint returns `mode: "guest"` and `logId: null`; it does not write recommendation history. A traveler request continues to write an owner-scoped recommendation log.

The itinerary generation endpoint recomputes current public candidates for guests. It does not trust client candidate IDs as authority, use account logs, create fake IDs, or claim unknown availability. MICHI slots and host eligibility are rechecked before a saved itinerary is written.

Visitors can select, compare, and reorder a local itinerary preview. Only after they press **Save journey** does MICHI store the minimum draft needed for a sign-in handoff in browser `localStorage`; the adjacent copy explains this before storage. The draft expires after 24 hours, is removed after a successful save, contains no credentials, and is revalidated on the server after authentication. The visitor then reviews the restored draft and explicitly chooses **Save this journey**. The draft stays in that browser and is not synchronized between devices.

## Authentication triggers

- Browsing, comparing, source review, external booking links, recommendation generation, itinerary preview, and the Cultural Companion do not require sign-in.
- Saving an itinerary opens a contextual dialog with sign-in, account creation, continue exploring, and forgot-password links. The planner return path is preserved through authentication and email callback.
- A MICHI booking form first displays real open slots. An unauthenticated booking attempt opens a contextual sign-in dialog. External operator links remain direct links and never imply MICHI booking.
- Role-specific dashboards only appear after the server has checked the profile role.

The public header keeps **Explore Japan** as its primary action. Authenticated users see a role-aware account menu; traveler entries link to the protected itinerary, booking, passport, and profile pages.

## Supabase RLS audit and changes

The connected project was identified as `sjfcwmaceduwdhpdccyh` (Michi, active, `ap-southeast-2`). Its reference matches the project reference configured locally. The live policy inspection confirmed:

- Profiles are readable/updatable by their owner only.
- Public destinations require published status, official-tourism data status, verified-official status, a source URL, and verification timestamp.
- Public MICHI experiences require a verified, published, unpaused listing and a verified host.
- Public experience slots are visible only for eligible public experiences.
- Public external experiences require verified provenance.
- Cultural sources/content and destination health signals require active/current approved evidence.
- Recommendation logs are owner-readable and owner-insertable; there is no anonymous insert policy.
- Booking and itinerary data remain authenticated and owner-scoped.

No broad public read policy or RLS bypass was added. Two additive migrations were applied through the Supabase connector:

- `20261008151001_guest_recommendation_rate_limit`
- `20261008151242_guest_itinerary_rate_limit`

They add an RLS-enabled, service-role-only request-limit table and a server-only RPC. A live permission check confirmed `anon` and `authenticated` cannot read the table or execute the limiter function; `service_role` can execute it.

## Security and privacy controls

- Guest preference payloads are Zod-validated and size-limited.
- Guest recommendation requests are limited to 20 per minute per pseudonymous IP hash; guest itinerary generation is limited to 5 per minute. The stored hash expires after one day. Raw IPs and guest preference payloads are not written to this limiter table.
- Cultural Companion guest requests use the existing eight-per-minute Supabase limiter and do not persist questions or transcripts. It stores only pseudonymous session/result metadata.
- Local development falls back to process-local counters. Production fails closed for guest recommendation, itinerary, and cultural-assistant requests if the server-side Supabase service key is missing.
- No service key or Gemini key is sent to browser code.
- Saved itineraries are revalidated against current verified destinations, experience listings, and host capacity on the server.

## Verification results

Verified during this change:

- Lint: pass.
- TypeScript check: pass.
- Unit tests: 95 passed across 14 files.
- Production build: pass after retrying outside the Windows process sandbox.
- Anonymous `POST /api/recommendations`: HTTP 200, `mode: "guest"`, `logId: null`, with real verified external listings and honest unknown availability/health fields.
- Clean unauthenticated browser: `/traveler/plan` opened without redirect, generated a guest itinerary preview, and `/discover` and an external experience detail page opened without sign-in.
- The public `/discover` recommendation form returned three verified external Kanazawa listings with `Availability not integrated` and `Destination Health unavailable` labels; no host slots or health status were invented.
- Guest **Save journey** opened the contextual dialog; its sign-in URL retained `/traveler/plan?restoreGuest=1`.
- A saved itinerary detail URL redirected an unauthenticated browser to sign-in with the original path preserved.
- Guest Cultural Companion answered an unsupported ritual question with the configured abstention, low confidence, and no unsupported cultural claim.
- Live Supabase policy/limiter permissions checked against the connected project.

Not verified end to end: completing login or email-confirmed signup and then saving a restored draft, because no test account credentials were supplied. Protected traveler/host/DMO/admin pages were not tested with authenticated accounts. The repository has no installed Playwright test dependency/configuration, so browser journeys were exercised through the available browser automation session and are not yet committed as a Playwright test suite.

## Manual production action

Configure `SUPABASE_SERVICE_ROLE_KEY` (or the supported server-only `SUPABASE_SECRET_KEY`) in the Vercel production environment, then redeploy. The local `.env.local` currently has neither server key, so local development used the process-local fallback rather than writing rate-limit rows to Supabase. Never add this key as a `NEXT_PUBLIC_` variable. Public discovery does not require it, but production guest recommendation, itinerary-generation, and Cultural Companion APIs now require the server-side limiter key.
