import { describe, expect, it, vi } from 'vitest'
import {
  anonymousDailyLimit,
  consumeAnonymousQuota,
  DEFAULT_ANONYMOUS_DAILY_LIMIT,
  getOptionalUserId,
  hasUserAuthorization,
} from '../../supabase/functions/recommend-movies/access'

describe('recommendation access', () => {
  it('distinguishes a user JWT from the public project key', () => {
    expect(hasUserAuthorization(null, 'public-key', 'public-key')).toBe(false)
    expect(
      hasUserAuthorization('Bearer public-key', 'public-key', 'public-key'),
    ).toBe(false)
    expect(
      hasUserAuthorization('Bearer user-jwt', 'public-key', 'public-key'),
    ).toBe(true)
  })

  it('returns only a server-verified user id', async () => {
    expect(await getOptionalUserId(null)).toBeNull()
    expect(
      await getOptionalUserId({
        auth: {
          getUser: async () => ({
            data: { user: { id: 'verified-user' } },
            error: null,
          }),
        },
      }),
    ).toBe('verified-user')
    expect(
      await getOptionalUserId({
        auth: {
          getUser: async () => ({
            data: { user: null },
            error: new Error('invalid token'),
          }),
        },
      }),
    ).toBeNull()
  })

  it('uses a bounded guest quota and fails closed on quota errors', async () => {
    expect(anonymousDailyLimit(undefined)).toBe(DEFAULT_ANONYMOUS_DAILY_LIMIT)
    expect(anonymousDailyLimit('75')).toBe(75)
    expect(anonymousDailyLimit('0')).toBe(DEFAULT_ANONYMOUS_DAILY_LIMIT)
    expect(anonymousDailyLimit('1001')).toBe(DEFAULT_ANONYMOUS_DAILY_LIMIT)

    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('db down') })
    const client = { rpc }

    await expect(consumeAnonymousQuota(client, 50)).resolves.toBe(true)
    await expect(consumeAnonymousQuota(client, 50)).resolves.toBe(false)
    await expect(consumeAnonymousQuota(client, 50)).rejects.toThrow('db down')
    expect(rpc).toHaveBeenCalledWith('consume_anonymous_recommendation_quota', {
      p_daily_limit: 50,
    })
  })
})
