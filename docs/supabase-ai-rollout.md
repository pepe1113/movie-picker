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
DEEPSEEK_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The app reads Supabase config only from `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. Missing values surface as a `SupabaseConfigError`
instead of creating a partially configured client.

## Edge Function secrets

The `recommend-movies` Edge Function reads:

```text
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

`DEEPSEEK_MODEL` and `DEEPSEEK_BASE_URL` are optional; the function defaults to
DeepSeek's current low-cost Flash model, `deepseek-v4-flash`, and
`https://api.deepseek.com`.

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

- Signed-in AI Picker requests TMDB candidates first, then calls
  `recommend-movies` to rerank the submitted candidates and return localized
  reasons.
- Signed-out users use the existing rule-based recommendation flow.
- Edge Function or provider failures fall back to rule-based recommendations and
  show `目前使用快速推薦`.
- Only normalized recommendation runs are stored. Raw prompts and raw provider
  responses are not stored.

## Verification commands

Run after implementation changes:

```bash
bun run test:run
npm test -- --run
bun run lint
bun run build
rg -n "DEEPSEEK_API_KEY|SUPABASE_SERVICE_ROLE_KEY" src
```
