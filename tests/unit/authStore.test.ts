import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import {
  mapSupabaseUser,
  setSupabaseAuthClientForTesting,
} from '@/services/supabase/auth'
import { useAuthStore } from '@/stores/authStore'

function makeSupabaseUser(overrides: Partial<SupabaseUser> = {}) {
  return {
    id: 'supabase-user-id',
    email: 'user@example.com',
    user_metadata: {
      full_name: 'Ada Lovelace',
      avatar_url: 'https://example.com/avatar.png',
      user_name: 'ada',
    },
    ...overrides,
  } as SupabaseUser
}

describe('Supabase auth integration', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    setSupabaseAuthClientForTesting(null)
  })

  it('maps Supabase Auth metadata into the existing user shape', () => {
    expect(mapSupabaseUser(makeSupabaseUser())).toEqual({
      uid: 'supabase-user-id',
      email: 'user@example.com',
      displayName: 'Ada Lovelace',
      photoURL: 'https://example.com/avatar.png',
    })
  })

  it('starts GitHub OAuth sign-in through Supabase', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null })
    setSupabaseAuthClientForTesting({
      auth: {
        signInWithOAuth,
      },
    })

    await useAuthStore.getState().signIn()

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    })
    expect(useAuthStore.getState().error).toBeNull()
  })

  it('loads the current session and updates when auth state changes', async () => {
    let authStateCallback:
      | ((event: string, session: Pick<Session, 'user'> | null) => void)
      | null = null
    const unsubscribe = vi.fn()
    const sessionUser = makeSupabaseUser({ id: 'session-user-id' })
    const changedUser = makeSupabaseUser({ id: 'changed-user-id' })

    setSupabaseAuthClientForTesting({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: sessionUser } },
          error: null,
        }),
        onAuthStateChange: vi.fn(
          (
            callback: (
              event: string,
              session: Pick<Session, 'user'> | null,
            ) => void,
          ) => {
            authStateCallback = callback
            return { data: { subscription: { unsubscribe } } }
          },
        ),
      },
    })

    const cleanup = await useAuthStore.getState().initializeAuth()

    expect(useAuthStore.getState().user?.uid).toBe('session-user-id')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    const emitAuthStateChange = authStateCallback as unknown as (
      event: string,
      session: Pick<Session, 'user'> | null,
    ) => void
    emitAuthStateChange('SIGNED_IN', { user: changedUser })

    expect(useAuthStore.getState().user?.uid).toBe('changed-user-id')

    cleanup()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('signs out through Supabase and clears local auth state', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    setSupabaseAuthClientForTesting({
      auth: {
        signOut,
      },
    })
    useAuthStore.getState().setUser(mapSupabaseUser(makeSupabaseUser()))

    await useAuthStore.getState().signOut()

    expect(signOut).toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
