# 2026-05-23 Homepage Hero Title Log

## Scope

- Update the homepage AI picker hero headline to feel more playful.
- Randomly choose one of 10 localized headline variants on entry.
- Reveal the chosen headline with a typewriter-style character animation.
- Keep a rectangular blinking cursor at the end of the completed headline.
- Keep the headline full-width, centered, and slightly smaller than the previous oversized hero type.

## Implementation Notes

- Headline variants live in `src/i18n/locales/zh-TW.json` and `src/i18n/locales/en.json`.
- `AiMoviePicker` picks the headline when the component mounts.
- The heading keeps the full selected headline as its accessible name while visually revealing characters one by one.
- The cursor uses a 0.5s opacity keyframe animation in `src/index.css`.
- Unit coverage was added for random title selection, centered full-width classes, and the typewriter reveal.

## Verification

- Passed: `bun run test:run tests/unit/AiMoviePicker.test.tsx`
- Passed: `npm test -- --run tests/unit/AiMoviePicker.test.tsx`
- Passed: `bun run lint`
- Failed outside this scope: `bun run test:run` currently fails in `tests/unit/MovieDetailPage.test.tsx` because `src/pages/MovieDetailPage.tsx` declares `RegionalPostersCarousel` more than once.
