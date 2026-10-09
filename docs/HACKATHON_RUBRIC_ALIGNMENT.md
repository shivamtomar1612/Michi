# Hackathon Rubric Alignment

The score categories below follow the supplied rubric. This is an evidence map, **not a prediction or guarantee of judging scores**.

| Category | Feature and evidence | Demo moment | Current limitation | Pilot opportunity |
| --- | --- | --- | --- | --- |
| Research — 20 | Curated source registry, provenance fields, freshness and conflict rules; 3 destinations, 15 places, and 3 external listings in the reviewed catalog snapshot. | Show an experience record and its operator source, then explain why an absent health signal stays unknown. | The snapshot was reviewed 2026-10-07; automated broad crawling is not authorized, and no sources were rechecked during this audit. | Validate exact facts and permitted use with selected destination/venue sources and local reviewers. |
| Innovation — 15 | Explainable deterministic recommendation scoring plus evidence-gated health and cultural retrieval. | Explain the candidate/evidence pipeline rather than present unverified scores. | No MICHI host inventory or complete health inputs; current live recommendation generation was not tested against isolated staging. | Test whether transparent evidence and optional alternatives help travelers make a more considered choice. |
| UX and community relevance — 20 | Guest-first public discovery, source labels, external links, accessible list fallback, host-control product model. | Browse public Discover and a Kanazawa listing. | No onboarded hosts or community feedback rows; Japanese routes are reachable but full Japanese QA not performed. | Co-design onboarding and rules with consenting operators and residents. |
| Technical execution — 15 | Next.js App Router, Supabase Auth/Postgres/RLS, server APIs, deterministic services, migrations, and unit tests. Phase 16 CI on main passed. | Use architecture diagram and explain server-side authorization and real booking gate. | No isolated demo accounts/environment; no full Playwright suite configured; live Gemini quota issue remains. | Provision staging, add role-based E2E/concurrency tests, validate failure and recovery paths. |
| Cultural responsibility and trust — 15 | Authority-ranked RAG, source citations, abstention policy, provenance badges, explicit external-booking distinction. | Show the source link and state what remains unknown. | Live Gemini generation last failed from quota exhaustion; no actual host-provided rules exist. | Human-review scoped content with local cultural institutions and authorized hosts; establish correction process. |
| Impact and scalability — 15 | Privacy-aware event instrumentation and DMO aggregation architecture. | Present measured interaction counts and clearly state they are not outcomes. | No health signals, community submissions, bookings, reflections, or demonstrated impact. | Agree baseline, consent, aggregation, and impact definitions before a small pilot. |

## Safe judging language

- Say “designed to support responsible alternatives,” not “has reduced overtourism.”
- Say “three verified external listings in a dated snapshot,” not “three MICHI partners.”
- Say “Gemini can explain retrieved evidence,” not “AI verifies cultural truth.”
- Say “the platform recorded 45 product events,” not “45 travelers” or “45 outcomes.”
- Say “pilot plan,” not “pilot underway.”
