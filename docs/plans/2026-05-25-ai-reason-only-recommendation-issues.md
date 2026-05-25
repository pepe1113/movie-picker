# 2026-05-25 AI Reason-only Recommendation Issues

Status: ready-for-agent

## Decisions Captured

- Use the existing `/recommend-movies` Edge Function name.
- Change `/recommend-movies` from movie reranking to recommendation reason generation.
- Frontend gets movies from TMDB discover and displays them before AI reasons return.
- Frontend defaults to displaying and sending 5 movies.
- Backend accepts 1-10 movies and returns one reason per submitted movie.
- Backend must preserve the submitted movie set and order; frontend still aligns reasons by `movie_id`.
- AI reason generation is available only to logged-in users.
- Unauthenticated users see the 5 movies with movie overviews and do not call `/recommend-movies`.
- AI reasons are capped at 50 Unicode characters for `zh-TW` and 120 characters for English.
- Frontend uses an 8 second timeout for AI reasons.
- If `/recommend-movies` fails or times out, frontend logs the error, keeps the movie cards, shows movie overviews, and writes fallback history.
- Backend errors should not be swallowed; DeepSeek, parsing, validation, or DB write failures should return an error.
- Fallback history is inserted directly from the frontend through Supabase RLS.
- Fallback history uses `provider = fallback` and `model = local-overview`.
- History should distinguish `deepseek` records as AI reasons and `fallback` records as movie overviews.

## Issue 1: Add reason-only AI success path

Type: AFK

### What to build

Change the AI picker success path so TMDB remains the source of recommended movies and `/recommend-movies` only generates short reasons for the movies submitted by the frontend. Logged-in users should see five movie cards immediately, then see AI reasons fill in once the Edge Function succeeds. Successful AI runs should still be saved to recommendation history.

### Acceptance criteria

- [ ] The AI picker displays the first 5 selected TMDB discover candidates before AI reasons return.
- [ ] `/recommend-movies` accepts 1-10 submitted movies and does not choose, replace, or reorder movies.
- [ ] `/recommend-movies` returns one recommendation reason per submitted movie, along with `provider` and `model`.
- [ ] Reasons are capped to 50 Unicode characters for `zh-TW` and 120 characters for English.
- [ ] Frontend aligns returned reasons by `movie_id` against the original displayed movie order.
- [ ] Successful logged-in AI runs are stored in recommendation history with `provider = deepseek`.
- [ ] Tests cover successful reason generation, reason alignment, order preservation, and length limiting.

### Blocked by

None - can start immediately.

## Issue 2: Add unauthenticated and AI-failure fallback path

Type: AFK

### What to build

Make the picker resilient when AI reasons are unavailable. Unauthenticated users should never call the AI endpoint and should see movie overviews. Logged-in users should see the same displayed movies if `/recommend-movies` fails or times out, with an inline fallback notice, console diagnostics, movie overviews, and a fallback history record.

### Acceptance criteria

- [ ] Unauthenticated users do not call `/recommend-movies`.
- [ ] Unauthenticated users see the 5 displayed movies with movie overviews.
- [ ] Logged-in `/recommend-movies` failures and 8 second timeouts keep the movie cards visible.
- [ ] Logged-in failures show an inline notice that AI reasons are unavailable and movie overviews are being shown.
- [ ] Frontend logs the original AI reason error with `console.error`.
- [ ] Frontend inserts fallback recommendation history with `provider = fallback` and `model = local-overview`.
- [ ] Fallback history insert failures only log to console and do not change the visible picker result.
- [ ] Tests cover unauthenticated behavior, API error fallback, timeout fallback, and fallback history insert failure.

### Blocked by

- Issue 1: Add reason-only AI success path.

## Issue 3: Make history source-aware and support five displayed items

Type: AFK

### What to build

Update recommendation history so it represents the new semantics: records are displayed picker results with either AI-generated reasons or movie overview fallback text. The page should handle five movies cleanly and label each run by content source.

### Acceptance criteria

- [ ] History copy is updated to describe picker results and reasons without implying every movie was chosen by AI.
- [ ] History displays 5 recommendation items cleanly on desktop, tablet, and mobile layouts.
- [ ] `provider = deepseek` records are labeled as AI reasons.
- [ ] `provider = fallback` records are labeled as movie overviews.
- [ ] English and Traditional Chinese locale files are updated together.
- [ ] Missing movie overview text uses the existing localized no-overview fallback.
- [ ] Tests cover deepseek and fallback source labels and 5 item rendering.

### Blocked by

- Issue 1: Add reason-only AI success path.
- Issue 2: Add unauthenticated and AI-failure fallback path.

## Issue 4: Document the recommendation contract rollout

Type: AFK

### What to build

Record the new AI picker contract and operational behavior in the project docs so future agents do not treat `/recommend-movies` as a movie picker. The documentation should capture the user-facing flow, backend constraints, fallback history behavior, and verification commands.

### Acceptance criteria

- [ ] A project log exists under `docs/plans/` for the reason-only recommendation rollout.
- [ ] The log states that `/recommend-movies` generates reasons and does not pick movies.
- [ ] The log records that the frontend sends 5 movies by default and the backend accepts at most 10.
- [ ] The log records the 8 second frontend timeout and fallback overview behavior.
- [ ] The log records the history source semantics for `deepseek` and `fallback`.
- [ ] `bun run test:run` and `bun run lint` pass after implementation work is complete.

### Blocked by

- Issue 1: Add reason-only AI success path.
- Issue 2: Add unauthenticated and AI-failure fallback path.
- Issue 3: Make history source-aware and support five displayed items.
