# MICHI 3–5 Minute Demo Script

**Recommended duration:** 5 minutes. This script is intentionally truthful to the current hosted data.

## 0:00–0:35 — The problem

“Travel platforms are good at helping people find popular places. MICHI starts with another question too: what kind of experience fits this traveler while respecting the place and the people who welcome visitors? Our principle is: *Travel deeper. Leave lighter.* We are building responsible discovery and cultural exchange, not another chatbot that invents an itinerary.”

## 0:35–1:15 — Discover with context

Open **Discover**. Point out Kyoto, Kanazawa, and Takayama, the source labels, and the date attached to catalogue review.

“These are three destinations in our reviewed catalogue. MICHI keeps visitor pressure and destination health unavailable unless it has current, verified evidence. Today the hosted project has no complete destination health signals, so we do not show a crowd score or pretend a forecast is live.”

## 1:15–2:05 — Real experience, honest limits

Open **Gold Leaf Pasting Experience**.

“This is a real, source-backed operator listing in Kanazawa. The listing links to the operator’s information page. MICHI has not onboarded this operator, so this is not a MICHI booking. Availability is not integrated, and accessibility remains unverified. Those unknowns are visible instead of guessed.”

If the official link is opened, explain that it leaves MICHI and the operator controls its current information. Do not claim affiliation or endorsement.

## 2:05–2:50 — Planning concept

Open the public itinerary planner and explain its eight-step preference flow, guest preview, local reorder/compare controls, and account prompt for saving.

“The intended flow scores eligible database records deterministically first. Gemini can only organize supplied candidates; it cannot create an experience. We have not run this live flow against an isolated demo backend today, because the production request can consume rate-limit capacity and emit activity events. I’m showing the planner interface and architecture, not claiming a generated plan from this session.”

## 2:50–3:25 — Cultural evidence

Point to the Cultural Companion on the experience page and the source/evidence section. Do not submit a live question against production.

“Cultural answers are designed to start with approved evidence. When evidence is missing, stale, or conflicting, MICHI must say so. The last recorded Gemini verification found the key authenticated, but live generation hit quota exhaustion; an answer-generation guarantee would be inaccurate. The product can use retrieved evidence as a fallback.”

## 3:25–4:05 — Community and destination operations

Use the architecture overview slide rather than signing into an existing account or opening an unpopulated protected dashboard.

“Hosts should control their rules, visibility, and capacity. DMO reporting is intended to be aggregated and privacy preserving. The hosted project currently has no MICHI host listings, slots, or bookings, and there are no authorized demo role accounts. Those are pilot setup requirements, not hidden success stories.”

## 4:05–4:35 — Evidence and impact

“The catalogue currently contains three destinations, 15 places, and three verified external listings in a reviewed snapshot. The recorded events are product instrumentation: destination views, health views, and Companion questions. These counts are not visitor counts and do not prove dispersion, community benefit, or reduced overtourism.”

## 4:35–5:00 — Close

“Our next step is a small, consent-led pilot: onboard willing operators, verify the source and booking rules with them, and agree with destinations what useful, privacy-safe outcomes look like before measuring impact. MICHI should grow only where communities want to participate.”

## Shorter 3-minute version

Use the first 35 seconds for the problem, then show Discover for 35 seconds, the Kanazawa listing for 40 seconds, the evidence/health limitations for 30 seconds, and close with the pilot ask for 40 seconds. Skip planner and Companion interaction unless a verified isolated demo environment has been prepared.
