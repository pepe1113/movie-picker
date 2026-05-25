import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/tmdb/api', () => ({
  discoverMovies: vi.fn(),
}))

beforeAll(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => 'zh-TW'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function renderPicker() {
  const [{ AiMoviePicker }, { default: i18n }] = await Promise.all([
    import('@/components/features/ai-picker/AiMoviePicker'),
    import('@/i18n/config'),
  ])
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AiMoviePicker />
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

describe('AiMoviePicker', () => {
  it(
    'does not skip a question when an option is double-clicked',
    async () => {
      await renderPicker()

      const excitingOption = screen.getByRole('button', { name: /刺激/ })

      fireEvent.click(excitingOption)
      fireEvent.click(excitingOption)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: '這次誰一起看？' }),
        ).toBeVisible()
      })
      expect(
        screen.queryByRole('heading', { name: '你想要什麼節奏？' }),
      ).not.toBeInTheDocument()
    },
    15000,
  )

  it(
    'shows emoji preference badges on answer options',
    async () => {
      await renderPicker()

      const excitingBadge = screen.getByText('⚡ 刺激')

      expect(excitingBadge).toHaveClass('rounded-full', 'text-[1.5em]')
    },
    15000,
  )
})
