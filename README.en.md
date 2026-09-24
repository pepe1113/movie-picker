# 🍿 Movie Picker

[繁體中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

![website-demo](public/homepage-demo.gif)

> “Tired of watching the same movies? What else might you enjoy?”

Tell Movie Picker what mood you are in and what you would like to watch. AI turns your request into validated search criteria, then uses the TMDB Discover API to recommend movies or TV shows.

The frontend is built with React. Supabase handles sign-in, the database, and the Edge Function; TMDB and OMDb provide movie data, while OpenAI interprets each request.

#### 👀 Take a peek at [Movie Picker](https://movie-picker.peiwang.dev/)

## Features

- **Latest & Trending**: Browse the latest, weekly trending, popular, top-rated, and genre lists for movies and TV shows
- **Search**: Find movies and TV shows, then view details, cast, trailers, seasons, and episode counts
- **AI Picker**: Sign in and describe what you want to watch and any limits; AI builds the query, and TMDB returns up to ten titles
- **History**: View the latest 20 AI recommendation runs and delete individual entries
- **Wishlist**: Save movies and TV shows for later
- **User Sign-in**: Sign in with GitHub or Google to use the AI picker, sync your wishlist, and save recommendation history
- **Localization**: Switch between English and Traditional Chinese; responsive layouts support different screen sizes

|   feature    |             screenshot             |
| :----------: | :--------------------------------: |
| movie detail | ![movie-detail](public/detail.png) |
|   History    |   ![history](public/history.png)   |
|   Wishlist   |  ![wishlist](public/wishlist.png)  |

## Tech Stack

| Framework      | Used for                                                |
| -------------- | ------------------------------------------------------- |
| React 19       | Frontend UI                                             |
| TypeScript     | Static type checking                                    |
| Vite           | Local development and frontend builds                   |
| Tailwind CSS 4 | Responsive layouts and styling                          |
| shadcn/ui      | Reusable UI components                                  |
| Motion         | UI animation and reduced-motion support                 |
| React Router   | SPA routing                                             |
| TanStack Query | API fetching, caching, and server-state synchronization |
| Zustand        | Language, theme, auth, and wishlist state               |
| i18next        | English and Traditional Chinese localization            |
| Zod            | AI response and query-plan validation                   |
| Supabase       | User data, OAuth, RLS, and the Edge Function            |
| TMDB API       | Movie and TV search, discovery, and metadata            |
| OMDb API       | External movie ratings                                  |
| AI model       | Turning natural-language requests into TMDB query plans |

## Data & Persistence

| Data                      | Storage                                                                   | Purpose                                                        |
| ------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Wishlist                  | Browser `localStorage` while signed out; synced to Supabase after sign-in | Keeps saved movies and TV shows available across devices       |
| AI recommendation history | Supabase                                                                  | Stores picker criteria, recommendation results, and timestamps |
| User identity             | Supabase Auth                                                             | Supports GitHub and Google sign-in                             |

Row Level Security ensures signed-in users can access only their own wishlist and recommendation history.

## Architecture

```mermaid
flowchart LR
  User[User] --> UI[React UI]
  UI -->|GitHub / Google OAuth| Auth[Supabase Auth]
  Auth -->|Session| UI
  UI -->|Picker request| Fn[recommend-movies Edge Function]
  Fn -->|Verify user| Auth
  Fn -->|Natural language| AI[OpenAI]
  AI -->|Query plan| Fn
  Fn -->|Search / Credits / Discover| TMDB[TMDB API]
  Fn -->|Recommendation history| DB[(Postgres + RLS)]
  Fn -->|Up to 10 recommendations| UI
```

- `src/pages` contains routed pages; `src/components` contains shared UI and feature components.
- `src/hooks` coordinates server state; `src/services` keeps external APIs behind clear boundaries.
- `src/stores` manages client state; `supabase/migrations` and `supabase/functions` contain backend behavior.

## Recommendation Pipeline

- **Keep AI within a clear boundary**: OpenAI can only produce a `plan_movie_search` query plan. The Edge Function validates it and calls TMDB, so the model never generates title data directly.
- **Separate explicit constraints from inferred preferences**: If there are too few results, only AI-inferred genres and keywords are relaxed. People, years, runtime, and exclusions from the user stay in place.
- **Handle ambiguous names and roles**: TMDB credits are used to distinguish actors, directors, writers, and producers. Ambiguous matches ask the user to adjust the request instead of guessing.
- **Build a predictable candidate pool**: Popular and top-rated results are fetched in parallel, deduplicated, and interleaved before returning up to ten titles.
- **Isolate slow or failed work**: OpenAI and TMDB share a 30-second deadline. Recommendation history is written in the background, so it does not delay or invalidate a completed result.

See [AI Picker, Supabase Auth, and Data Access Architecture](./docs/supabase-ai-rollout.en.md) for the full data flow and validation rules.

## Develop

Set frontend environment variables from `.env.example`. Store the OpenAI, OpenRouter, and TMDB keys used by the AI Function in Supabase Edge Function Secrets.

For full local testing, start Docker Desktop, provide `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, and `TMDB_ACCESS_TOKEN` (or `VITE_TMDB_ACCESS_TOKEN`) in an env file, then run `bun --env-file=/path/to/.env.local run dev:local`. The script starts local Supabase, the `recommend-movies` Edge Function, and Vite, and connects the frontend to the local API. Open `http://127.0.0.1:5173` and choose “Local test sign-in” to test recommendations and history. Ctrl+C stops the dev servers; `supabase stop` stops the local stack. This does not change the remote Supabase project.

To test only the recommendation core, run `bun --env-file=/path/to/.env.local run test:ai-live`. It calls OpenAI, TMDB, and OpenRouter directly without Supabase, sign-in, or database access.

| Command                   | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `bun install`             | Install dependencies                        |
| `bun run dev`             | Start the local development server          |
| `bun run dev:local`       | Start the local frontend, Supabase, and Function |
| `bun run test:run`        | Run all tests                               |
| `bun run test:ai-live`    | Test AI and TMDB locally with token costs   |
| `bun run lint`            | Run code checks                             |
| `bun run build`           | Type-check and build the production bundle  |
| `bun run deploy:supabase` | Deploy the `recommend-movies` Edge Function |
