import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/types/user'
import { getSupabaseClient } from './client'

let testAuthClient: unknown | null = null

function getAuthClient() {
  return (
    (testAuthClient as ReturnType<typeof getSupabaseClient> | null) ??
    getSupabaseClient()
  )
}

export function setSupabaseAuthClientForTesting(client: unknown | null) {
  testAuthClient = client
}

function firstString(...values: unknown[]) {
  return (
    values.find(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    ) ?? null
  )
}

export function mapSupabaseUser(user: SupabaseUser): User {
  const metadata = user.user_metadata
  const identityMetadata =
    user.identities?.map((identity) => identity.identity_data) ?? []

  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: firstString(
      metadata.full_name,
      metadata.name,
      metadata.user_name,
      ...identityMetadata.flatMap((identity) => [
        identity?.full_name,
        identity?.name,
        identity?.user_name,
      ]),
    ),
    photoURL: firstString(
      metadata.avatar_url,
      metadata.picture,
      ...identityMetadata.flatMap((identity) => [
        identity?.avatar_url,
        identity?.picture,
      ]),
    ),
  }
}

export type AuthProvider = 'github' | 'google' | 'local'

export async function signInWithProvider(provider: AuthProvider) {
  if (provider === 'local') {
    if (!import.meta.env.DEV || import.meta.env.VITE_LOCAL_SUPABASE !== 'true') {
      throw new Error('Local sign-in is only available in local development')
    }
    const { error } = await getAuthClient().auth.signInAnonymously()
    if (error) throw error
    return
  }

  const redirectTo =
    typeof window === 'undefined' ? undefined : window.location.origin

  const { error } = await getAuthClient().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      ...(provider === 'google'
        ? { queryParams: { prompt: 'select_account' } }
        : {}),
    },
  })

  if (error) {
    throw error
  }
}

export async function signOutFromSupabase() {
  const { error } = await getAuthClient().auth.signOut()

  if (error) {
    throw error
  }
}

export async function getCurrentSupabaseUser() {
  const { data, error } = await getAuthClient().auth.getSession()

  if (error) {
    throw error
  }

  return data.session?.user ? mapSupabaseUser(data.session.user) : null
}

export function subscribeToSupabaseAuthState(
  onUserChange: (user: User | null) => void,
) {
  const { data } = getAuthClient().auth.onAuthStateChange(
    (_event: string, session: Session | null) => {
      onUserChange(session?.user ? mapSupabaseUser(session.user) : null)
    },
  )

  return () => data.subscription.unsubscribe()
}
