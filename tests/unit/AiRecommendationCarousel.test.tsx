import { render, screen, waitFor } from '@testing-library/react'
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
    i18n.changeLanguage('en')
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
    await waitFor(() => {
      expect(screen.getByText('Second reason')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /previous/i }))
    await waitFor(() => {
      expect(screen.getByText('First reason')).toBeInTheDocument()
    })
  })

  it('wraps previous from the first recommendation to the last', async () => {
    const user = userEvent.setup()

    renderCarousel([
      makeRecommendation(1, 'First', 'First reason'),
      makeRecommendation(2, 'Second', 'Second reason'),
      makeRecommendation(3, 'Third', 'Third reason'),
    ])

    await user.click(screen.getByRole('button', { name: /previous/i }))

    await waitFor(() => {
      expect(screen.getByText('Third reason')).toBeInTheDocument()
    })
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
