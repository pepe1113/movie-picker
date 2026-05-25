import { describe, expect, it } from 'vitest'
import {
  getSupabaseConfig,
  SupabaseConfigError,
} from '@/services/supabase/client'

describe('supabase client config', () => {
  it('reads only the public Vite Supabase env vars', () => {
    const config = getSupabaseConfig({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
      DEEPSEEK_API_KEY: 'must-not-be-read',
      SUPABASE_SERVICE_ROLE_KEY: 'must-not-be-read',
    })

    expect(config).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'public-anon-key',
    })
  })

  it('throws a clear config error when Supabase env vars are missing', () => {
    expect(() => getSupabaseConfig({})).toThrow(SupabaseConfigError)
    expect(() => getSupabaseConfig({})).toThrow(
      'Missing Supabase environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY',
    )
  })

  it('does not treat privileged or provider secrets as valid frontend config', () => {
    expect(() =>
      getSupabaseConfig({
        DEEPSEEK_API_KEY: 'provider-secret',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
      }),
    ).toThrow('VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
  })
})
