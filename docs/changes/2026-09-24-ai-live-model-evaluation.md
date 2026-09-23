# AI live model evaluation log

Date: 2026-09-24

## Changes

- Added `bun run test:ai-live` to call `coordinateRecommendations()` directly with local OpenAI and TMDB credentials.
- Added OpenAI prompt, cached, completion, reasoning, and total token usage to the coordinator result and console output.
- Added per-model cost calculation for `gpt-4o-mini` and `gpt-6-luna`.
- Changed the default model to `gpt-6-luna` with `reasoning_effort: none` for Chat Completions function calling.
- Verified that hard and soft query-plan labels are rendered in the AI result UI.

## Verification

- `bun run test:run`: 88 tests passed.
- `bun run lint`: passed.
- `bun run build`: passed.
- Live comparison command: `bun run test:ai-live -- gpt-4o-mini gpt-6-luna`.
- Live comparison is pending local `OPENAI_API_KEY` and `TMDB_ACCESS_TOKEN` values; no Supabase deployment is required.
