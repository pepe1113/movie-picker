import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260524014000_create_wishlist_and_ai_runs.sql',
)
const replacementMigrationPath = join(
  process.cwd(),
  'supabase/migrations/20260726171508_replace_ai_recommendation_history.sql',
)
const mediaTypeMigrationPath = join(
  process.cwd(),
  'supabase/migrations/20260726000000_add_wishlist_media_type.sql',
)
const recommendationMediaMigrationPath = join(
  process.cwd(),
  'supabase/migrations/20260801075037_make_ai_recommendation_history_media_neutral.sql',
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

  it('clears only legacy recommendation runs and adds the new intent shape', () => {
    const sql = readFileSync(replacementMigrationPath, 'utf8')

    expect(sql).toContain('delete from public.ai_recommendation_runs')
    expect(sql).toContain('rename column answers to intent')
    expect(sql).toContain('add column discover_plan jsonb not null')
    expect(sql).not.toMatch(/delete\s+from\s+public\.wishlist_items/i)
    expect(sql).not.toMatch(/delete\s+from\s+auth\./i)
    expect(sql.match(/\bdelete\s+from\b/gi)).toHaveLength(1)
  })

  it('keys wishlist rows by media type and TMDB id', () => {
    expect(existsSync(mediaTypeMigrationPath)).toBe(true)

    const sql = readFileSync(mediaTypeMigrationPath, 'utf8')

    expect(sql).toContain(
      "add column if not exists media_type text not null default 'movie'",
    )
    expect(sql).toContain("check (media_type in ('movie', 'tv'))")
    expect(sql).toContain('unique (user_id, media_type, movie_id)')
  })

  it('makes AI recommendation history media neutral without changing RLS', () => {
    expect(existsSync(recommendationMediaMigrationPath)).toBe(true)
    const sql = readFileSync(recommendationMediaMigrationPath, 'utf8')

    expect(sql).toContain(
      'rename column candidate_movie_ids to candidate_media_ids',
    )
    expect(sql).toContain("add column media_type text not null default 'movie'")
    expect(sql).toContain("check (media_type in ('movie', 'tv'))")
    expect(sql).not.toMatch(/drop\s+policy|disable\s+row\s+level/i)
  })
})
