import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('TypewriterHeroTitle', () => {
  it('renders a configurable heading level with typewriter text and cursor', async () => {
    vi.useFakeTimers()

    const { TypewriterHeroTitle } = await import(
      '@/components/features/ai-picker/TypewriterHeroTitle'
    )

    render(
      <TypewriterHeroTitle
        as="h1"
        title="Stop scrolling. Let AI start the movie."
        className="max-w-5xl"
      />,
    )

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Stop scrolling. Let AI start the movie.',
    })

    expect(heading).toHaveClass('hero-title-gradient', 'max-w-5xl')
    expect(heading).toHaveTextContent('')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(heading).toHaveTextContent('Stop scrolling. Let AI start the movie.')
    expect(screen.getByTestId('hero-title-cursor')).toHaveClass(
      'hero-title-cursor',
    )

    vi.useRealTimers()
  })
})
