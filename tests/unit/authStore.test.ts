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
    vi.unstubAllEnvs()
  })

  it('maps Supabase Auth metadata into the existing user shape', () => {
    expect(mapSupabaseUser(makeSupabaseUser())).toEqual({
      uid: 'supabase-user-id',
      email: 'user@example.com',
      displayName: 'Ada Lovelace',
      photoURL: 'https://example.com/avatar.png',
    })
  })

  it('uses the Google profile picture metadata when avatar_url is absent', () => {
    expect(
      mapSupabaseUser(
        makeSupabaseUser({
          user_metadata: {
            full_name: 'Ada Lovelace',
            picture: 'https://example.com/google-profile.png',
          },
        }),
      ).photoURL,
    ).toBe('https://example.com/google-profile.png')
  })

  it('falls back to linked identity profile data', () => {
    expect(
      mapSupabaseUser(
        makeSupabaseUser({
          user_metadata: {},
          identities: [
            {
              id: 'identity-id',
              user_id: 'supabase-user-id',
              identity_id: 'provider-user-id',
              provider: 'google',
              identity_data: {
                name: 'Grace Hopper',
                picture: 'https://example.com/identity-profile.png',
              },
            },
          ],
        }),
      ),
    ).toMatchObject({
      displayName: 'Grace Hopper',
      photoURL: 'https://example.com/identity-profile.png',
    })
  })

  it.each([
    ['github', { redirectTo: window.location.origin }],
    [
      'google',
      {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    ],
  ] as const)(
    'starts %s OAuth sign-in through Supabase',
    async (provider, options) => {
      const signInWithOAuth = vi
        .fn()
        .mockResolvedValue({ data: {}, error: null })
      setSupabaseAuthClientForTesting({
        auth: {
          signInWithOAuth,
        },
      })

      await useAuthStore.getState().signIn(provider)

      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider,
        options,
      })
      expect(useAuthStore.getState().error).toBeNull()
    },
  )

  it('uses anonymous sign-in for local development', async () => {
    vi.stubEnv('VITE_LOCAL_SUPABASE', 'true')
    const signInAnonymously = vi.fn().mockResolvedValue({ error: null })
    setSupabaseAuthClientForTesting({ auth: { signInAnonymously } })

    await useAuthStore.getState().signIn('local')

    expect(signInAnonymously).toHaveBeenCalledOnce()
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
