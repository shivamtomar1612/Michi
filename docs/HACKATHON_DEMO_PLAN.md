# MICHI Hackathon Demo Plan

**Status:** Ready for a truthful, read-only product walkthrough; not ready for a full operational demo.

**Audit date:** 2026-10-09.

**Baseline:** Phase 16 is on `main` at `0c3eadc`; this plan is being prepared on `feature/phase-17-demo-readiness`.

## The story

MICHI asks a traveler to consider the place and the people who welcome visitors alongside personal interests. The demo should show how source-backed discovery, explainable recommendations, cultural context, and host-controlled capacity fit together. It must not imply that those operating capabilities are already live when the corresponding records are absent.

### Five-minute presentation path

| Time | Show / say | Evidence and boundary |
| --- | --- | --- |
| 0:00–0:35 | Set up the tourism problem and MICHI’s thesis: “Travel deeper. Leave lighter.” | Product framing; do not state an achieved reduction in congestion. |
| 0:35–1:15 | Open public Discover, select Kyoto/Kanazawa/Takayama context, explain how the product intends to balance traveler fit and destination readiness. | The three destinations and place descriptions are source-backed. Health evidence and scores are unavailable, so present the honest unavailable state. |
| 1:15–2:05 | Browse a real external Kanazawa craft listing and its provenance, operator link, and unknown availability/accessibility. | Gold Leaf Pasting Experience and two Kutani experiences are informational external listings; no MICHI booking or capacity. |
| 2:05–2:50 | Show the guest itinerary preview and explain the intended generate/compare/save progression. | The public planner route loads. Do not submit it against production during a presentation; generation uses production rate limits and records analytics events. A generated itinerary has not been safely validated against an isolated demo backend. |
| 2:50–3:25 | Show the Cultural Companion entry and Phase 6 evidence design. | Live questions can write pseudonymous analytics and call Gemini; avoid submitting during the production demo. Gemini’s latest verification was quota-limited; do not promise generated answers. Show retrieved evidence or source records only if already visible and verified. |
| 3:25–4:05 | Explain host control, DMO aggregation, and admin provenance review using the architecture/roadmap slide. | No demo role accounts, host operators, MICHI slots, or bookings exist. Protected dashboards must not be impersonated or presented as populated. |
| 4:05–4:35 | Present the evidence-based metrics and pilot measurement plan. | Current counts describe catalogue and instrumented events only; no tourism or community impact has been demonstrated. |
| 4:35–5:00 | Close with the pilot ask: recruit consenting local operators and validate evidence and capacity with the relevant communities. | A proposed next step, not an existing partnership.

## Setup checklist

### Before presenting

- Use a presentation machine with a stable browser and verify `/en`, `/en/discover`, `/en/destinations/kanazawa`, `/en/experiences/kanazawa-katani-gold-leaf`, and `/en/traveler/plan` by GET.
- Keep the app in the public English locale; Japanese public routes also respond, but the full Japanese journey was not manually reviewed in this audit.
- Do not sign in with the existing traveler account. It is not a demo account.
- Do not submit recommendations, itinerary generation, Cultural Companion questions, reflection forms, bookings, or host/DMO/admin actions against production. Those paths may write event, rate-limit, profile, itinerary, booking, feedback, or moderation data.
- Keep browser tabs and presentation content free of local environment values and private account details.
- Use official operator links only as external references. They leave MICHI and may show current terms that differ from the dated catalogue snapshot.
- Have the fallback slides in [DEMO_BACKUP_SLIDES.md](DEMO_BACKUP_SLIDES.md) and this plan available offline.

### To upgrade to a functional end-to-end demo

1. Provision an isolated Supabase project or an approved isolated branch with no production user or booking data. Branch creation has cost/organization implications and was not performed in this phase.
2. Apply reviewed migrations and seed only the checked-in source-backed catalogue. Add explicitly labeled simulated operational scenarios only inside that isolated environment.
3. Create authorized demo accounts for traveler, host, DMO, and admin in that environment, assign roles through a trusted admin path, and store credentials in a private password manager.
4. Verify RLS and access boundaries for all roles, booking capacity transactions, guest rate limits, and analytics writes in that isolated environment.
5. Configure separate staging Gemini and Maps credentials with quotas and referrer restrictions. Confirm current Gemini quota before deciding to use live generation.
6. Run the complete journey in the isolated environment and capture dated screenshots/recording for the fallback. Label every simulated signal and scenario in both the UI and spoken presentation.

## Do not claim

- That MICHI has onboarded operators or booking partners.
- That any listing can be booked through MICHI today.
- That current crowd conditions or destination health are known.
- That recommendations have reduced congestion, improved local income, or increased cultural understanding.
- That Gemini is reliably generating live answers; the latest report recorded HTTP 429 quota exhaustion.
- That the three catalog destinations and operator facts were rechecked on 2026-10-09; the reviewed source snapshot is dated 2026-10-07.

## Current readiness gate

**Presentation/read-only discovery:** usable with limitations. **Role-based end-to-end demo:** blocked until isolated staging and authorized demo accounts exist. **Production launch:** not approved by this demo-readiness audit.
