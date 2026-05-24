import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260524014000_create_wishlist_and_ai_runs.sql',
)

describe('Supabase wishlist and AI runs migration', () => {
  it('creates the expected tables with user-owned columns', () => {
    expect(existsSync(migrationPath)).toBe(true)

    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('create table if not exists public.wishlist_items')
    expect(sql).toContain('user_id uuid not null references auth.users(id)')
    expect(sql).toContain('movie_id integer not null')
    expect(sql).toContain('movie_snapshot jsonb not null')
    expect(sql).toContain('unique (user_id, movie_id)')
    expect(sql).toContain(
      'create table if not exists public.ai_recommendation_runs',
    )
    expect(sql).toContain('answers jsonb not null')
    expect(sql).toContain('candidate_movie_ids integer[] not null')
    expect(sql).toContain('recommendations jsonb not null')
    expect(sql).toContain('provider text not null')
    expect(sql).toContain('model text not null')
  })

  it('enables RLS and scopes access to authenticated row owners', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain(
      'alter table public.wishlist_items enable row level security',
    )
    expect(sql).toContain(
      'alter table public.ai_recommendation_runs enable row level security',
    )
    expect(sql).toContain('grant select, insert, update, delete')
    expect(sql).toContain('to authenticated')
    expect(sql).toContain('with check ((select auth.uid()) = user_id)')
    expect(sql).toContain('using ((select auth.uid()) = user_id)')
    expect(sql).not.toMatch(/to\s+service_role/i)
    expect(sql).not.toContain('profiles')
  })
})
