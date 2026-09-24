import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
} from '../supabase/functions/recommend-movies/domain.ts'
import {
  coordinateRecommendations,
  type CoordinatorConfig,
  type OpenAIUsage,
} from '../supabase/functions/recommend-movies/orchestrator.ts'

const DEFAULT_REQUEST =
  '我想看 2010 年之後的科幻片，不要太冷門，最好有 Amy Adams。'

const PRICING_USD_PER_MILLION = {
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 },
  'gpt-6-luna': { input: 0.1, cachedInput: 0.01, output: 0.5 },
} as const

function requiredEnv(name: string, fallbackName?: string) {
  const value =
    process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined)
  if (!value) {
    const fallback = fallbackName ? ` or ${fallbackName}` : ''
    throw new Error(`Missing ${name}${fallback} in the local environment`)
  }
  return value
}

function calculateCost(model: string, usage?: OpenAIUsage) {
  const pricing =
    PRICING_USD_PER_MILLION[model as keyof typeof PRICING_USD_PER_MILLION]
  if (!usage || !pricing) return undefined
  const cachedTokens = usage.cachedTokens ?? 0
  const uncachedTokens = usage.promptTokens - cachedTokens
  return (
    (uncachedTokens * pricing.input +
      cachedTokens * pricing.cachedInput +
      usage.completionTokens * pricing.output) /
    1_000_000
  )
}

async function run(
  model: string,
  request: string,
  config: Omit<CoordinatorConfig, 'openaiModel'>,
) {
  const startedAt = performance.now()
  const locale = process.env.AI_LIVE_LOCALE === 'en' ? 'en' : 'zh-TW'
  const result = await coordinateRecommendations(
    { request, locale, media_type: 'movie' },
    { ...config, openaiModel: model },
    AbortSignal.timeout(30_000),
  )
  const cost = calculateCost(model, result.usage)

  console.log(`\n=== ${model} ===`)
  console.log('usage', result.usage ?? 'unavailable')
  console.log('estimatedCostUsd', cost?.toFixed(8) ?? 'pricing unavailable')
  console.log('queryPlan', JSON.stringify(result.plan, null, 2))
  console.log('tmdb', {
    candidateCount: result.candidates.length,
    recommendationCount: result.recommendations.length,
    titles: result.recommendations.map(({ media_snapshot: media }) =>
      media.media_type === 'movie' ? media.title : media.name,
    ),
  })
  console.log('provider', result.provider)
  console.log('model', result.model)
  console.log('usedFallback', result.usedFallback)
  console.log('durationMs', Math.round(performance.now() - startedAt))
}

async function main() {
  const models = process.argv.slice(2).filter((value) => value !== '--')
  const request = process.env.AI_LIVE_REQUEST?.trim() || DEFAULT_REQUEST
  const config = {
    openaiApiKey: requiredEnv('OPENAI_API_KEY'),
    openrouterApiKey: requiredEnv('OPENROUTER_API_KEY'),
    openaiBaseUrl: process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL,
    tmdbAccessToken: requiredEnv('TMDB_ACCESS_TOKEN', 'VITE_TMDB_ACCESS_TOKEN'),
  }

  console.log('request', request)
  for (const model of models.length
    ? models
    : [process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL]) {
    await run(model, request, config)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
