import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  hasMediaTypeMismatch,
  validateRecommendationRequest,
} from './domain.ts'
import {
  coordinateRecommendations,
  RecommendationConditionError,
  RecommendationStageError,
  type CoordinatorConfig,
} from './orchestrator.ts'
import { createHistoryRecord, saveHistoryInBackground } from './history.ts'

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void
}

const DEADLINE_MS = 30_000

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
  if (!value) throw new Error(`Missing required secret: ${name}`)
  return value
}

function getCoordinatorConfig(): CoordinatorConfig {
  return {
    openaiApiKey: getRequiredEnv('OPENAI_API_KEY'),
    openaiBaseUrl: Deno.env.get('OPENAI_BASE_URL') ?? DEFAULT_OPENAI_BASE_URL,
    openaiModel: Deno.env.get('OPENAI_MODEL') ?? DEFAULT_OPENAI_MODEL,
    tmdbAccessToken: getRequiredEnv('TMDB_ACCESS_TOKEN'),
  }
}

async function handleRecommendation(req: Request, signal: AbortSignal) {
  const authorization = req.headers.get('Authorization')
  if (!authorization) {
    return jsonResponse({ error: 'Authentication required' }, 401)
  }

  const supabase = createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return jsonResponse({ error: 'Authentication required' }, 401)
  }

  let request
  try {
    request = validateRecommendationRequest(await req.json())
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      400,
    )
  }

  if (hasMediaTypeMismatch(request)) {
    return jsonResponse({ error: 'media_type_mismatch' }, 422)
  }

  let result
  try {
    result = await coordinateRecommendations(
      request,
      getCoordinatorConfig(),
      signal,
    )
  } catch (error) {
    if (error instanceof RecommendationConditionError) {
      return jsonResponse(
        { error: error.code, condition: error.condition },
        422,
      )
    }
    if (error instanceof RecommendationStageError) {
      console.error(error.message, error.cause)
      const message =
        error.stage === 'plan'
          ? 'Unable to plan recommendations. Please retry.'
          : 'Unable to find matching titles. Please retry.'
      return jsonResponse({ error: message }, signal.aborted ? 504 : 502)
    }
    throw error
  }

  const historyRecord = createHistoryRecord(
    userData.user.id,
    request.media_type,
    result.plan,
    result.candidates.map((media) => media.id),
    result.recommendations,
    result.resolvedPeople,
    result.resolvedKeywords,
    result.model,
  )
  saveHistoryInBackground(
    (task) => EdgeRuntime.waitUntil(task),
    async () => {
      const { error } = await supabase
        .from('ai_recommendation_runs')
        .insert(historyRecord)
      if (error) throw error
    },
  )

  return jsonResponse({
    media_type: request.media_type,
    direction: {
      summary: result.plan.intent_summary,
      labels: [
        ...result.plan.display_labels.hard.map((text) => ({
          text,
          kind: 'hard',
        })),
        ...result.plan.display_labels.soft.map((text) => ({
          text,
          kind: 'soft',
        })),
      ],
    },
    recommendations: result.recommendations,
    provider: 'openai',
    model: result.model,
    used_fallback: result.usedFallback,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const controller = new AbortController()
  const abortFromClient = () => controller.abort(req.signal.reason)
  req.signal.addEventListener('abort', abortFromClient, { once: true })
  const deadline = setTimeout(
    () => controller.abort(new Error('recommendation deadline exceeded')),
    DEADLINE_MS,
  )

  try {
    return await handleRecommendation(req, controller.signal)
  } catch (error) {
    console.error('recommend-movies failed', error)
    return jsonResponse({ error: 'Recommendation request failed' }, 500)
  } finally {
    clearTimeout(deadline)
    req.signal.removeEventListener('abort', abortFromClient)
  }
})
