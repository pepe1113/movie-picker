# Movie Picker

> A portfolio movie and TV discovery and recommendation app built with React, TMDB, Supabase, and an AI model.

[繁體中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

**Live Demo:** [https://movie-picker.peiwang.dev/](https://movie-picker.peiwang.dev/)

## Features

- Browse latest, trending, popular, top-rated, and genre lists for movies and TV
- Search both media types and view details, credits, trailers, seasons, and episode counts
- Signed-in users choose movies or TV, describe their goals and constraints, and receive up to ten results from an AI-planned search
- Save movies and TV locally, then merge and sync the wishlist after GitHub sign-in
- Review and delete the latest 20 AI recommendation runs
- Switch between English and Traditional Chinese in a responsive cinematic red-and-black UI

## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Zustand, Supabase, TMDB, OMDb, and an AI model.

## Data & Persistence

| Data                      | Storage                                                                   | Purpose                                                           |
| ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Wishlist                  | Browser `localStorage` while signed out; synced to Supabase after sign-in | Keeps saved movies and TV available across devices                |
| AI recommendation history | Supabase                                                                  | Stores picker preferences, recommendation results, and timestamps |
| User identity             | Supabase Auth                                                             | Supports GitHub sign-in and separates each user's data            |

Row Level Security ensures signed-in users can access only their own wishlist and recommendation history.

## Architecture

```text
React pages/components
├─ TanStack Query hooks → TMDB / OMDb
├─ Zustand stores → UI state + local wishlist cache
└─ Supabase client → GitHub Auth + Postgres (RLS)
                       └─ recommend-movies Edge Function → AI model + TMDB
```

- `src/pages` owns routes; `src/components` owns reusable UI and feature views.
- `src/hooks` coordinates server state; `src/services` isolates external APIs.
- `src/stores` owns client state; `supabase/migrations` and `supabase/functions` own backend behavior.
- AI picking requires sign-in. The model only creates the search plan; the Edge Function deterministically interleaves popular and top-rated TMDB candidates.

## Security

- The AI provider key and server-side movie-data token are stored in Supabase Secrets; the frontend never receives them.
- `.env*` files are ignored by Git except `.env.example`, and no provider secret value is tracked.
- The Edge Function requires a bearer token and verifies the caller with `supabase.auth.getUser()` before calling the AI model or writing history.
- Row Level Security restricts both tables to rows where `auth.uid() = user_id`; the browser uses only the public anon key.
- The AI endpoint accepts `POST` only, limits input length, and cancels unfinished upstream work after 30 seconds; the frontend waits up to 31 seconds.

## Checks

```bash
bun run test:run
bun run lint
bun run build
```

Movie data: [TMDB](https://www.themoviedb.org/) · Ratings: [OMDb](https://www.omdbapi.com/)
