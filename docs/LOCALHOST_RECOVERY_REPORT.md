# MICHI Localhost Recovery Report

Date: 2026-10-08

## Original problem and root cause

The reported browser error was `ERR_CONNECTION_REFUSED` at `localhost:3000`. At the start of this audit, port 3000 had no listening process. The app was not running, so the browser had no server to connect to. No port conflict or application crash was present at that point.

The repository command is `npm run dev` (`next dev`). It started successfully when the shell was allowed to create Next.js worker processes. The restricted shell first returned `spawn EPERM`; this was an execution-environment restriction, not a MICHI startup error. With worker launch permitted, Next.js 16.4.0 reported `Ready in 5.2s` on the first start, 3.5 seconds after the first production build, and 4.8 seconds after the final build. The server bound to `http://localhost:3000`.

## Evidence and repair

- Node.js: 24.19.0; repository requirement: `>=20.9.0`.
- npm: 11.17.0; `package-lock.json` is present.
- `.env.local` exists and `.gitignore` excludes `.env.*` while allowing `.env.example`. Values were not printed.
- Before startup, no process listened on ports 3000–3002. After startup, direct HTTP requests to `127.0.0.1:3000` returned valid responses.
- Next.js reported that a prior Turbopack internal error had invalidated its filesystem cache. After stopping the project server and verifying the exact path, only `D:\Japan\.next\dev` was cleared. Source, dependencies, credentials, migrations, and user data were left untouched.
- Next.js continues to report a slow filesystem benchmark (282–570 ms). The host identifies `D:` as a fixed local drive, so a network drive is not confirmed as the cause.

## Routes verified over HTTP

Public routes returned HTTP 200: `/`, `/discover`, `/destinations`, `/destinations/kanazawa`, `/experiences`, `/experiences/kanazawa-katani-gold-leaf`, `/about`, `/auth/login`, `/auth/signup`, and `/traveler/plan`. A final post-build smoke check again returned 200 for `/`, `/discover`, `/experiences`, and `/traveler/plan`.

Unauthenticated `/traveler/bookings`, `/traveler/passport`, `/host`, `/dmo`, and `/admin` requests returned HTTP 307 to `/auth/login` with the requested path preserved. Public itinerary preview remained accessible.

The in-app browser rendered the homepage, discovery form, and experience directory. The experience directory showed the actual three external listings and zero participating MICHI experiences from the connected project.

## Files changed

- `proxy.ts` — avoid an Auth network call when there is no Supabase session cookie; protected pages still redirect, and requests with a session still use verified Supabase Auth.
- `lib/auth/redirects.ts` — added a session-cookie name check that recognizes chunked Supabase cookies.
- `server/data/public-catalogue-cache.ts` — added a 60-second Next.js cache for anonymous, RLS-public catalogue reads using only the publishable/anon key. The project URL is part of the cache key.
- `server/data/catalogue.ts` — route public destination, place, and external-listing reads through the bounded cache. MICHI host experiences remain uncached so pause/publish changes are not delayed.
- `app/(public)/experiences/page.tsx` — start the independent places query alongside the listing and destination queries.
- `tests/unit/auth.test.ts` — test Supabase session-cookie detection.

No packages, Supabase schema, RLS policies, production records, or secrets were changed.

## Repository checkpoint limitation

`D:\Japan` has no `.git` directory and `git rev-parse` reports that it is not a repository. Therefore Git status, recent commits, and a Git checkpoint were unavailable. Before edits, a source-only archive was created at `%TEMP%\michi-phase12.5-before-changes.tar.gz` (388 entries). It excludes `.env.local`, `.next`, `node_modules`, and `.git` and includes `.env.example`.

## Remaining limitations

Phase 12 review: the Cultural Passport page fetches achievements and aggregate metrics in parallel; sharing/download behavior is isolated in its client component. No render loop or new compilation issue was found. The authenticated passport view could not be exercised without a traveler test account.

No test traveler/host/DMO/admin credentials were provided. Authenticated dashboards and account mutations were not exercised against the hosted project. The hosted project currently has zero MICHI experiences and zero slots, so a real booking cannot be completed. No booking, account, recommendation-limit, analytics, or Gemini requests were submitted to avoid writing test activity or spending AI quota against the connected project. Browser-level visual checks used the Codex in-app browser; a Playwright suite is not configured in this repository.
