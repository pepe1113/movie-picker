# 2026-05-24 Architecture Deepening Implementation Issues

Parent: `docs/plans/2026-05-24-architecture-deepening-prd.md`

Status: ready-for-agent

## Breakdown Summary

1. Remove regional poster carousel remnants
   - Type: AFK
   - Blocked by: None
   - User stories covered: 1, 2, 11, 16, 17

2. Deepen movie detail presentation data
   - Type: AFK
   - Blocked by: 1
   - User stories covered: 2, 10, 16

3. Deepen picker criteria and discover query building
   - Type: AFK
   - Blocked by: None
   - User stories covered: 3, 4, 12, 13, 16

4. Deepen trailer media behavior
   - Type: AFK
   - Blocked by: None
   - User stories covered: 7, 8, 9, 15, 16

5. Deepen movie list browsing behavior
   - Type: AFK
   - Blocked by: None
   - User stories covered: 5, 6, 14, 16

6. Integration verification and architecture log
   - Type: AFK
   - Blocked by: 1, 2, 3, 4, 5
   - User stories covered: 16, 17, 18

## Issue 1: Remove regional poster carousel remnants

Type: AFK

### What to build

Remove all remaining expectations and data fetching that exist only for the removed regional poster carousel. The movie detail page should continue to show its current core experience: fallback background, movie title, ratings, metadata, genres, overview, cast, movie info, wishlist action, and trailer action when available.

This issue must not rebuild the regional poster carousel.

### Acceptance criteria

- [ ] Movie detail tests no longer expect a regional poster carousel, regional poster controls, carousel dots, auto-advance timers, or regional poster test IDs.
- [ ] Locale entries that only supported regional poster carousel UI are removed from both supported languages.
- [ ] Movie images are no longer fetched by the movie detail flow unless another current feature still consumes them.
- [ ] Movie detail still renders fallback background behavior when no backdrop image is available.
- [ ] Movie detail still renders core movie information and wishlist action.
- [ ] Existing unit tests pass after removing the stale carousel expectations.
- [ ] No new production dependency is added.

### Blocked by

None - can start immediately.

## Issue 2: Deepen movie detail presentation data

Type: AFK

### What to build

Create a deeper movie detail presentation Module that turns raw movie detail resources into the data the page needs. The page should no longer manually know how to choose a trailer, limit cast, normalize external ratings, or convert movie detail into a wishlist item.

The Module should expose a small Interface that lets the movie detail page render the same visible behavior with less data-shaping logic in the page itself.

### Acceptance criteria

- [ ] Movie detail page consumes a prepared presentation model instead of manually deriving trailer, cast, external ratings, and wishlist movie.
- [ ] Trailer selection remains based on a YouTube Trailer result.
- [ ] Cast remains limited to the current intended display count.
- [ ] External ratings preserve current IMDb and Rotten Tomatoes behavior.
- [ ] Wishlist action receives a valid movie list item representation derived from movie detail.
- [ ] Unit tests cover the presentation Module through its public Interface.
- [ ] Existing movie detail page behavior is preserved aside from the already removed regional poster carousel.
- [ ] No Firebase service is changed.

### Blocked by

- Issue 1: Remove regional poster carousel remnants.

## Issue 3: Deepen picker criteria and discover query building

Type: AFK

### What to build

Create a deeper picker criteria Module that centralizes how manual filter state and AI picker answers become TMDB discover queries. AI picker and random filtered picker should share the same domain rules where appropriate instead of each caller knowing how to construct query params.

The Module should keep AI recommendation scoring testable as a separate behavior within the same picker domain.

### Acceptance criteria

- [ ] Manual filter state can be converted to a discover query through a single exported Interface.
- [ ] AI picker answers can be converted to a discover query through a single exported Interface.
- [ ] Query building covers genres, year range, rating range, sort order, minimum vote count, language, and pagination where applicable.
- [ ] Existing AI picker recommendation scoring still returns the top three recommendations with matched preference keywords.
- [ ] Unit tests cover manual filter query building, AI query building, and recommendation scoring.
- [ ] Random filtered pick and AI picker continue to fetch discover results correctly.
- [ ] No UI framework or production dependency is added.

### Blocked by

None - can start immediately.

## Issue 4: Deepen trailer media behavior

Type: AFK

### What to build

Create a deeper trailer media Module that centralizes YouTube trailer selection and embed URL behavior used by both movie cards and movie detail. Movie cards should keep delayed desktop preview behavior, while movie detail should keep explicit trailer playback when a trailer exists.

The Module should make trailer selection, preview URL generation, full trailer URL generation, and no-trailer fallback behavior testable without rendering the whole UI.

### Acceptance criteria

- [ ] Movie card and movie detail use the same trailer selection rule.
- [ ] Movie card preview preserves delayed loading and desktop-only behavior.
- [ ] Movie card preview URL preserves muted autoplay, loop, no controls, and privacy-friendly embed behavior.
- [ ] Movie detail trailer URL preserves explicit playback behavior.
- [ ] No-trailer movie cards still show overview fallback.
- [ ] Unit tests cover trailer selection and URL generation through the Module Interface.
- [ ] Existing visual behavior remains consistent with the Spotify-inspired dark UI.

### Blocked by

None - can start immediately.

## Issue 5: Deepen movie list browsing behavior

Type: AFK

### What to build

Create a deeper movie list browsing Module that centralizes how list categories, visible counts, load-more behavior, page fetching, and the Top 100 cap are managed. The homepage sections and Top 100 page should preserve their visible behavior while sharing a clearer Interface for list browsing decisions.

This should reduce repeated load-more logic and make list behavior testable without rendering every page.

### Acceptance criteria

- [ ] Homepage sections preserve current categories and visible increment behavior.
- [ ] Load more increases visible movie count and fetches another page when the local list is about to run out.
- [ ] Top 100 preserves the 100-movie cap.
- [ ] The list browsing Module exposes testable behavior for visible count, has-more state, and next-page trigger decisions.
- [ ] Unit tests cover homepage section strategy and Top 100 cap strategy.
- [ ] Existing MovieSection and MovieGrid visible behavior remains compatible.
- [ ] No TMDB API contract changes are introduced.

### Blocked by

None - can start immediately.

## Issue 6: Integration verification and architecture log

Type: AFK

### What to build

After the implementation slices are complete, run full verification and write the required architecture change log. This issue should confirm that the refactors preserved user-facing behavior and that stale regional poster carousel assumptions are gone.

### Acceptance criteria

- [ ] Full project tests pass with the project-preferred bun command.
- [ ] JavaScript modification policy is satisfied with `npm test`.
- [ ] Lint passes.
- [ ] A dated log entry is added under the project documentation explaining the architecture deepening work, removed regional poster carousel remnants, tested Modules, and verification commands.
- [ ] The log explicitly states that regional poster carousel remains out of scope.
- [ ] No unrelated Firebase or dependency changes are present.

### Blocked by

- Issue 1: Remove regional poster carousel remnants.
- Issue 2: Deepen movie detail presentation data.
- Issue 3: Deepen picker criteria and discover query building.
- Issue 4: Deepen trailer media behavior.
- Issue 5: Deepen movie list browsing behavior.
