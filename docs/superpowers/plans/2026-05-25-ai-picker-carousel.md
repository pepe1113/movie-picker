# AI Picker Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the AI picker recommendation result grid into a Motion-powered Coverflow carousel without changing recommendation data flow or returned movie count.

**Architecture:** Add a focused `AiRecommendationCarousel` component that receives resolved recommendations from `AiMoviePicker` and owns only carousel UI state. Keep fetching, fallback, reason resolution, and history persistence in `AiMoviePicker`.

**Tech Stack:** React 19, TypeScript, Motion (`motion/react`), React Testing Library, Vitest, existing UI components and i18n JSON files.

---

## File Structure

- Create `src/components/features/ai-picker/AiRecommendationCarousel.tsx`: Coverflow carousel UI, active index state, auto-loop, pause behavior, controls, active reason rendering.
- Modify `src/components/features/ai-picker/AiMoviePicker.tsx`: Replace the result grid with `AiRecommendationCarousel` and pass existing recommendation state into it.
- Modify `src/i18n/locales/en.json`: Add carousel control labels.
- Modify `src/i18n/locales/zh-TW.json`: Add carousel control labels.
- Create `tests/unit/AiRecommendationCarousel.test.tsx`: Focused component behavior tests for source-data preservation, active reason display, controls, and single-item behavior.

## Task 1: Carousel Component Contract

**Files:**
- Create: `tests/unit/AiRecommendationCarousel.test.tsx`
- Create: `src/components/features/ai-picker/AiRecommendationCarousel.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiRecommendationCarousel } from '@/components/features/ai-picker/AiRecommendationCarousel'
import i18n from '@/i18n/config'
import type { AiPickerDisplayRecommendation } from '@/utils/aiRecommendationFlow'

vi.mock('@/components/features/movie/MovieCard', () => ({
  MovieCard: ({ movie }: { movie: { title: string } }) => (
    <article>{movie.title}</article>
  ),
}))

function makeRecommendation(
  id: number,
  title: string,
  reason?: string,
): AiPickerDisplayRecommendation {
  return {
    movie: {
      adult: false,
      backdrop_path: null,
      genre_ids: [],
      id,
      original_language: 'en',
      original_title: title,
      overview: `${title} overview`,
      popularity: 1,
      poster_path: null,
      release_date: '2026-01-01',
      title,
      video: false,
      vote_average: 8,
      vote_count: 100,
    },
    matchedKeywordKeys: [],
    reason,
  }
}

function renderCarousel(
  recommendations: AiPickerDisplayRecommendation[],
  options: {
    isReasonLoading?: boolean
    shouldShowOverviewReasons?: boolean
  } = {},
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <AiRecommendationCarousel
        recommendations={recommendations}
        isReasonLoading={options.isReasonLoading ?? false}
        shouldShowOverviewReasons={options.shouldShowOverviewReasons ?? false}
      />
    </I18nextProvider>,
  )
}

describe('AiRecommendationCarousel', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('renders every recommendation without changing the source count', () => {
    renderCarousel([
      makeRecommendation(1, 'First', 'First reason'),
      makeRecommendation(2, 'Second', 'Second reason'),
      makeRecommendation(3, 'Third', 'Third reason'),
    ])

    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByText('First reason')).toBeInTheDocument()
    expect(screen.queryByText('Second reason')).not.toBeInTheDocument()
    expect(screen.queryByText('Third reason')).not.toBeInTheDocument()
  })

  it('moves the active reason with next and previous controls', async () => {
    const user = userEvent.setup()

    renderCarousel([
      makeRecommendation(1, 'First', 'First reason'),
      makeRecommendation(2, 'Second', 'Second reason'),
      makeRecommendation(3, 'Third', 'Third reason'),
    ])

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Second reason')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous/i }))
    expect(screen.getByText('First reason')).toBeInTheDocument()
  })

  it('wraps previous from the first recommendation to the last', async () => {
    const user = userEvent.setup()

    renderCarousel([
      makeRecommendation(1, 'First', 'First reason'),
      makeRecommendation(2, 'Second', 'Second reason'),
      makeRecommendation(3, 'Third', 'Third reason'),
    ])

    await user.click(screen.getByRole('button', { name: /previous/i }))

    expect(screen.getByText('Third reason')).toBeInTheDocument()
  })

  it('does not render loop controls for a single recommendation', () => {
    renderCarousel([makeRecommendation(1, 'Only', 'Only reason')])

    expect(screen.getByText('Only reason')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /next/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /previous/i }),
    ).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
/Users/peihsinwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/unit/AiRecommendationCarousel.test.tsx
```

Expected: FAIL because `AiRecommendationCarousel` does not exist.

- [ ] **Step 3: Implement the component**

Create `AiRecommendationCarousel.tsx` with:

- Props: `recommendations`, `isReasonLoading`, `shouldShowOverviewReasons`.
- `activeIndex` state.
- `goNext` and `goPrevious` functions that wrap with modulo.
- `visibleSlides` derived from source indices only.
- `setInterval` auto-advance when `recommendations.length > 1` and not paused.
- Pause handlers for hover and focus.
- Motion card positions for center, left, right, and hidden states.
- A fixed-height active reason panel.

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
/Users/peihsinwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/unit/AiRecommendationCarousel.test.tsx
```

Expected: PASS.

## Task 2: Wire Carousel Into AI Picker

**Files:**
- Modify: `src/components/features/ai-picker/AiMoviePicker.tsx`

- [ ] **Step 1: Write failing integration assertion**

Update `tests/unit/AiMoviePicker.test.tsx` so an existing recommendation result test asserts the carousel region is rendered after movies load:

```tsx
expect(
  await screen.findByRole('region', { name: /AI recommendation carousel/i }),
).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
/Users/peihsinwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/unit/AiMoviePicker.test.tsx
```

Expected: FAIL because the current result grid has no carousel region.

- [ ] **Step 3: Replace result grid**

In `AiMoviePicker.tsx`:

- Import `AiRecommendationCarousel`.
- Replace the `recommendations.map(...)` grid block with:

```tsx
<AiRecommendationCarousel
  recommendations={recommendations}
  isReasonLoading={reasonQuery.isLoading}
  shouldShowOverviewReasons={shouldShowOverviewReasons}
/>
```

- [ ] **Step 4: Run focused AI picker test**

Run:

```bash
/Users/peihsinwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/unit/AiMoviePicker.test.tsx
```

Expected: PASS.

## Task 3: I18n Labels

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh-TW.json`
- Modify: `src/components/features/ai-picker/AiRecommendationCarousel.tsx`

- [ ] **Step 1: Add labels**

Add under `aiPicker.carousel`:

```json
{
  "label": "AI recommendation carousel",
  "previous": "Previous recommendation",
  "next": "Next recommendation",
  "goTo": "Show {{title}}",
  "reasonLabel": "Why this movie"
}
```

Add Traditional Chinese equivalents:

```json
{
  "label": "AI 推薦片單輪播",
  "previous": "上一部推薦",
  "next": "下一部推薦",
  "goTo": "顯示《{{title}}》",
  "reasonLabel": "推薦原因"
}
```

- [ ] **Step 2: Use labels in controls**

Update the carousel component to use `t('aiPicker.carousel.*')` for region, buttons, indicators, and reason panel.

- [ ] **Step 3: Run focused tests**

Run:

```bash
/Users/peihsinwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/unit/AiRecommendationCarousel.test.tsx tests/unit/AiMoviePicker.test.tsx
```

Expected: PASS.

## Task 4: Verification And Visual Check

**Files:**
- Modify only if verification reveals issues.

- [ ] **Step 1: Run full test suite**

Run:

```bash
/Users/peihsinwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run:

```bash
/Users/peihsinwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .
```

Expected: exit code 0.

- [ ] **Step 3: Start app for browser verification**

Run:

```bash
/Users/peihsinwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js --host 127.0.0.1
```

Expected: local URL is served.

- [ ] **Step 4: Verify visually in browser**

Use the in-app browser to inspect the AI picker result state at desktop and mobile widths. Confirm:

- Coverflow cards are visible and framed.
- Center card is prominent.
- Controls are reachable.
- Reason panel changes with active card.
- Layout does not overlap on mobile.

