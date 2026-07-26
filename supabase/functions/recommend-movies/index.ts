import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  createRecommendationPrompt,
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
  normalizeRecommendations,
  parseProviderRecommendationResponse,
  validateRecommendationRequest,
} from './domain.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`Missing required secret: ${name}`)
  }
  return value
}

async function callDeepSeek(
  request: ReturnType<typeof validateRecommendationRequest>,
) {
  const apiKey = getRequiredEnv('DEEPSEEK_API_KEY')
  const baseUrl = Deno.env.get('DEEPSEEK_BASE_URL') ?? DEFAULT_DEEPSEEK_BASE_URL
  const model = Deno.env.get('DEEPSEEK_MODEL') ?? DEFAULT_DEEPSEEK_MODEL

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: createRecommendationPrompt(request),
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
  })

  if (!response.ok) {
    throw new Error('DeepSeek recommendation request failed')
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (typeof content !== 'string') {
    throw new Error('DeepSeek response did not include JSON content')
  }

  const parsed = parseProviderRecommendationResponse(JSON.parse(content))

  return {
    model,
    recommendations: parsed.recommendations,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return jsonResponse({ error: 'Authentication required' }, 401)
    }

    const supabase = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_ANON_KEY'),
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    )

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Authentication required' }, 401)
    }

    const request = validateRecommendationRequest(await req.json())
    const providerResult = await callDeepSeek(request)
    const recommendations = normalizeRecommendations(
      providerResult.recommendations,
      request.movies,
      request.locale,
    )

    const movieSnapshots = new Map(
      request.movies.map((movie) => [movie.id, movie]),
    )
    const normalizedRecommendations = recommendations.map((item) => ({
      ...item,
      movie_snapshot: movieSnapshots.get(item.movie_id),
    }))

    const { error: insertError } = await supabase
      .from('ai_recommendation_runs')
      .insert({
        user_id: userData.user.id,
        answers: request.answers,
        candidate_movie_ids: request.movies.map((movie) => movie.id),
        recommendations: normalizedRecommendations,
        provider: 'deepseek',
        model: providerResult.model,
      })

    if (insertError) {
      throw new Error(insertError.message)
    }

    return jsonResponse({
      recommendations: normalizedRecommendations,
      provider: 'deepseek',
      model: providerResult.model,
    })
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Recommendation request failed',
      },
      400,
    )
  }
})
