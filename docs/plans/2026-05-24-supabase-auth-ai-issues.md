# 2026-05-24 Supabase Auth And AI Implementation Issues

Status: ready-for-agent

## Decisions Captured

- First auth provider is GitHub OAuth through Supabase Auth.
- Keep the auth/data model provider-extensible; do not key ownership by GitHub username.
- Use Supabase Postgres for persisted wishlist and AI recommendation runs.
- Frontend may use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Frontend must not contain `DEEPSEEK_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
- First implementation should avoid service role key; Edge Function should use user JWT + anon key so RLS applies.
- Unauthenticated wishlist stays in localStorage.
- Wishlist page should show an alert/prompt when unauthenticated.
- On login, localStorage wishlist and Supabase wishlist are automatically merged by movie id.
- Logged-in state treats Supabase as the authority and localStorage as cache.
- Logged-in wishlist writes that fail should roll back or not update UI; do not build an offline queue in v1.
- Wishlist stores `movie_id` plus a list-card-sized `movie_snapshot` jsonb.
- No `profiles` table in v1; use Supabase Auth user metadata.
- True AI is available only to logged-in users.
- Frontend fetches TMDB candidates; Edge Function only reranks candidates, records the run, and returns normalized recommendations.
- LLM provider v1 is DeepSeek low-cost Flash model, with exact official model id confirmed during implementation.
- Edge Function uses an OpenAI-compatible DeepSeek API call and hides the DeepSeek key in Supabase secrets.
- AI reason follows the current UI locale.
- AI failure falls back to rule-based recommendations and shows a small prompt: "目前使用快速推薦".
- Save normalized AI recommendation runs only; do not save raw prompt or raw provider response.
- Build a `/history` recommendation history UI in v1.
- History stores recommendations jsonb with `movie_snapshot` and reason.
- History supports deleting a single recommendation run; no batch clear in v1.
- Schema and RLS must be versioned under `supabase/migrations/`.

## Issue 1: Add Supabase project plumbing and typed client

Type: AFK

### What to build

Add the Supabase client dependency and create the app-side Supabase client using public environment variables. The app should have a single module for Supabase access and typed helpers that do not expose privileged secrets.

### Acceptance criteria

- [ ] `@supabase/supabase-js` is added as a production dependency.
- [ ] The frontend client reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] No DeepSeek key or Supabase service role key is referenced from frontend code.
- [ ] Missing frontend Supabase env vars fail gracefully in development with a clear error path.
- [ ] Existing tests, lint, and build still pass.

### Blocked by

None - can start immediately.

## Issue 2: Version Supabase schema and RLS for wishlist and AI runs

Type: AFK

### What to build

Create Supabase migration SQL for `wishlist_items` and `ai_recommendation_runs`, including Row Level Security policies. Ownership must use `auth.uid()`. Do not create a `profiles` table.

### Acceptance criteria

- [ ] Migration exists under `supabase/migrations/`.
- [ ] `wishlist_items` has user ownership, `movie_id`, `movie_snapshot`, timestamps, and unique `(user_id, movie_id)`.
- [ ] `ai_recommendation_runs` has user ownership, answers jsonb, candidate movie ids, recommendations jsonb, provider, model, and created timestamp.
- [ ] RLS is enabled for both tables.
- [ ] Users can only select/insert/update/delete their own wishlist rows.
- [ ] Users can only select/insert/delete their own AI recommendation runs.
- [ ] No service role policy is required for v1.

### Blocked by

None - can start immediately.

## Issue 3: Replace mock auth with Supabase GitHub OAuth

Type: AFK

### What to build

Replace the mock auth flow with Supabase Auth using GitHub OAuth. Preserve the existing auth store interface where possible, but back it with real auth state, sign-in, sign-out, loading, and errors.

### Acceptance criteria

- [ ] Sign-in starts Supabase GitHub OAuth.
- [ ] Sign-out signs the user out of Supabase.
- [ ] Auth state listener updates the app store after page reload and redirect return.
- [ ] The app maps Supabase Auth user metadata into the existing user shape.
- [ ] Ownership uses Supabase user id, not GitHub username or email.
- [ ] UI copy does not make the data model GitHub-specific.
- [ ] Tests cover auth state mapping and store behavior without hitting real Supabase.

### Blocked by

- Issue 1: Add Supabase project plumbing and typed client.

## Issue 4: Sync wishlist between localStorage and Supabase after login

Type: AFK

### What to build

Keep unauthenticated wishlist in localStorage. When a user logs in, fetch their Supabase wishlist, merge it with localStorage by movie id, write the merged set back to Supabase, and keep localStorage as cache. Logged-in writes should treat Supabase as the authority.

### Acceptance criteria

- [ ] Unauthenticated users can still add and remove wishlist items locally.
- [ ] Wishlist page shows an alert/prompt when unauthenticated.
- [ ] Login triggers automatic local + remote wishlist merge by movie id.
- [ ] Merged wishlist is written back to Supabase.
- [ ] Logged-in add/remove writes to Supabase before updating authoritative state.
- [ ] Supabase write failure rolls back or avoids changing UI and shows a toast.
- [ ] localStorage remains as cache after successful logged-in writes.
- [ ] Tests cover merge, dedupe, failed write behavior, and unauthenticated local behavior.

### Blocked by

- Issue 2: Version Supabase schema and RLS for wishlist and AI runs.
- Issue 3: Replace mock auth with Supabase GitHub OAuth.

## Issue 5: Add DeepSeek recommendation Edge Function contract

Type: AFK

### What to build

Create a Supabase Edge Function named `recommend-movies`. It accepts completed AI picker answers, a capped list of TMDB candidates, and locale. It validates the logged-in user, calls DeepSeek through an OpenAI-compatible API, normalizes the response, inserts an AI recommendation run, and returns recommendations.

### Acceptance criteria

- [ ] Function lives under `supabase/functions/recommend-movies/`.
- [ ] Function reads DeepSeek API key/model/base URL from Supabase secrets, not frontend env.
- [ ] Function requires an authenticated user JWT.
- [ ] Function accepts only a bounded number of candidate movies.
- [ ] Returned movie ids must be from the submitted candidate list.
- [ ] Reasons follow request locale.
- [ ] Function stores normalized recommendations only, not raw prompt or raw provider response.
- [ ] Function inserts into `ai_recommendation_runs` using user scope and RLS-compatible ownership.
- [ ] Provider/model are recorded.
- [ ] DeepSeek model id is confirmed against official docs during implementation; if unavailable, use official low-cost fallback id.

### Blocked by

- Issue 2: Version Supabase schema and RLS for wishlist and AI runs.
- Issue 3: Replace mock auth with Supabase GitHub OAuth.

## Issue 6: Integrate true AI reranking into AI Picker with rule fallback

Type: AFK

### What to build

Update AI Picker so logged-in users use the `recommend-movies` Edge Function after TMDB candidates are fetched. Unauthenticated users keep the current rule-based recommendation. If the Edge Function fails, use the current rule-based recommendation and show a small prompt saying "目前使用快速推薦".

### Acceptance criteria

- [ ] Logged-in AI Picker sends capped, simplified TMDB candidates to the Edge Function.
- [ ] Unauthenticated AI Picker does not call the Edge Function and uses rule-based recommendations.
- [ ] Edge Function success displays AI reasons returned by the backend.
- [ ] Edge Function failure falls back to rule-based recommendations.
- [ ] Fallback shows the small prompt "目前使用快速推薦".
- [ ] Provider errors are not shown raw to users.
- [ ] Tests cover authenticated success, unauthenticated fallback, and failure fallback.

### Blocked by

- Issue 5: Add DeepSeek recommendation Edge Function contract.

## Issue 7: Add recommendation history page

Type: AFK

### What to build

Add a `/history` page showing logged-in users their latest AI recommendation runs. Unauthenticated users see a sign-in prompt. Each run shows created time, answer summary, recommended movie snapshots, reasons, and provider/model metadata.

### Acceptance criteria

- [ ] New `/history` route exists.
- [ ] Header includes a recommendation history navigation item.
- [ ] Unauthenticated history page shows a GitHub login prompt.
- [ ] Logged-in history page loads the latest 20 recommendation runs.
- [ ] Each run renders answer summary, movie snapshots, reasons, created time, and provider/model.
- [ ] History does not fetch TMDB to render basic cards.
- [ ] History does not display raw prompt or raw provider response.
- [ ] Tests cover unauthenticated state, empty state, and populated state.

### Blocked by

- Issue 2: Version Supabase schema and RLS for wishlist and AI runs.
- Issue 3: Replace mock auth with Supabase GitHub OAuth.
- Issue 5: Add DeepSeek recommendation Edge Function contract.

## Issue 8: Support deleting a single recommendation run

Type: AFK

### What to build

Allow logged-in users to delete one AI recommendation run from the history page. Do not build batch clear in v1.

### Acceptance criteria

- [ ] Each history run has a delete action.
- [ ] Delete asks for confirmation before removing the run.
- [ ] Delete removes only the current user's run.
- [ ] Delete success removes the run from the UI.
- [ ] Delete failure shows a toast and preserves the run in the UI.
- [ ] Tests cover successful delete and failed delete.

### Blocked by

- Issue 7: Add recommendation history page.

## Issue 9: Add Supabase and AI rollout documentation

Type: AFK

### What to build

Document required Supabase configuration, GitHub OAuth setup, environment variables, Edge Function secrets, RLS assumptions, local development caveats, and verification commands.

### Acceptance criteria

- [ ] Documentation explains GitHub OAuth setup in Supabase and GitHub.
- [ ] Documentation lists frontend env vars and forbidden frontend secrets.
- [ ] Documentation lists Edge Function secrets.
- [ ] Documentation explains that service role key is not used in v1.
- [ ] Documentation explains localStorage and Supabase wishlist authority rules.
- [ ] Documentation explains AI fallback behavior.
- [ ] Verification commands are recorded.

### Blocked by

- Issue 1: Add Supabase project plumbing and typed client.
- Issue 2: Version Supabase schema and RLS for wishlist and AI runs.
- Issue 5: Add DeepSeek recommendation Edge Function contract.

## Issue 10: Final integration verification

Type: AFK

### What to build

Run the full verification suite after all Supabase and AI slices are complete. Ensure no privileged secrets are present in frontend code and the new routes, auth flow, wishlist sync, AI fallback, and history UI are covered.

### Acceptance criteria

- [ ] `bun run test:run` passes.
- [ ] `npm test -- --run` passes after JavaScript changes.
- [ ] `bun run lint` passes.
- [ ] `bun run build` passes.
- [ ] Search confirms no `DEEPSEEK_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` appears in frontend source.
- [ ] Documentation/log is updated with final verification results.

### Blocked by

- Issue 3: Replace mock auth with Supabase GitHub OAuth.
- Issue 4: Sync wishlist between localStorage and Supabase after login.
- Issue 6: Integrate true AI reranking into AI Picker with rule fallback.
- Issue 8: Support deleting a single recommendation run.
- Issue 9: Add Supabase and AI rollout documentation.
