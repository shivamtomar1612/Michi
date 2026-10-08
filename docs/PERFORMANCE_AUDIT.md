# MICHI Performance Audit

Date: 2026-10-08

## Baseline and method

Measurements are local development measurements, not field Core Web Vitals. Initial route timings include varying cold compilation and Supabase network conditions, so percentages across those mixed samples would be misleading.

Before changes, Next.js server logs recorded:

| Route | Observed server time before changes |
| --- | ---: |
| `/` | 3.1–4.3 s |
| `/discover` | 1.5–3.3 s |
| `/destinations` | 0.9–1.5 s |
| `/experiences` | 1.9–3.3 s |
| `/about` | 0.2–0.7 s |
| `/traveler/plan` | 1.1–3.8 s; the first sample included 1.5 s in `proxy.ts` |

After changes, warm Next.js server logs (including both cache hits and refreshes) ranged from approximately 0.34–0.49 s for `/`, 0.59–1.06 s for `/discover`, 0.47–0.99 s for `/destinations`, 0.50–2.10 s for `/experiences`, 0.14–0.62 s for `/about`, and 0.17–0.39 s for `/traveler/plan`. The final experience-page code change measured 1.08–1.60 s in warm samples. An independent HTTP sample returned 200 for public pages and 307 for protected pages. Route variance remains because of Supabase round trips, cache refreshes, and the host filesystem.

Startup was 5.2 s on the first dev launch and 3.5 s on the launch after the production build. After the dev cache was cleared, a cold homepage request took 8.0 s in Next.js logs. Cold route compilation included 4.4 s for the destination detail route and 1.5 s for the external experience detail route. Cold compilation and warm navigation are separate measurements.

The final optimized production build completed successfully: Next.js compilation took 28.9 s, TypeScript took 21.6 s, and static page generation took 3.3 s. An earlier pass took 45 s and 42 s for compilation and TypeScript, respectively. These are build timings, not page navigation timings.

## Confirmed bottlenecks and changes

1. **Repeated remote reads of public catalogue records.** The homepage, discovery, destination, and experience routes read public catalogue rows during server rendering. The hosted database contains 3 destinations, 15 places, and 3 external experiences. Supabase `EXPLAIN ANALYZE` measured the destination query at 0.183 ms, external-experience query at 0.159 ms, and health-signal query at 0.755 ms. SQL execution is negligible compared with the observed application-level wait for remote requests.

   Public destinations, places, and external listings now use a 60-second Next.js data cache with the publishable key under the existing `anon` RLS policies. The cache is project-keyed. It does not use the service-role key. Host experiences, availability, bookings, recommendation results, and Destination Health signals are not cached. This preserves immediate host pause behavior and avoids serving expired health signals.

2. **Auth check on anonymous planner/protected requests.** The proxy previously called `auth.getUser()` on every matched path, including guest itinerary preview requests without an auth cookie. It now redirects a cookie-free protected request immediately and lets the public planner render. Requests with Supabase session cookies still go through the verified session-refresh path. After optimization, warm planner logs showed 7–25 ms in `proxy.ts`; cookie-free host/DMO/admin redirects returned in 10–44 ms.

3. **Independent query unnecessarily waited on other reads.** The experience directory's places query did not need destination data, but was started in a second round. It now starts alongside the independent listing/destination queries.

4. **Development cache and filesystem.** Next.js reported a previous Turbopack internal cache error, so only `.next/dev` was safely cleared and the server restarted. No bundler flags or production build checks were disabled. Next.js still reports a slow filesystem probe (up to 570 ms); the drive is fixed/local, and the host did not expose a more specific filesystem diagnosis.

## Architecture and dependency checks

- Next.js 16.4.0 uses Turbopack for `next dev` and `next build` by default; no unsupported bundler flags were added.
- React and React DOM are 19.3.0; TypeScript is 5.9.3; Tailwind is 4.3.3; `@supabase/ssr` is 0.12.7 and `@supabase/supabase-js` is 2.117.2.
- The root layout is a Server Component. Client components are scoped to interactive features. Google Maps loads only after the user opens a map; the accessible location list is present without it.
- No Recharts or Framer Motion dependency is installed. No remote font import was found. Existing host imagery uses `next/image`.
- The Supabase Performance Advisor reports 57 unused indexes and 8 tables with multiple permissive policies. With the current tiny/early dataset, unused indexes do not establish a hot query, so no indexes or RLS policies were removed or changed.
- Development Node processes reached about 359 MB working set during this audit. No sustained CPU profile was collected, so no CPU conclusion is claimed.

## Remaining performance limits

- A cold development compile can still take several seconds, and the host filesystem warning persists.
- Public data cache entries can be up to 60 seconds old. Source freshness metadata remains part of the displayed records; data is revalidated on expiry.
- Destination Health is deliberately fetched on request because freshness and expiry matter. Remote response latency remains visible on pages that need current health evidence.
- No field LCP, INP, or CLS data exists for this local audit. No Lighthouse result is claimed.
