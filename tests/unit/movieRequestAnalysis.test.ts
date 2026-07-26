import { describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '@/services/supabase/client'
import { analyzeMovieRequest } from '@/services/supabase/movieRequestAnalysis'

vi.mock('@/services/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('movie request analysis service', () => {
  it('sends the user request to DeepSeek analysis and validates the result', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        criteria: {
          mood: 'relaxed',
          occasion: 'date',
          pace: 'immersive',
          era: 'recent',
        },
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
      },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    const result = await analyzeMovieRequest('  想看溫暖的近年電影  ', 'zh-TW')

    expect(invoke).toHaveBeenCalledWith('analyze-movie-request', {
      body: {
        request: '想看溫暖的近年電影',
        locale: 'zh-TW',
      },
      timeout: 8000,
    })
    expect(result.criteria).toEqual({
      mood: 'relaxed',
      occasion: 'date',
      pace: 'immersive',
      era: 'recent',
    })
  })

  it('rejects malformed DeepSeek criteria before TMDB can use them', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        criteria: {
          mood: 'cozy',
          occasion: 'date',
          pace: 'immersive',
          era: 'recent',
        },
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
      },
      error: null,
    })
    vi.mocked(getSupabaseClient).mockReturnValue({
      functions: { invoke },
    } as unknown as ReturnType<typeof getSupabaseClient>)

    await expect(
      analyzeMovieRequest('想看溫暖的近年電影', 'zh-TW'),
    ).rejects.toThrow('Movie request analysis has an invalid structure')
  })
})
