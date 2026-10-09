# MICHI Demo Fallback Plan

Fallbacks must preserve the same truth labels as the live product. Never replace a failure with invented live-looking data.

| Failure | Safe fallback | Say explicitly |
| --- | --- | --- |
| Supabase unavailable | Use the offline slide content and locally captured route screenshots only if the screenshot has a visible capture date and source state. Do not substitute a new mock catalog. | “The live catalog is unavailable; this image is a dated capture, not a current feed.” |
| Gemini unavailable or quota exhausted | Show approved retrieved evidence and its source links if available; otherwise show the abstention state and the Cultural Companion architecture slide. | “Generation is unavailable right now. MICHI does not fill the gap with an unsupported cultural answer.” |
| Maps fails | Keep the location list visible; current catalog has no verified coordinates for markers. | “There are no verified coordinates in this snapshot, so no markers are shown.” |
| Slow network | Stop waiting after the normal page timeout; switch to the documented backup slide sequence. | “This is a live-service delay; the backup describes the same current data limits.” |
| No host or slot | Use the operator’s official information link. Do not show a MICHI checkout, successful booking, or calendar. | “This is an external listing; MICHI does not book it or know current capacity.” |
| Auth failure | Stay in the public guest journey and use the architecture/role-governance slide. Do not use the existing real traveler profile as a shared demo login. | “Role dashboards require authorized accounts in the isolated pilot environment.” |
| No recommendation output | Show the deterministic scoring inputs and evidence boundaries from the architecture slide; do not invent a match percentage or name an unverified low-pressure alternative. | “The current hosted data does not provide the evidence needed for this comparison.” |
| Destination health unavailable | Show the five required inputs and the unavailable status. | “No complete verified health score is available; this is not a live crowd reading.” |

## Offline backup sequence

Use the five text-first slides in [DEMO_BACKUP_SLIDES.md](DEMO_BACKUP_SLIDES.md):

1. Problem and MICHI thesis.
2. Source-backed catalog facts and provenance.
3. Deterministic recommendation and evidence-gated health architecture.
4. Host-controlled participation and current absence of MICHI inventory.
5. Defensible metrics, pilot design, and the next evidence gate.

If screenshots are captured for an event, use only public pages, remove browser/account chrome, record capture date and environment, and avoid user identifiers. Preserve factual content and provenance labels. Do not capture logged-in personal records.

## Recovery checklist

1. Check service status without repeated retries.
2. Switch to the matching fallback; do not switch to production writes to “make the demo work.”
3. State the limitation in plain language.
4. Record which service failed and the presentation time; do not record user question text or secrets.
5. Afterward, investigate in isolated staging and update the demo plan before the next event.
