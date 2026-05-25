import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'

const basename = '/'

export const router = createBrowserRouter(
  [
    {
      element: <MainLayout />,
      children: [
        {
          path: '/',
          lazy: () => import('@/pages/Home'),
        },
        {
          path: '/movie/:id',
          lazy: () => import('@/pages/MovieDetailPage'),
        },
        {
          path: '/search',
          lazy: () => import('@/pages/Search'),
        },
        {
          path: '/top100',
          lazy: () => import('@/pages/Top100'),
        },
        {
          path: '/random',
          lazy: () => import('@/pages/RandomPick'),
        },
        {
          path: '/wishlist',
          lazy: () => import('@/pages/Wishlist'),
        },
        {
          path: '/history',
          lazy: () => import('@/pages/History'),
        },
        {
          path: '*',
          lazy: () => import('@/pages/NotFound'),
        },
      ],
    },
  ],
  { basename },
)
