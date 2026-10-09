# MICHI deployment guide

**Status:** Deployment not configured or verified. This guide records the intended safe workflow; it does not assert that a Vercel deployment exists.

## Release baseline

- GitHub: [shivamtomar1612/Michi](https://github.com/shivamtomar1612/Michi)
- Production branch expected by the repository: `main`
- Phase 17 baseline reviewed for Phase 18: `52cd0fa9f4ae1315fd57fd659672f39c794dfa60`
- CI for that commit: passed on 2026-10-09 ([run](https://github.com/shivamtomar1612/Michi/actions/runs/37909040004))
- Candidate branch: `release/hackathon-demo` (created from the baseline; not yet deployed)

## Vercel configuration

The connected Vercel account currently lists only an unrelated project named `mind-over-money`; it does not expose a MICHI project. No Vercel project ID, deployment, domain, framework settings, Git connection, deployment branch, or environment-variable configuration for MICHI could be verified. Do not use or alter the unrelated project.

Once the owner connects the intended Vercel team/project through the Vercel integration:

1. Confirm the project is linked to `shivamtomar1612/Michi` and that its production branch is `main`.
2. Confirm Next.js framework detection, repository root, npm package manager, and Node.js 22 runtime (the app requires Node.js `>=20.9.0`; CI uses Node 22).
3. Use the existing `package.json` scripts: install with `npm ci`, build with `npm run build`; do not add a custom output directory.
4. Configure isolated Preview and Production variables using [PRODUCTION_ENVIRONMENT.md](PRODUCTION_ENVIRONMENT.md). Do not copy production credentials to preview or untrusted fork builds.
5. Deploy the candidate to Preview, record the actual URL and deployment commit, then complete [PRODUCTION_SMOKE_TEST.md](PRODUCTION_SMOKE_TEST.md).
6. Request explicit production approval only after the readiness report is complete. This work does not authorize or perform a production deployment.

## Required local checks

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm audit --omit=dev
npm run build
```

Live provider checks are separate from build checks. Follow [the smoke test](PRODUCTION_SMOKE_TEST.md); never use production to create test bookings or role data.
