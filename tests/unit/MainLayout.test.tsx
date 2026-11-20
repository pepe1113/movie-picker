import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MainLayout } from '@/components/layout/MainLayout'

vi.mock('@/components/layout/Header', () => ({ Header: () => null }))
vi.mock('@/components/layout/Footer', () => ({ Footer: () => null }))
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }))

afterEach(() => vi.restoreAllMocks())

describe('MainLayout', () => {
  it('scrolls to the top after navigating to another page', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    const router = createMemoryRouter(
      [
        {
          element: <MainLayout />,
          children: [
            {
              path: '/first',
              element: <Link to="/movie/1">電影</Link>,
            },
            { path: '/movie/:id', element: <div>電影詳情</div> },
          ],
        },
      ],
      { initialEntries: ['/first'] },
    )

    render(<RouterProvider router={router} />)

    scrollTo.mockClear()
    fireEvent.click(screen.getByRole('link', { name: '電影' }))

    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0))
  })
})
