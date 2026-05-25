# 2026-05-24 Supabase Auth and AI Rollout Log

## Summary

- Added Supabase client plumbing with public Vite env validation.
- Added Supabase migration for user-owned wishlist and AI recommendation runs.
- Replaced mock auth behavior with Supabase GitHub OAuth helpers and auth-state
  initialization.
- Added wishlist localStorage-to-Supabase merge and authenticated write handling.
- Added `recommend-movies` Edge Function contract using DeepSeek
  `deepseek-v4-flash`.
- Integrated signed-in AI reranking with rule-based fallback.
- Added recommendation history UI, route, navigation, and single-run deletion.
- Documented setup, secrets, RLS assumptions, fallback behavior, and verification
  commands in `docs/supabase-ai-rollout.md`.

## Verification snapshot

Focused tests were run during implementation:

- `bun run test:run tests/unit/supabaseClient.test.ts`
- `bun run test:run tests/unit/supabaseMigration.test.ts`
- `bun run test:run tests/unit/authStore.test.ts`
- `bun run test:run tests/unit/wishlistStore.test.ts`
- `bun run test:run tests/unit/recommendMoviesFunction.test.ts`
- `bun run test:run tests/unit/aiRecommendationFlow.test.ts`
- `bun run test:run tests/unit/HistoryPage.test.tsx`

Full verification completed:

- `bun run test:run` passed: 14 files, 43 tests.
- `npm test -- --run` passed: 14 files, 43 tests.
- `bun run lint` passed.
- `bun run build` passed.
- `rg -n "DEEPSEEK_API_KEY|SUPABASE_SERVICE_ROLE_KEY" src` returned no matches.
