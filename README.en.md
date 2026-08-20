# 🍿 Movie Picker

[繁體中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

![website-demo](public/homepage-demo.gif)

> “Tired of watching the same movies? What else is out there that I have not heard of but might enjoy?”

Let Movie Picker suggest a few options for you.
Describe **your current mood and what you want to watch**, and AI will identify genres, eras, and keywords you may enjoy. It then uses TMDB's native Discover API to recommend movies and TV shows, giving you more options to choose from.

The frontend is built with React, while Supabase supports the database and backend. Movie and TV data comes from TMDB and OMDb, and an AI model helps determine relevant tags. This is a personal portfolio project.

### 👀 Take a peek at [Movie Picker](https://movie-picker.peiwang.dev/)

## Features

- **Latest & Trending**: Browse latest, trending, popular, top-rated, and genre lists for movies and TV
- **Search**: Search both media types and view details, credits, trailers, seasons, and episode counts
- **AI Picker**: Signed-in users choose movies or TV, describe their goals and constraints, and receive up to ten results from an AI-planned search
- **History**: Review and delete the latest 20 AI recommendation runs
- **Wishlist**: Save movies to a wishlist
- **User Sign-in**: Sign in with GitHub to use the AI picker and save recommendation history
- **Localization**: Switch between English and Traditional Chinese with responsive layouts for different screen sizes

|   feature    |             screenshot             |
| :----------: | :--------------------------------: |
| movie detail | ![movie-detail](public/detail.png) |
|   History    |   ![history](public/history.png)   |
|   Wishlist   |  ![wishlist](public/wishlist.png)  |

## Tech Stack

| Framework      | Used for                                                   |
| -------------- | ---------------------------------------------------------- |
| React 19       | Frontend interface library                                 |
| TypeScript     | Static type checking                                       |
| Vite           | Local development and frontend builds                      |
| Tailwind CSS 4 | Responsive layouts and visual styling                      |
| shadcn/ui      | Reusable UI components                                     |
| Motion         | UI animation and reduced-motion support                    |
| React Router   | SPA routing                                                |
| TanStack Query | API fetching, caching, and server-state synchronization    |
| Zustand        | Language, theme, auth, and wishlist state                  |
| i18next        | English and Traditional Chinese localization               |
| Zod            | AI API data and query-plan validation                      |
| Supabase       | User data storage, GitHub Auth, Edge Functions             |
| TMDB API       | Movie and TV search, discovery, and metadata               |
| OMDb API       | External movie ratings                                     |
| AI model       | Converting natural-language requests into TMDB query plans |

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

## Develop

- For local development, copy `.env.example` to `.env` and configure the AI model key, TMDB token, and Supabase secrets. The app will fail to start if they are missing.
