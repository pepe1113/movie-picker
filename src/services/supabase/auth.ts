import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/types/user'
import { getSupabaseClient } from './client'

let testAuthClient: unknown | null = null

function getAuthClient() {
  return (testAuthClient as ReturnType<typeof getSupabaseClient> | null) ?? getSupabaseClient()
}

export function setSupabaseAuthClientForTesting(client: unknown | null) {
  testAuthClient = client
}

export function mapSupabaseUser(user: SupabaseUser): User {
  const metadata = user.user_metadata

  return {
    uid: user.id,
    email: user.email ?? null,
    displayName:
      typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string'
          ? metadata.name
          : typeof metadata.user_name === 'string'
            ? metadata.user_name
            : null,
    photoURL:
      typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
  }
}

export async function signInWithGithub() {
  const redirectTo =
    typeof window === 'undefined' ? undefined : window.location.origin

  const { error } = await getAuthClient().auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
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
