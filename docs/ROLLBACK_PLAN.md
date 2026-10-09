# MICHI rollback plan

**Release state:** No Vercel deployment was created or changed during this phase. No prior stable Vercel deployment could be identified from the connected account.

## Before any production release

Record the current production deployment ID and URL, prior known-good deployment, release commit, operator, and timestamp in the release record. Confirm Vercel's redeploy/rollback controls for the connected project and ensure the previous deployment is retained.

## Trigger conditions

- Production errors, failed health checks, or authentication/authorization regression.
- Cross-user data exposure, booking-capacity integrity failure, or secret exposure.
- Core public discovery unavailable or critical route failure.
- Material regression in page performance or integrity of cultural citations/provenance.

## Recovery

1. Stop further promotion and capture deployment ID, commit, timestamps, and sanitized error details.
2. In the correct Vercel project, use its dashboard/API to promote the previously verified deployment or redeploy its exact commit. Confirm the target project and production branch before acting.
3. Verify root, public discovery, authentication redirect, and protected access after rollback.
4. If a database migration contributed, do not assume code rollback reverses it. Follow a reviewed, additive forward fix or an explicitly approved database recovery plan; preserve user/booking data.
5. Record the incident, impact, and recovery in the release log. Rotate any exposed credential through its provider.

No rollback target or response time can be promised until the actual Vercel project and prior production deployment are identified. Never use force-push or destructive database rollback as a release recovery shortcut.
