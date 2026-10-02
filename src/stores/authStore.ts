import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { AuthProvider } from '@/services/supabase/auth'
import type { User } from '@/types/user'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  signIn: (provider?: AuthProvider) => Promise<void>
  signOut: () => Promise<void>
  initializeAuth: () => Promise<() => void>
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      // Actions
      signIn: async (provider = 'github') => {
        set({ isLoading: true, error: null }, false, 'signIn/start')
        try {
          const { signInWithProvider } =
            await import('@/services/supabase/auth')
          await signInWithProvider(provider)
          set({ isLoading: false }, false, 'signIn/redirectStarted')
        } catch (error) {
          set(
            {
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to start sign-in',
            },
            false,
            'signIn/error',
          )
        }
      },

      signOut: async () => {
        set({ isLoading: true, error: null }, false, 'signOut/start')
        try {
          const { signOutFromSupabase } =
            await import('@/services/supabase/auth')
          await signOutFromSupabase()
          set(
            {
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            },
            false,
            'signOut/success',
          )
        } catch (error) {
          set(
            {
              isLoading: false,
              error:
                error instanceof Error ? error.message : 'Unable to sign out',
            },
            false,
            'signOut/error',
          )
        }
      },

      initializeAuth: async () => {
        set({ isLoading: true, error: null }, false, 'initializeAuth/start')

        try {
          const { getCurrentSupabaseUser, subscribeToSupabaseAuthState } =
            await import('@/services/supabase/auth')
          const user = await getCurrentSupabaseUser()
          set(
            { user, isAuthenticated: user !== null, isLoading: false },
            false,
            'initializeAuth/session',
          )

          return subscribeToSupabaseAuthState((nextUser) => {
            set(
              {
                user: nextUser,
                isAuthenticated: nextUser !== null,
                isLoading: false,
                error: null,
              },
              false,
              'initializeAuth/stateChange',
            )
          })
        } catch (error) {
          set(
            {
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to initialize auth',
            },
            false,
            'initializeAuth/error',
          )
          return () => undefined
        }
      },

      setUser: (user) => {
        set(
          {
            user,
            isAuthenticated: user !== null,
            isLoading: false,
            error: null,
          },
          false,
          'setUser',
        )
      },

      setLoading: (isLoading) => {
        set({ isLoading }, false, 'setLoading')
      },

      setError: (error) => {
        set({ error }, false, 'setError')
      },
    }),
    { name: 'auth-store' },
  ),
)
