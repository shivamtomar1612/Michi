# MICHI release checklist

## Baseline and source control

- [x] Existing repository confirmed: `shivamtomar1612/Michi` (public; push permission verified).
- [x] `main` matches release baseline `52cd0fa9f4ae1315fd57fd659672f39c794dfa60`.
- [x] Phase 17 baseline CI passed ([GitHub Actions run](https://github.com/shivamtomar1612/Michi/actions/runs/37909040004)).
- [x] Phase 13–17 commits are integrated on `main`; current branch is `release/hackathon-demo`.
- [ ] Release candidate pushed and preview deployment created.
- [ ] Preview URL and deployment commit independently verified.

## Build and security

- [ ] Lint, typecheck, tests, dependency audit, and production build pass on release branch.
- [ ] Secret/history scan performed for this checkout and candidate diff.
- [ ] Production and Preview credentials are separate; no privileged secret reaches browser bundles.
- [ ] Supabase RLS, Auth redirects, Storage policies and role boundaries verified in isolated staging.
- [ ] Gemini grounded generation and Maps restrictions verified against live provider configuration.
- [ ] No production test writes, fake operator records, slots, community sentiment, or crowd signals.

## Product verification

- [ ] Guest English and Japanese public journeys verified on Preview.
- [ ] Recommendations, itinerary preview, Cultural Companion, source citations, and external booking links verified.
- [ ] Authenticated traveler, host, DMO and admin workflows verified with authorized isolated accounts.
- [ ] Booking capacity and cancellation tested without production data.
- [ ] Keyboard/mobile/accessibility review and error monitoring completed.
- [ ] Source provenance and real/simulated distinctions preserved.

## Release gate

- [ ] Release readiness report reviewed.
- [ ] Production deploy explicitly approved by the user.
- [ ] Production URL and post-deploy smoke tests recorded.
- [ ] Rollback target and responsible operator recorded.

**Current state:** release is blocked before Preview. The Vercel connector exposes no MICHI project. Production deployment is not authorized or performed.
