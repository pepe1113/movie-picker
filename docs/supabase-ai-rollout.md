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
OPENAI_API_KEY=
TMDB_ACCESS_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=
```

The app reads Supabase config only from `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. Missing values surface as a `SupabaseConfigError`
instead of creating a partially configured client.

## Context-aware AI Picker Edge Function secrets

The `recommend-movies` Edge Function reads:

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
TMDB_ACCESS_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

`OPENAI_MODEL` and `OPENAI_BASE_URL` are optional. The model defaults to
`gpt-4o-mini`, while the base URL defaults to OpenAI's Chat Completions API.

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

- Signed-in users send one free-text request, locale, and required `media_type`
  (`movie` or `tv`) to `recommend-movies`.
- OpenAI is called once with forced function calling. Zod validates the query
  plan before TMDB.
- At most two people and two keyword names are resolved through TMDB search.
  Movie and TV routes use their matching Discover and credits endpoints.
- Popularity and rating Discover requests run concurrently and build a
  twenty-item pool.
- Media type, people, explicit keywords, exclusions, runtime, year, language,
  origin country, and adult filtering are never removed. One fallback search
  may remove inferred genres and keywords only.
- A failed model call returns a retryable error. Successful plans return a
  deterministic merge of the candidates without personalized reasons.
- One thirty-second `AbortController` signal reaches every OpenAI and TMDB
  request. The frontend does not perform hidden retries.
- Signed-out users see a sign-in prompt and do not invoke the Edge Function.

## Recommendation history

- Apply `20260726171508_replace_ai_recommendation_history.sql`, then
  `20260801075037_make_ai_recommendation_history_media_neutral.sql`, before
  deploying the new function. The second migration preserves existing rows,
  renames candidate IDs, and adds the required media type.
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
rg --pcre2 -n "OPENAI_API_KEY|(?<!VITE_)TMDB_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY" src
```
