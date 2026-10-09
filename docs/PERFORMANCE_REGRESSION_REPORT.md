# Performance Regression Report — Phase 16

## Measurements made

- Build environment: local Windows checkout, Node 24, Next.js 16.4.0 with Turbopack.
- Unit tests: 23 files / 129 tests; Vitest reported 11.34 seconds test duration and 11.43 seconds module transform time for the run containing the Phase 16 tests.
- Production build: passed with Next.js reporting 78 seconds for optimized compilation, 19.1 seconds for the TypeScript build step, and 2.4 seconds for static page generation (91 routes). These are build-stage timings, not page-load timings.
- Production server: started with Next.js reporting 211 ms readiness after startup. `/en`, `/en/discover`, and `/en/destinations` returned HTTP 200. Response headers `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` were observed on all three.
- Supabase inventory is sparse (one profile, three destinations, zero MICHI experiences/slots/bookings), so production query latency and representative dashboard rendering cannot be meaningfully characterized from current data.
- No authenticated browser performance profile, Lighthouse run, field Core Web Vitals, Gemini latency sample, or Maps billing/API timing was collected.

## Regression observations

The only implementation changes affecting request processing bound input streams before JSON parsing. This caps per-request memory use and rejects oversize requests early. Security response headers add no meaningful client-side JavaScript or render work. No bundle size or route hydration comparison was available for this security-focused phase.

## Limits and follow-up

Do not treat unit transform duration or build-stage timings as page performance. There is no field data for LCP/INP/CLS. Capture baseline and post-change browser traces on a staging deployment with representative inventory, mobile CPU/network throttling, public and authenticated routes, and a permitted Gemini test account. Record p75 field data only after sufficient real traffic exists.
