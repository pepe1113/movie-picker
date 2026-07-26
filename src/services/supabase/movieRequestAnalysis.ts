import { z } from 'zod'
import type { AiPickerAnswers } from '@/utils/aiMoviePicker'
import { getSupabaseClient } from './client'

export const MAX_MOVIE_REQUEST_LENGTH = 500

const movieCriteriaSchema: z.ZodType<AiPickerAnswers> = z
  .object({
    mood: z.enum(['relaxed', 'exciting', 'moving', 'mindBending']),
    occasion: z.enum(['solo', 'date', 'friends', 'family']),
    pace: z.enum(['fast', 'immersive', 'any']),
    era: z.enum(['recent', 'classic', 'any']),
  })
  .strict()

const analysisResponseSchema = z
  .object({
    criteria: movieCriteriaSchema,
    provider: z.literal('deepseek'),
    model: z.string().min(1),
  })
  .strict()

export interface MovieRequestAnalysis {
  criteria: AiPickerAnswers
  provider: 'deepseek'
  model: string
}

export async function analyzeMovieRequest(
  request: string,
  locale: string,
): Promise<MovieRequestAnalysis> {
  try {
    const { data, error } = await getSupabaseClient().functions.invoke<unknown>(
      'analyze-movie-request',
      {
        body: {
          request: request.trim(),
          locale,
        },
        timeout: 20000,
      },
    )

    if (error) {
      throw error
    }

    const result = analysisResponseSchema.safeParse(data)
    if (!result.success) {
      throw new Error('Movie request analysis has an invalid structure')
    }

    return result.data
  } catch (error) {
    console.error('AI movie request analysis failed', error)
    throw error
  }
}
