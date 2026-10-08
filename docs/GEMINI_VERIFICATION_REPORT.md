# MICHI Gemini Verification Report

**Verification date:** 2026-10-08
**Environment:** local Next.js production build; connected Supabase project configured in `.env.local`
**Overall:** **PARTIAL — not ready to claim reliable Gemini-backed cultural answers.** The hosted evidence path and safe fallback work, but Gemini quota prevented successful generation during the final end-to-end run.

## Required status summary

| Check | Status | Evidence |
| --- | --- | --- |
| API key configured | **YES** | `.env.local` contains a server-side `GEMINI_API_KEY`; its value was not printed. |
| Authentication successful | **PASS** | Gemini model discovery returned HTTP 200. A real exact-text generation also returned HTTP 200 earlier in this verification session. |
| Configured Gemini model | `gemini-3.8-flash` | The model is now explicit in `.env.local`; no generic alias is used. |
| Model available | **PASS** | HTTP 200 model discovery listed the configured model with `generateContent` support. |
| Real text generation | **FAIL — intermittent** | Exact test text was returned once with HTTP 200. Subsequent structured/live requests returned HTTP 503 and the final exact-text request returned HTTP 429 quota exceeded. The final verification did not pass generation. |
| Next.js endpoint | **FAIL for generated answers** | `POST /api/ai/cultural-assistant` returned HTTP 200, but `fallback=true` during the final run because Gemini generation was unavailable. The route returned retrieved evidence instead of an unsupported answer. |
| Supabase RAG retrieval | **PASS** | Anonymous/RLS query returned 1 active verified cultural record for the test query. The live endpoint returned evidence and citations. |
| Citation validation | **PASS** | Endpoint citation IDs and URLs matched active verified rows in the hosted Supabase catalogue. URLs were server-reconstructed. |
| English support | **FAIL — live generation** | The endpoint produced a safe sourced fallback, not a Gemini-generated English answer, during the final run. |
| Japanese support | **FAIL — live generation** | The endpoint produced a safe source fallback, not a Gemini-generated Japanese answer, during the final run. |
| Missing-evidence handling | **PASS** | The secret-Tuesday-ritual test returned the configured abstention, with no citations and no Gemini answer. |
| Error recovery | **PASS with limits** | Unit tests simulate invalid-key, quota, timeout, malformed output, unsupported citation, and empty-evidence fallback. The live quota failure returned verified evidence rather than a fabricated answer. A full live Supabase-outage simulation was not performed. |
| Security audit | **PARTIAL** | No `NEXT_PUBLIC_` Gemini variables; `.env.local` is ignored; 27 public JavaScript bundles and sampled API payloads contained no configured key. Git history could not be checked because this workspace has no `.git` metadata. The key was provided in this conversation and should be rotated. |
| Lint, typecheck, build, unit tests | **PASS** | `npm run lint`, `npx tsc --noEmit`, `npm run build`, and 83 unit tests passed. |
| `npm run ai:verify` | **FAIL** | The final live run exited nonzero because Google returned HTTP 429 quota exceeded and endpoint responses used fallback. |

## Live cultural cases

| Case | Status | Result |
| --- | --- | --- |
| A — verified cultural information | **FAIL for generation** | RAG and server citation checks passed, but the final answer used the evidence fallback. |
| B — unsupported Tuesday ritual | **PASS** | Abstained without unsupported claims. |
| C — photography policy | **PASS with fixture limitation** | A controlled experience UUID was used because the public catalogue has no host listing. The assistant abstained and directed the user to the operator; it did not apply general etiquette as a venue rule. |
| D — equal-authority conflicting sources | **PASS offline fixture** | Unit test verified conflict detection and explicit uncertainty; no conflict data was written to production. |
| E — wheelchair accessibility | **PASS with fixture limitation** | A controlled experience context had no scoped accessibility evidence; the assistant abstained and did not infer access. |

The English and Japanese request paths are exercised by unit tests, but live generated-language support is **not verified** while provider quota is exhausted. Japanese retrieval may fall back to an approved source in another language; only Gemini can provide the translated explanation, and the final live run did not reach that step successfully.

## Environment and security checks

- `.env.local` exists and has both the Gemini key and model setting.
- `AI_MODEL` is explicitly set to `gemini-3.8-flash` locally.
- `.gitignore` excludes `.env.*` and allows only `.env.example`.
- No `NEXT_PUBLIC_GEMINI_*` or `NEXT_PUBLIC_AI_MODEL` variables were found.
- The key was never printed by the verification script, returned in sampled API responses, or found in the 27 public JavaScript bundles scanned.
- Git history and tracked-file status were not inspectable because `D:\Japan` has no `.git` directory in this environment.
- No knowledge records or production data were modified by these checks.

## Changes made

- Added `npm run ai:verify` in `scripts/ai/verify.mjs`. It loads local configuration without printing values; checks model discovery, exact text generation, Supabase verified retrieval, the built Next.js endpoint, citations, missing evidence, scoped photography/accessibility abstentions, language response shape, public bundles, and response-secret leakage. Failures show sanitized HTTP status/error categories.
- Set `.env.local` to the model ID confirmed by Gemini model discovery; existing local credentials were retained without being displayed.
- Added scoped evidence enforcement so specific photography, accessibility, dietary, hours, transport, and ritual questions cannot be answered from unrelated general records.
- Added one bounded retry for transient Gemini HTTP 503 responses. HTTP 429 quota failures are not retried.
- Added unit cases for missing scoped rules and simulated provider invalid-key, quota, and timeout failures.

## Validation commands

- `npm run lint` — **PASS**
- `npx tsc --noEmit` — **PASS**
- `npm test` — **PASS**, 83 tests across 11 files
- `npm run build` — **PASS**
- `npm run ai:verify` — **FAIL**, final live generation HTTP 429; endpoint safely returned evidence fallback

## Remaining manual actions

1. **Rotate the Gemini API key now.** It was included in the conversation. Revoke it in Google AI Studio/Google Cloud, create a replacement, and update `GEMINI_API_KEY` in `.env.local` and the deployment secret store. Do not paste the replacement into chat or source files.
2. Check the Gemini project’s quota/billing and wait for quota reset, or request the appropriate quota increase. The key authenticated successfully; the final failure was quota exhaustion, not evidence of an invalid key.
3. After rotation/quota is available, run `npm run ai:verify` again. Do not mark Phase 7.1 complete until the structured Next.js endpoint and both English and Japanese live response checks pass.
4. Run a secret scan against the actual Git checkout/history once repository metadata is available; this workspace could not perform that check.
5. For live photography/accessibility host-rule tests, onboard a genuinely authorized MICHI host and publish verified scoped records. No real host experience was available in the public catalogue during this audit, so controlled UUID contexts were used.
