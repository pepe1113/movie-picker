# Movie Picker

> A portfolio movie discovery and recommendation app built with React, TMDB, Supabase, and DeepSeek.

[繁體中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

**Live Demo:** [https://movie-picker.peiwang.dev/](https://movie-picker.peiwang.dev/)

## Features

- Browse now-playing, trending, popular, and top-rated movies
- Search movies and view details, credits, trailers, and OMDb ratings
- Pick three movies randomly or from genre/rating/year filters
- Get preference-based picks; signed-in users receive DeepSeek-generated reasons
- Save a wishlist locally, then merge and sync it after GitHub sign-in
- Review and delete the latest 20 AI recommendation runs
- Switch between English/Traditional Chinese and light/dark themes

## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Zustand, Supabase, TMDB, OMDb, and DeepSeek.

## Data & Persistence

| Data                      | Storage                                                                   | Purpose                                                           |
| ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Wishlist                  | Browser `localStorage` while signed out; synced to Supabase after sign-in | Keeps saved movies available across devices                       |
| AI recommendation history | Supabase                                                                  | Stores picker preferences, recommendation results, and timestamps |
| User identity             | Supabase Auth                                                             | Supports GitHub sign-in and separates each user's data            |

Row Level Security ensures signed-in users can access only their own wishlist and recommendation history.

## Architecture

```text
React pages/components
├─ TanStack Query hooks → TMDB / OMDb
├─ Zustand stores → UI state + local wishlist cache
└─ Supabase client → GitHub Auth + Postgres (RLS)
                       └─ recommend-movies Edge Function → DeepSeek API
```

- `src/pages` owns routes; `src/components` owns reusable UI and feature views.
- `src/hooks` coordinates server state; `src/services` isolates external APIs.
- `src/stores` owns client state; `supabase/migrations` and `supabase/functions` own backend behavior.
- Signed-out AI picks use the local rule-based fallback. Signed-in requests use the Edge Function and also fall back locally if the provider fails.

## Security

- Verified on **2026-07-16** with `supabase secrets list`: `DEEPSEEK_API_KEY` exists in the linked project's Supabase Secrets.
- The DeepSeek key is stored in Supabase Secrets and read only inside the Edge Function; the frontend never receives it.
- `.env*` files are ignored by Git except `.env.example`, and no DeepSeek secret value is tracked.
- The Edge Function requires a bearer token and verifies the caller with `supabase.auth.getUser()` before calling DeepSeek or writing history.
- Row Level Security restricts both tables to rows where `auth.uid() = user_id`; the browser uses only the public anon key.
- The AI endpoint accepts `POST` only and limits each request to 10 candidate movies.

## Checks

```bash
bun run test:run
bun run lint
bun run build
```

Movie data: [TMDB](https://www.themoviedb.org/) · Ratings: [OMDb](https://www.omdbapi.com/)
