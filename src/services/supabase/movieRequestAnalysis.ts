import { z } from 'zod'
import type { AiPickerAnswers } from '@/utils/aiMoviePicker'
import { getSupabaseClient } from './client'

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
  const { data, error } = await getSupabaseClient().functions.invoke<unknown>(
    'analyze-movie-request',
    {
      body: {
        request: request.trim(),
        locale,
      },
      timeout: 8000,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  const result = analysisResponseSchema.safeParse(data)
  if (!result.success) {
    throw new Error('Movie request analysis has an invalid structure')
  }

  return result.data
}
