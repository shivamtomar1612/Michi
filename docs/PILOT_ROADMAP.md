# MICHI 12-Week Pilot Roadmap (Proposal)

This is a proposed sequence, not an approved or completed pilot. Timeline begins only after participating destinations/operators consent, an isolated environment is funded, and operational owners are named.

| Weeks | Work | Gate / evidence |
| --- | --- | --- |
| 1–2 | Partner discovery; listen to destination and operator priorities; identify a narrow destination/experience cohort; agree on community consent and data boundaries. | Written participation intent and data-use agreement; no implied endorsement. |
| 3–4 | Onboard willing hosts; verify identity, ownership/authorization, rules, accessibility claims, cancellation policy, and source rights. Configure staging and role accounts. | Admin verification record, staging access review, RLS review, no production demo data. |
| 5–6 | Limited pilot with a small number of real hosts and dated slots. Test discovery, preparation, booking, cancellation, host pause, and support workflow. | Transaction concurrency and role workflow tests; incident and cancellation runbook; participant opt-in. |
| 7–8 | Gather optional traveler/host feedback; review source freshness and conflicts; refine capacity controls and UX with participants. | Sample sizes and missing responses reported; community review meeting. |
| 9–10 | Measure pre-agreed indicators against baseline. Review alternative selection, booking completion, host experience, evidence coverage, and privacy safeguards. | No claims from underpowered or unrepresentative samples; suppress small-cell aggregates. |
| 11–12 | Evaluate outcomes with participating communities; decide whether to pause, revise, or expand. Prepare an evidence report and risk register. | Documented go/no-go and expansion conditions controlled by participating communities and operators. |

## Preconditions

- Isolated Supabase staging project/branch and separate secrets.
- Authorized traveler/host/DMO/admin demo accounts with least privilege.
- At least one genuinely onboarded host and real availability before presenting a MICHI booking.
- Verified and current health inputs before any score or “low pressure” claim.
- Consent-based data collection and aggregation thresholds approved before measurement.
- Gemini quota and API restrictions confirmed before any live AI dependency is included in the demo.

## Pilot principles

Do not scale based on clicks alone. Do not use an operator’s public listing as evidence that the operator joined MICHI. Do not use projected metrics as achieved results. Community and host participants can choose whether the pilot continues and which information is shareable.
