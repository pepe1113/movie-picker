import { describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '@/services/supabase/client'
import {
  getMediaDetail,
  MediaDetailRequestError,
} from '@/services/supabase/mediaDetail'

vi.mock('@/services/supabase/client', () => ({ getSupabaseClient: vi.fn() }))

function mockInvoke(data: unknown, error: unknown = null) {
  const invoke = vi.fn().mockResolvedValue({ data, error })
  vi.mocked(getSupabaseClient).mockReturnValue({
    functions: { invoke },
  } as unknown as ReturnType<typeof getSupabaseClient>)
  return invoke
}

describe('media detail client', () => {
  it('makes one invoke call with media type, ID, language and abort signal', async () => {
    const invoke = mockInvoke({
      detail: {
        id: 42,
        title: 'Movie',
        genres: [],
        vote_count: 1,
        vote_average: 8,
      },
      credits: { cast: [] },
      videos: { results: [] },
      omdb: null,
    })
    const controller = new AbortController()

    const result = await getMediaDetail('movie', 42, 'en-US', controller.signal)

    expect(invoke).toHaveBeenCalledOnce()
    expect(invoke).toHaveBeenCalledWith('media-detail', {
      body: { media_type: 'movie', id: 42, language: 'en-US' },
      signal: controller.signal,
      timeout: 8_500,
    })
    expect(result.detail.id).toBe(42)
  })

  it('surfaces 404 responses and rejects invalid result shape', async () => {
    mockInvoke(null, { context: new Response('{}', { status: 404 }) })
    await expect(getMediaDetail('movie', 42, 'zh-TW')).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<MediaDetailRequestError>)

    mockInvoke({
      detail: {
        id: 42,
        title: 'Movie',
        genres: null,
        vote_count: 1,
        vote_average: 8,
      },
      credits: { cast: [] },
      videos: { results: [] },
      omdb: null,
    })
    await expect(getMediaDetail('movie', 42, 'zh-TW')).rejects.toThrow(
      'invalid structure',
    )
  })

  it('rejects TV responses that cannot render the TV page', async () => {
    mockInvoke({
      detail: {
        id: 42,
        name: 'TV',
        genres: [],
        vote_count: 1,
        vote_average: 8,
      },
      credits: { cast: [] },
      videos: { results: [] },
      omdb: null,
    })
    await expect(getMediaDetail('tv', 42, 'zh-TW')).rejects.toThrow(
      'invalid structure',
    )
  })
})
