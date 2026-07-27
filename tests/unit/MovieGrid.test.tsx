import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MovieGrid } from '@/components/features/movie/MovieGrid'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('MovieGrid', () => {
  it('keeps infinite loading available when the current filtered page is empty', () => {
    render(
      <MovieGrid
        movies={[]}
        hasNextPage
        onLoadMore={vi.fn()}
        emptyMessage="No series on this page"
      />,
    )

    expect(screen.getByText('No series on this page')).toBeInTheDocument()
    expect(screen.getByTestId('movie-grid-load-more')).toBeInTheDocument()
  })
})
