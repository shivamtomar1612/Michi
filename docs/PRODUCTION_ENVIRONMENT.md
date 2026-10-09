# Production environment configuration

**Status:** Vercel MICHI project and its environment settings are not accessible in the connected account. No variable values were read, copied, or changed.

## Variable names found in `.env.example`

| Variable | Scope | Required/notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-visible | Supabase project URL; must identify the intended isolated environment. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-visible | Publishable/anon key; the app also accepts `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-visible | Alternative publishable key accepted by client helpers. Set only the one required by the deployment configuration. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Privileged key; set only if the current server path needs it. |
| `SUPABASE_SECRET_KEY` | Server-only | Supported server credential alternative; never expose in browser bundles. |
| `CRON_SECRET` | Server-only | Protects the booking reminder cron endpoint. |
| `GEMINI_API_KEY` | Server-only | Cultural explanation generation; latest report records quota exhaustion (HTTP 429), so availability is unverified. |
| `AI_MODEL` | Server-only configuration | Model identifier; no current production generation success has been verified. |
| `EMBEDDING_PROVIDER` | Server-only, optional | Semantic retrieval provider; keyword retrieval works without it. |
| `EMBEDDING_MODEL` | Server-only, optional | Only used when embeddings are enabled. |
| `RATE_LIMIT_SALT` | Server-only, optional | HMAC salt for anonymous cultural evidence limits. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser-visible provider key | Restrict by production/preview origins and required APIs; restrictions and billing are not verified. |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Browser-visible, optional | Google Maps map ID. |
| `NEXT_PUBLIC_APP_URL` | Browser-visible canonical origin | Set to the exact environment-specific origin. |

The variable inventory above is derived from the checked-in template, not from Vercel. Confirm actual runtime usage before configuration. Never store secrets in GitHub Actions, source files, documentation, or `NEXT_PUBLIC_` variables. Keep Preview credentials separate from Production; use a disposable Supabase environment for preview writes and authorized role tests.

## Provider-side readiness still required

- Supabase: correct project, migrations, RLS, Storage, Auth callback/redirect URLs, and leaked-password protection.
- Gemini: server-only key, supported model, quotas, timeouts, cost controls, and successful live generation.
- Google Maps: referrer/API restrictions, billing, APIs actually used, and fallback behavior.

No provider configuration was modified in this phase.
