import {
  genresFor,
  type MediaType,
  type RecommendationRequest,
} from './domain.ts'
import { fetchJson } from './upstream.ts'

const OPENAI_TOKEN_ALERT_THRESHOLD = 20_000

export interface PlanningConfig {
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
}

export interface OpenAIUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cachedTokens?: number
  reasoningTokens?: number
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined
}

function parseOpenAIUsage(data: unknown): OpenAIUsage | undefined {
  const usage = asRecord(asRecord(data)?.usage)
  if (!usage) return undefined

  const { prompt_tokens, completion_tokens, total_tokens } = usage
  if (
    typeof prompt_tokens !== 'number' ||
    typeof completion_tokens !== 'number' ||
    typeof total_tokens !== 'number'
  ) {
    return undefined
  }

  const promptDetails = asRecord(usage.prompt_tokens_details)
  const completionDetails = asRecord(usage.completion_tokens_details)
  const cachedTokens = promptDetails?.cached_tokens
  const reasoningTokens = completionDetails?.reasoning_tokens

  return {
    promptTokens: prompt_tokens,
    completionTokens: completion_tokens,
    totalTokens: total_tokens,
    ...(typeof cachedTokens === 'number' ? { cachedTokens } : {}),
    ...(typeof reasoningTokens === 'number' ? { reasoningTokens } : {}),
  }
}

export function parseToolArguments(value: unknown, expectedToolName: string) {
  const choices = asRecord(value)?.choices
  const message = Array.isArray(choices)
    ? asRecord(asRecord(choices[0])?.message)
    : undefined
  const calls = message?.tool_calls
  const call = Array.isArray(calls)
    ? calls.find(
        (item) => asRecord(asRecord(item)?.function)?.name === expectedToolName,
      )
    : undefined
  const args = asRecord(asRecord(call)?.function)?.arguments
  if (typeof args !== 'string') {
    throw new Error(`AI model did not call ${expectedToolName}`)
  }

  try {
    return JSON.parse(args) as unknown
  } catch {
    throw new Error(`AI model returned invalid ${expectedToolName} arguments`)
  }
}

export function createPlanMessages(request: RecommendationRequest) {
  const language =
    request.locale === 'zh-TW' ? 'Traditional Chinese' : 'English'
  return [
    {
      role: 'system',
      content: `Create a safe TMDB ${request.media_type} query plan and call plan_movie_search. The UI-selected media type is ${request.media_type}; never infer or change it. Translate every summary, display label, and person name into ${language}, even when the request uses another language; do not copy untranslated input into those fields. Only add a person when the user explicitly names them. Use at most two people with role cast, director, writer, producer, or any; default to any-match and use all-match only when the user explicitly asks for shared participation. Genre values must use the supplied canonical genre names, never TMDB IDs. Never substitute an unavailable genre concept with different genres; represent the unavailable included concept as a soft keyword and the unavailable excluded concept as exclude_keywords. Keyword lookup_name values must be concise English TMDB terms, never IDs; display_label remains localized. Mark a genre or keyword explicit when the user names that concept; use inferred only for mood interpretation. Only explicit restrictions belong in hard_constraints: never invent exclusions, durations, years, languages, or countries. A country does not imply a language, and a language does not imply a country. Use runtime fields only for stated numeric durations; the application separately maps the phrase short movie to 60–90 minutes. Qualities may describe only qualities or moods requested by the user; never add popularity, ratings, critical acclaim, recency, or video quality by default. Explicit goals override inferred mood direction. Use at most three included genres, three excluded genres, two included keywords, two excluded keywords, and three qualities. Do not diagnose the user, reveal reasoning, infer celebrities, or use reference-movie searches.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        request: request.request,
        locale: request.locale,
        media_type: request.media_type,
      }),
    },
  ]
}

export function createPlanTool(mediaType: MediaType) {
  const genreNames = Object.keys(genresFor(mediaType))
  return {
    type: 'function',
    function: {
      name: 'plan_movie_search',
      description: `Return the validated contextual ${mediaType} search plan.`,
      strict: true,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: [
          'intent_summary',
          'hard_constraints',
          'soft_preferences',
          'people',
          'people_match',
          'display_labels',
        ],
        properties: {
          intent_summary: {
            type: 'string',
            description:
              'Concise summary translated into the requested locale; never copy untranslated input.',
          },
          hard_constraints: {
            type: 'object',
            additionalProperties: false,
            required: [
              'exclude_genres',
              'exclude_keywords',
              'runtime_min',
              'runtime_max',
              'release_year_min',
              'release_year_max',
              'original_language',
              'origin_country',
            ],
            properties: {
              exclude_genres: {
                type: 'array',
                maxItems: 3,
                items: { type: 'string', enum: genreNames },
                description:
                  'Only allowed genre concepts the user explicitly negated; never inferred substitutes.',
              },
              exclude_keywords: {
                type: 'array',
                maxItems: 2,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['lookup_name', 'display_label'],
                  properties: {
                    lookup_name: {
                      type: 'string',
                      description: 'Concise English TMDB keyword term.',
                    },
                    display_label: {
                      type: 'string',
                      description: 'Localized label for the excluded concept.',
                    },
                  },
                },
              },
              runtime_min: {
                type: ['integer', 'null'],
                minimum: 1,
                maximum: 360,
                description: 'Explicit numeric minimum runtime only.',
              },
              runtime_max: {
                type: ['integer', 'null'],
                minimum: 1,
                maximum: 360,
                description: 'Explicit numeric maximum runtime only.',
              },
              release_year_min: {
                type: ['integer', 'null'],
                minimum: 1870,
                maximum: 2100,
                description: 'Explicit minimum release year only.',
              },
              release_year_max: {
                type: ['integer', 'null'],
                minimum: 1870,
                maximum: 2100,
                description: 'Explicit maximum release year only.',
              },
              original_language: {
                type: ['string', 'null'],
                pattern: '^[a-z]{2}$',
                description: 'ISO language code only when explicitly stated.',
              },
              origin_country: {
                type: ['string', 'null'],
                pattern: '^[A-Z]{2}$',
                description: 'ISO country code only when explicitly stated.',
              },
            },
          },
          soft_preferences: {
            type: 'object',
            additionalProperties: false,
            required: ['include_genres', 'keywords', 'qualities'],
            properties: {
              include_genres: {
                type: 'array',
                maxItems: 3,
                description:
                  'Allowed genre concepts only; unavailable concepts belong in keywords, never substitute genres.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['name', 'source'],
                  properties: {
                    name: { type: 'string', enum: genreNames },
                    source: { type: 'string', enum: ['explicit', 'inferred'] },
                  },
                },
              },
              keywords: {
                type: 'array',
                maxItems: 2,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['lookup_name', 'display_label', 'source'],
                  properties: {
                    lookup_name: { type: 'string' },
                    display_label: { type: 'string' },
                    source: { type: 'string', enum: ['explicit', 'inferred'] },
                  },
                },
              },
              qualities: {
                type: 'array',
                maxItems: 3,
                items: { type: 'string' },
                description:
                  'Only requested moods or qualities; no default popularity, rating, acclaim, recency, or video quality.',
              },
            },
          },
          people: {
            type: 'array',
            maxItems: 2,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'role'],
              properties: {
                name: { type: 'string' },
                role: {
                  type: 'string',
                  enum: ['cast', 'director', 'writer', 'producer', 'any'],
                },
              },
            },
          },
          people_match: { type: 'string', enum: ['any', 'all'] },
          display_labels: {
            type: 'object',
            additionalProperties: false,
            required: ['hard', 'soft'],
            properties: {
              hard: { type: 'array', maxItems: 6, items: { type: 'string' } },
              soft: { type: 'array', maxItems: 4, items: { type: 'string' } },
            },
          },
        },
      },
    },
  } as const
}

export async function requestRecommendationPlan(
  request: RecommendationRequest,
  config: PlanningConfig,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const tool = createPlanTool(request.media_type)
  const data = await fetchJson(
    fetcher,
    `${config.openaiBaseUrl}/chat/completions`,
    {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages: createPlanMessages(request),
        tools: [tool],
        tool_choice: {
          type: 'function',
          function: { name: tool.function.name },
        },
        max_completion_tokens: 900,
        temperature: 0,
        ...(config.openaiModel === 'gpt-6-luna'
          ? { reasoning_effort: 'none' }
          : {}),
      }),
    },
    'AI model request failed',
  )
  const usage = parseOpenAIUsage(data)
  if (usage && usage.totalTokens > OPENAI_TOKEN_ALERT_THRESHOLD) {
    console.warn('openai token usage alert', {
      model: config.openaiModel,
      threshold: OPENAI_TOKEN_ALERT_THRESHOLD,
      ...usage,
    })
  }
  return {
    plan: parseToolArguments(data, tool.function.name),
    usage,
  }
}
