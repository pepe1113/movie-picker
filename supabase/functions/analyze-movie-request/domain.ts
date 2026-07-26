import { z } from 'zod'

export const MAX_MOVIE_REQUEST_LENGTH = 500

const movieRequestSchema = z
  .object({
    request: z.string().trim().min(2).max(MAX_MOVIE_REQUEST_LENGTH),
    locale: z.enum(['zh-TW', 'en']),
  })
  .strict()

export const movieCriteriaSchema = z
  .object({
    mood: z.enum(['relaxed', 'exciting', 'moving', 'mindBending']),
    occasion: z.enum(['solo', 'date', 'friends', 'family']),
    pace: z.enum(['fast', 'immersive', 'any']),
    era: z.enum(['recent', 'classic', 'any']),
  })
  .strict()

const providerResponseSchema = z
  .object({
    criteria: movieCriteriaSchema,
  })
  .strict()

export type MovieRequest = z.infer<typeof movieRequestSchema>
export type MovieCriteria = z.infer<typeof movieCriteriaSchema>

export function validateMovieRequest(value: unknown): MovieRequest {
  const result = movieRequestSchema.safeParse(value)

  if (!result.success) {
    throw new Error('movie request is invalid')
  }

  return result.data
}

export function parseMovieCriteriaResponse(value: unknown): {
  criteria: MovieCriteria
} {
  const result = providerResponseSchema.safeParse(value)

  if (!result.success) {
    throw new Error('DeepSeek criteria response has an invalid structure')
  }

  return result.data
}

export function createMovieCriteriaPrompt(request: MovieRequest) {
  const outputLanguage =
    request.locale === 'zh-TW' ? 'Traditional Chinese' : 'English'

  return [
    {
      role: 'system',
      content:
        'Convert a movie-watching request into strict JSON with one criteria object. ' +
        'Use exactly these values: mood = relaxed | exciting | moving | mindBending; ' +
        'occasion = solo | date | friends | family; pace = fast | immersive | any; ' +
        'era = recent | classic | any. Infer the closest supported value from the request. ' +
        'Use any only when pace or era is not specified. Never add fields or movie titles.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        request: request.request,
        locale: request.locale,
        input_language: outputLanguage,
      }),
    },
  ]
}
