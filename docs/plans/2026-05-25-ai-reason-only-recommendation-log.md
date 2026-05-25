# 2026-05-25 AI Reason-only Recommendation Rollout Log

Status: implemented

## Summary

The AI picker now treats TMDB as the source of recommended movies. The frontend displays TMDB discover results first, then asks `/recommend-movies` only for short recommendation reasons.

## Contract

- `/recommend-movies` keeps its existing Edge Function name.
- `/recommend-movies` is a reason generator, not a movie picker.
- Request body uses `movies`, not `candidates`.
- Frontend sends 5 movies by default.
- Backend accepts 1-10 movies.
- Backend returns one reason per submitted movie.
- Backend preserves submitted movie ids and order.
- Frontend still aligns returned reasons by `movie_id`.
- Response keeps `provider` and `model`.

## Reason Limits

- `zh-TW` reasons are capped at 50 Unicode characters.
- English reasons are capped at 120 characters.
- Prompt asks DeepSeek to keep reasons short.
- Backend also trims reasons before returning them.

## User Flow

- Unauthenticated users see 5 TMDB movies with movie overviews.
- Unauthenticated users do not call `/recommend-movies`.
- Authenticated users see 5 TMDB movies immediately.
- While AI reasons are loading, each movie shows a reason skeleton.
- When AI reasons succeed, the reason text replaces the skeleton.

## Failure Behavior

- Frontend passes an 8 second timeout to Supabase Functions invoke.
- Reason query disables React Query retry so failures fall back immediately.
- On `/recommend-movies` error or timeout, movie cards stay visible.
- The UI shows a small fallback notice.
- Reason text falls back to `movie.overview`.
- Empty overview falls back to the localized no-overview text.
- Frontend logs the original AI reason error with `console.error`.
- Frontend writes fallback history directly through Supabase RLS.
- Fallback history write failures only log to console and do not change the visible result.

## History Semantics

- `provider = deepseek` means the displayed text is an AI reason.
- `provider = fallback` and `model = local-overview` mean the displayed text is a movie overview fallback.
- History labels records as `AI Reason` / `AI 理由` or `Movie Overview` / `電影介紹`.
- History supports 5 displayed movies with a responsive grid.

## Verification

- `npm run test:run`
- `npm run lint`

`bun` was not available in the worktree shell, so npm scripts were used with the existing package scripts. No new production dependency was added.
