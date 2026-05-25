# AI Picker Recommendation Carousel Design

## Context

The AI picker currently renders recommendation results as a responsive grid inside `src/components/features/ai-picker/AiMoviePicker.tsx`. The user wants the AI-picked movie list UI converted into a Motion-powered carousel with smooth animation and an infinite loop.

This is a UI-only change. It must not change the recommendation query, returned count, API behavior, fallback behavior, or persistence behavior.

## Goals

- Replace the AI picker result grid with a Coverflow-style carousel.
- Use the existing `motion` dependency for smooth transitions.
- Support infinite looping when there are at least two recommendations.
- Keep the carousel driven by the existing `recommendations` array.
- Show the recommendation explanation for the active center movie only.
- Preserve existing loading, error, fallback, wishlist, trailer preview, and i18n behavior.

## Non-Goals

- Do not change how many movies are requested or returned.
- Do not change `discoverMovies`, `resolveAiPickerRecommendations`, Supabase functions, or recommendation history behavior.
- Do not introduce new production dependencies.
- Do not create a generic carousel abstraction for unrelated movie sections.
- Do not remove existing internationalization support.

## Chosen Direction

Use a dedicated `AiRecommendationCarousel` component under `src/components/features/ai-picker/`.

The component receives the already-resolved recommendation list and rendering state from `AiMoviePicker`. It owns only UI state: active index, automatic rotation, pause state, and carousel controls.

This keeps `AiMoviePicker` responsible for the recommendation flow and keeps carousel animation details isolated.

## Result Layout

The result area keeps the current heading, preference badges, restart button, loading state, error state, fallback notice, and reason fallback notice.

When recommendations exist:

- The old `grid` list is replaced by `AiRecommendationCarousel`.
- The active movie is displayed as the enlarged center card.
- Neighboring movies are shown left and right with reduced scale and opacity.
- The user can switch movies with arrow buttons, dot indicators, or by clicking a visible neighboring card.
- The active movie reason appears below the carousel in a fixed-height reason panel.
- The reason panel updates with a Motion fade and upward slide when the active movie changes.

## Data Rules

The carousel renders exactly what it receives from `recommendations`.

- `0` recommendations: render nothing, matching current behavior.
- `1` recommendation: render a centered single card and reason panel without starting auto-rotation.
- `2+` recommendations: enable infinite loop and full controls.

The carousel must not slice, pad, duplicate, fetch, or filter recommendations. Any visual duplication needed for animation should be computed from indices only and must not affect the source data.

## Motion Behavior

Use Motion for:

- Card position, scale, opacity, and z-index transitions.
- Active reason panel enter/update transitions.
- Control tap feedback for arrow buttons and indicators.

Recommended timings:

- Card transition: 350-500ms with a smooth ease.
- Auto-advance interval: about 4 seconds.
- Reason transition: about 180-240ms.

Auto-rotation pauses while the user hovers the carousel region or focuses controls/content inside it. This gives users time to read the recommendation reason.

## Accessibility

- Arrow controls need accessible labels from i18n.
- Dot indicators need accessible labels that identify the target movie.
- The carousel region should expose a concise aria label.
- Focus within the carousel pauses auto-rotation.
- Controls must be reachable by keyboard.
- Reduced motion should avoid aggressive movement while still allowing manual navigation.

## Styling

The carousel follows `DESIGN.md`:

- Near-black surfaces.
- Spotify green only for active and functional states.
- 6-8px card radius.
- Heavy dark shadows for elevated cards.
- Compact typography.
- No new UI framework.

The poster artwork should remain the main visual color source. The carousel can add subtle depth with shadows and opacity but should not introduce a new color theme.

## Implementation Boundaries

Expected files:

- `src/components/features/ai-picker/AiRecommendationCarousel.tsx`
- `src/components/features/ai-picker/AiMoviePicker.tsx`
- `src/i18n/locales/en.json`
- `src/i18n/locales/zh-TW.json`
- focused tests if existing test setup supports this component cleanly

Avoid touching Firebase and Supabase services.

## Verification

After implementation:

- Run `bun run test:run`; this satisfies the project rule and no extra `npm test` is needed.
- Run `bun run lint`.
- Start the app and visually verify the AI picker result carousel in a browser.
- Check desktop and mobile widths for layout stability.

