# MICHI Development Setup

## Requirements

- Node.js 20.9 or newer (audited with Node.js 24.19.0)
- npm (audited with npm 11.17.0)
- `package-lock.json` is the dependency lockfile.

## Configuration

Create `.env.local` from `.env.example` and fill only the services needed for the route you are testing. Keep the file private; `.gitignore` excludes `.env.local` and other `.env.*` files.

Common local values are:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
AI_MODEL=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAP_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never put server secrets in a `NEXT_PUBLIC_` variable. Public discovery uses the anon/publishable key and RLS. A service-role key is server-only and is needed only for protected operations such as shared rate limits.

## Start and check localhost

From `D:\Japan` in PowerShell:

```powershell
npm ci
npm run dev
```

Keep that terminal open while using [http://localhost:3000](http://localhost:3000). Next.js normally uses port 3000 and may select another port if it is occupied; use the URL printed by the server. To require port 3000 explicitly, run `npm run dev -- --port 3000`.

Check the homepage:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/
```

Expected result: HTTP 200. `/discover`, `/destinations`, `/experiences`, `/about`, `/auth/login`, `/auth/signup`, and the public `/traveler/plan` preview should also return 200. Private traveler and role dashboards should redirect to sign-in when unauthenticated.

## Troubleshooting

- **Connection refused:** confirm the dev terminal is still running and reports `http://localhost:3000`; the app is not available after its dev-server process exits.
- **Port occupied:** inspect the listener before stopping anything. Stop only a process you have confirmed belongs to this MICHI checkout.
- **`spawn EPERM` in a restricted automation shell:** the shell may block Next.js worker processes. Run the command in a normal local PowerShell terminal; do not change application code to work around the shell restriction.
- **Missing Supabase configuration:** check variable names in `.env.local`, restart the dev server after editing it, and do not paste secret values into logs or chat.
- **Slow first load:** Next.js compiles App Router modules on first access. Later requests should be faster. MICHI also waits for remote, current Supabase data on pages that need it.
- **Turbopack cache error:** stop the MICHI dev process with Ctrl+C. Only if Next.js reports a cache problem, verify and clear `D:\Japan\.next\dev`, then restart. Do not delete source files, `.env.local`, `node_modules`, migrations, uploaded assets, or data.
- **Map unavailable:** the sourced location list remains usable; Google Maps loads only when opened and requires the configured browser key and Maps APIs.

## Useful checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

The repository does not currently configure a Playwright test suite. Use the browser workflow for visual checks and the existing Vitest unit suite for logic regression tests.
