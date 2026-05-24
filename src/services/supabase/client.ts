import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type SupabaseEnv = Partial<Record<string, string | undefined>>

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export class SupabaseConfigError extends Error {
  constructor(missingKeys: string[]) {
    super(
      `Missing Supabase environment variables: ${missingKeys.join(', ')}`,
    )
    this.name = 'SupabaseConfigError'
  }
}

const REQUIRED_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const

export function getSupabaseConfig(env: SupabaseEnv = import.meta.env) {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !env[key])

  if (missingKeys.length > 0) {
    throw new SupabaseConfigError(missingKeys)
  }

  return {
    url: env.VITE_SUPABASE_URL as string,
    anonKey: env.VITE_SUPABASE_ANON_KEY as string,
  } satisfies SupabaseConfig
}

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const config = getSupabaseConfig()
  supabaseClient = createClient(config.url, config.anonKey)

  return supabaseClient
}
