# OpenRouter Jev candidate rerank log

Date: 2026-09-24

## Changes

- Added pointwise candidate reranking after TMDB discovery with the fixed `typesafe/jev-1.13` model and OpenRouter Decisions API.
- Sent only the validated direction plus candidate ID, title, overview, genre names, year, and original language.
- Kept hard constraints and TMDB discovery unchanged; Jev can only rank or remove existing candidates.
- Applied a `0.5` relevance threshold, stable score ordering, and a five-result maximum without padding.
- Preserved successful candidate decisions when siblings fail; a total Jev failure falls back to the first five deterministic candidates.
- Added actual provider/model metadata, request-level cost and latency logs, and history persistence for the engine that selected the final order.
- Added frontend validation for `openrouter` and the five-result response limit.
- Added `bun run dev:local` to start local Supabase Edge Function and Vite together, with a development-only anonymous sign-in for manual testing.

## Deployment configuration

- Add `OPENROUTER_API_KEY` as a Supabase Edge Function Secret.
- No new dependency, migration, table, or frontend environment variable is required.
- Remote deployment remains pending. The live Decisions API smoke test passed with a local key; no remote secret was changed.

## Verification

- `bun run test:run`: 104 tests passed.
- `bun run lint`: passed.
- `bun run build`: passed with the existing large-chunk warning.
- `bun --env-file=/Users/peihsinwang/project/movie-picker/.env.local run dev:local`: confirmed it stops with a clear message when Docker Desktop is not running. Full local end-to-end verification is pending Docker startup and user manual testing.
- Unit coverage includes score validation, stable ordering, threshold filtering, five-result limiting, partial failures, 401/402/413/429/5xx responses, invalid JSON, missing answers, timeout/abort fallback, provider metadata, candidate membership, and minimal request state.
- Live fixture calibration for Traditional Chinese and English relevance, Precision@5, nDCG@5, fallback rate, empty rate, and p50/p95 latency remains required before production rollout.
