# 2026-05-24 Architecture Deepening Log

## Scope

- Removed stale regional poster carousel assumptions after the feature was intentionally removed.
- Deepened movie detail presentation data so the page consumes prepared trailer, cast, external ratings, and wishlist movie data.
- Deepened picker criteria so manual filters and AI picker answers build TMDB discover queries through a shared module.
- Deepened trailer media behavior so movie cards and movie detail share trailer selection and embed URL generation.
- Deepened movie list browsing behavior so visible-count, fetch-next-page, and Top 100 cap rules are testable outside pages.

## Implementation Notes

- Regional poster carousel remains out of scope and was not rebuilt.
- Removed the unused TMDB movie images query from the movie detail flow.
- Removed regional poster locale entries from both supported languages.
- Kept AI picker recommendation scoring compatible with the existing tests while moving query-building rules behind the picker criteria module.
- Kept movie card desktop preview behavior delayed and privacy-friendly through the shared trailer media module.
- Kept homepage section increments and Top 100 display behavior unchanged while moving the decision rules into the movie list browsing module.

## Tests Added Or Updated

- Movie detail page test now verifies the removed regional poster carousel is absent while core movie detail content still renders.
- Movie detail helper tests now cover presentation data building.
- Picker criteria tests cover manual filter and AI answer discover query building.
- Trailer media tests cover YouTube trailer selection and embed URL generation.
- Movie list browsing tests cover visible-count increments, next-page trigger decisions, and Top 100 capping.

## Verification

- Passed: `bun run test:run`
- Passed: `bun run lint`
- Passed: `npm test -- --run`
