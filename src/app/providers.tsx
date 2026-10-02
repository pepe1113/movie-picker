import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { useEffect, type ReactNode } from 'react'
import i18n from '@/i18n/config'
import { useAuthStore } from '@/stores/authStore'
import { useWishlistStore } from '@/stores/wishlistStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const userId = useAuthStore((state) => state.user?.uid ?? null)
  const syncWithRemoteWishlist = useWishlistStore(
    (state) => state.syncWithRemoteWishlist,
  )

  useEffect(() => {
    let cancelled = false
    let cleanup: (() => void) | null = null

    initializeAuth().then((unsubscribe) => {
      if (cancelled) unsubscribe()
      else cleanup = unsubscribe
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [initializeAuth])

  useEffect(() => {
    if (!userId) return

    syncWithRemoteWishlist().catch(() => undefined)
  }, [syncWithRemoteWishlist, userId])

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nextProvider>
  )
}
