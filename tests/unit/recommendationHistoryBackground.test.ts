import { describe, expect, it, vi } from 'vitest'
import {
  createHistoryRecord,
  saveHistoryInBackground,
} from '../../supabase/functions/recommend-movies/history'
import { parseContextPlan } from '../../supabase/functions/recommend-movies/domain'

const plan = parseContextPlan(
  {
    intent_summary: '今晚用輕鬆作品轉換心情',
    hard_constraints: {
      exclude_genres: ['horror'],
    },
    soft_preferences: {
      include_genres: [{ name: 'comedy', source: 'inferred' }],
      keywords: [],
      qualities: ['輕鬆'],
    },
    people: [],
    people_match: 'any',
    display_labels: {
      hard: ['不要恐怖片'],
      soft: ['輕鬆'],
    },
  },
  'movie',
)

describe('recommendation history background task', () => {
  it('creates a structured record without raw input or provider responses', () => {
    const record = createHistoryRecord(
      'user-id',
      'movie',
      plan,
      [1],
      [],
      [],
      [],
      'test/model',
    )

    expect(record).toMatchObject({
      user_id: 'user-id',
      media_type: 'movie',
      intent: {
        summary: '今晚用輕鬆作品轉換心情',
        hard_constraints: { exclude_genre_ids: [27] },
        soft_preferences: { qualities: ['輕鬆'] },
      },
      discover_plan: {
        include_genres: [{ id: 35, source: 'inferred' }],
        exclude_genre_ids: [27],
      },
      candidate_media_ids: [1],
      provider: 'openai',
      model: 'test/model',
    })
    expect(JSON.stringify(record)).not.toContain('raw')
    expect(record).not.toHaveProperty('request')
    expect(record).not.toHaveProperty('prompt')
  })

  it('registers pending persistence without waiting for it to finish', async () => {
    let finishInsert: () => void = () => undefined
    const insert = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishInsert = resolve
        }),
    )
    let task: Promise<unknown> | undefined
    const waitUntil = vi.fn((pending: Promise<unknown>) => {
      task = pending
    })

    expect(saveHistoryInBackground(waitUntil, insert)).toBeUndefined()
    expect(waitUntil).toHaveBeenCalledOnce()
    expect(insert).toHaveBeenCalledOnce()

    finishInsert()
    await task
  })

  it('contains insert failures inside the background task', async () => {
    const error = new Error('insert failed')
    const onError = vi.fn()
    let task: Promise<unknown> | undefined

    saveHistoryInBackground(
      (pending) => {
        task = pending
      },
      () => Promise.reject(error),
      onError,
    )
    await task

    expect(onError).toHaveBeenCalledWith(error)
  })
})
