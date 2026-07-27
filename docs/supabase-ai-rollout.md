# Supabase Auth, Wishlist, and AI Rollout

## Supabase project setup

1. Create or open a Supabase project.
2. In **Authentication > Providers > GitHub**, enable GitHub.
3. Create a GitHub OAuth App with the Supabase callback URL:
   - Hosted: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Local Supabase CLI: `http://localhost:54321/auth/v1/callback`
4. Add the GitHub client ID and client secret in Supabase.
5. Run the SQL migration in `supabase/migrations/`.

## Frontend environment variables

Required for the Vite app:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not expose these in frontend code or Vite env:

```text
OPENROUTER_API_KEY=
TMDB_ACCESS_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=
```

The app reads Supabase config only from `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. Missing values surface as a `SupabaseConfigError`
instead of creating a partially configured client.

## Context-aware AI Picker Edge Function secrets

The `recommend-movies` Edge Function reads:

```text
OPENROUTER_API_KEY=
OPENROUTER_MODEL=inclusionai/ling-3.0-flash:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
TMDB_ACCESS_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

`OPENROUTER_MODEL` and `OPENROUTER_BASE_URL` are optional. The model defaults to
`inclusionai/ling-3.0-flash:free`, while the base URL defaults to OpenRouter's
OpenAI-compatible Chat Completions API.

`TMDB_ACCESS_TOKEN` is a server-side TMDB v4 access token used for keyword
search and Discover. Do not prefix any of these values with `VITE_`.

## RLS assumptions

- `wishlist_items.user_id` and `ai_recommendation_runs.user_id` use Supabase
  Auth user IDs from `auth.uid()`.
- No `profiles` table is required for v1.
- No service role key is required for v1.
- The Edge Function creates a Supabase client with the caller's user JWT and
  anon key so RLS applies to inserts.
- Tables grant only the authenticated role the operations needed by the app.

## Wishlist authority rules

- Signed-out wishlist data stays in localStorage.
- On sign-in, localStorage wishlist and Supabase wishlist merge by movie id.
- When duplicate movie ids exist, Supabase data is treated as the authority.
- After sign-in, Supabase writes complete before the UI updates.
- Write failures preserve the current UI state and show a toast.
- localStorage remains a cache after successful signed-in writes.

## AI fallback behavior

- Signed-in users send one free-text request and locale to `recommend-movies`.
- OpenRouter is called twice with forced tool calling. Zod validates the query
  plan before TMDB and validates selected movie IDs and reasons after TMDB.
- At most two keyword names are resolved through TMDB keyword search. Popularity
  and rating Discover requests run concurrently and build a twenty-movie pool.
- Explicit exclusions, runtime, year, language, and adult filtering are never
  removed. One fallback search may remove inferred include conditions only.
- A failed first model call returns a retryable error. A failed second call
  returns a deterministic merge of the candidates without personalized reasons.
- One ten-second `AbortController` signal reaches every OpenRouter and TMDB
  request. The frontend does not perform hidden retries.
- Signed-out users see a sign-in prompt and do not invoke the Edge Function.

## Recommendation history

- Apply `20260726171508_replace_ai_recommendation_history.sql` before deploying
  the new function. It deletes only legacy `ai_recommendation_runs` rows.
- `EdgeRuntime.waitUntil` writes the validated intent, Discover plan, candidate
  IDs, recommendation snapshots, provider, and model after the response is ready.
- The background task catches its own errors. A failed insert does not change
  the returned recommendations.
- Raw user text, prompts, provider responses, and internal reasoning are never
  persisted.

## Verification commands

Run after implementation changes:

```bash
bun run test:run
bun run lint
bun run build
rg --pcre2 -n "OPENROUTER_API_KEY|(?<!VITE_)TMDB_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY" src
```
