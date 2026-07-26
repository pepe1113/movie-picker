import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
} from '../recommend-movies/domain.ts'
import {
  createMovieCriteriaPrompt,
  parseMovieCriteriaResponse,
  validateMovieRequest,
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

async function callDeepSeek(request: ReturnType<typeof validateMovieRequest>) {
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
      messages: createMovieCriteriaPrompt(request),
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    throw new Error('DeepSeek movie request analysis failed')
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (typeof content !== 'string') {
    throw new Error('DeepSeek response did not include JSON content')
  }

  return {
    model,
    ...parseMovieCriteriaResponse(JSON.parse(content)),
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

    const request = validateMovieRequest(await req.json())
    const result = await callDeepSeek(request)

    return jsonResponse({
      criteria: result.criteria,
      provider: 'deepseek',
      model: result.model,
    })
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Movie request analysis failed',
      },
      400,
    )
  }
})
