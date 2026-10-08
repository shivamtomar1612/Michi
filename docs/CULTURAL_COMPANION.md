# MICHI Cultural Companion

## Trust boundary

`POST /api/ai/cultural-assistant` validates a small request, rate-limits it, and always calls `retrieveCulturalEvidence()` before any Gemini request. The model receives only ranked evidence, a bounded recent conversation context, and instructions to treat user/evidence text as untrusted. Gemini does not retrieve sources, set confidence, or supply trusted citations.

The server validates the model's JSON response. Citation IDs are intersected with the IDs returned by retrieval, and citation URLs, source names, authority, verification state, and timestamps are reconstructed from the database. Unknown IDs are discarded. If no valid citation remains or output fails validation, MICHI shows retrieved evidence directly. If retrieval finds no evidence, it returns the required abstention sentence and does not call Gemini.

Confidence is the deterministic Phase 6 retrieval confidence. Stale or conflicting evidence always lowers response confidence to `low`, sets uncertainty, and requires current confirmation. Equal-authority conflicts are explicitly surfaced. Model output cannot raise confidence.

## Conversation and privacy

Conversation context is sent with the request and held only in client memory. The client sends at most six short messages (three recent traveler turns) and the API rejects requests above its limits. MICHI does not store questions, answers, or transcripts. A privacy-limited `cultural_companion_question` analytics event stores only an unlinked random event UUID, evidence count, confidence, fallback state, and requested language. No IP address is stored; rate-limit identifiers are HMACs accessible only to a service-role database function and expire after one day. The database keeps a single rolling rate-limit row per HMAC, with a limit of eight requests per minute.

The experience detail page supplies the experience and destination IDs automatically. Retrieval can use Japanese evidence first; if none matches, approved evidence in another language can be retrieved and translated into Japanese. This never relaxes the evidence requirement.

## Gemini configuration

Set `GEMINI_API_KEY` and `AI_MODEL` in a server-only environment such as `.env.local` or the deployment secret store. Never use a `NEXT_PUBLIC_` prefix. The app accepts a Gemini model ID; the generic value `Gemini` maps to `gemini-3.8-flash`. The current development environment was checked against Google's model list and generation endpoint. Gemini failure, missing credentials, timeout, or invalid output degrades to direct retrieved evidence.

## Database change

Migrations `20261008133000_phase7_cultural_companion.sql` and `20261008133500_phase7_rate_limit_retention.sql` add a private rate-limit table and service-role-only rate RPC, with expired rows removed after one day. Migration `20261008134500_phase7_cultural_public_read_policies.sql` separates anonymous catalogue reads from authenticated admin reads so anonymous evidence retrieval never evaluates the admin-role helper. It also adds `cultural_companion_question` to the narrow analytics insert policy. No cultural source or content rows are changed.

## Validation

Unit tests cover sourced answers, unsupported abstention, stale and conflicting evidence, host-specific precedence, follow-up context, Japanese requests, Gemini failure, invalid model output, untrusted citation IDs/URLs, oversized input, keyword query expansion, and confidence preservation. The API uses same-origin checks, Zod validation, request size limits, and `private, no-store` responses.
