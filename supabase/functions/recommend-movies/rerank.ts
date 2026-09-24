import {
  TMDB_MOVIE_GENRES,
  TMDB_TV_GENRES,
  type CandidateMedia,
  type ContextPlan,
  type ResolvedKeyword,
} from './domain.ts'

const DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions'
const JEV_MODEL = 'typesafe/jev-1.13'
const QUESTION_ID = 'is_relevant'
const RELEVANCE_THRESHOLD = 0.5
const FINAL_RECOMMENDATION_LIMIT = 5

type JevAnswer = {
  model: string
  score: number
  cost?: number
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined
}

export function parseJevAnswer(value: unknown): JevAnswer {
  const response = asRecord(value)
  const answer = asRecord(asRecord(response?.answers)?.[QUESTION_ID])
  const model = response?.model
  const score = answer?.noul
  if (
    answer?.type !== 'noul' ||
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 1 ||
    typeof model !== 'string' ||
    model.length === 0
  ) {
    throw new Error('OpenRouter Decisions response is invalid')
  }

  const cost = asRecord(response?.usage)?.cost
  return {
    model,
    score,
    ...(typeof cost === 'number' && Number.isFinite(cost) && cost >= 0
      ? { cost }
      : {}),
  }
}

function genreNames(candidate: CandidateMedia) {
  const genres =
    candidate.media_type === 'movie' ? TMDB_MOVIE_GENRES : TMDB_TV_GENRES
  const namesById = new Map<number, string>(
    Object.entries(genres).map(([name, id]) => [id, name]),
  )
  return candidate.genre_ids.flatMap((id) => namesById.get(id) ?? [])
}

function candidateState(
  candidate: CandidateMedia,
  plan: ContextPlan,
  resolvedKeywords: ResolvedKeyword[],
) {
  const date =
    candidate.media_type === 'movie'
      ? candidate.release_date
      : candidate.first_air_date
  return {
    direction: {
      summary: plan.intent_summary,
      qualities: plan.soft_preferences.qualities,
      keywords: resolvedKeywords.map((keyword) => keyword.display_label),
      labels: plan.display_labels,
    },
    candidate: {
      id: candidate.id,
      media_type: candidate.media_type,
      title:
        candidate.media_type === 'movie' ? candidate.title : candidate.name,
      overview: candidate.overview,
      genres: genreNames(candidate),
      year: date.slice(0, 4),
      original_language: candidate.original_language,
    },
  }
}

async function scoreCandidate(
  candidate: CandidateMedia,
  plan: ContextPlan,
  resolvedKeywords: ResolvedKeyword[],
  apiKey: string,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const response = await fetcher(DECISIONS_URL, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: JEV_MODEL,
      state: candidateState(candidate, plan, resolvedKeywords),
      questions: {
        [QUESTION_ID]: {
          type: 'noul',
          instructions: '這部候選是否實質符合本次選片目標？',
          criteria: {
            true: 'The core story or viewing experience clearly supports the requested goal and preferences.',
            false:
              'The match is only a broad genre overlap, incidental detail, or lacks evidence in the supplied metadata.',
          },
        },
      },
    }),
  })
  if (!response.ok)
    throw new Error(`OpenRouter Decisions failed: ${response.status}`)
  return parseJevAnswer(await response.json())
}

export async function rerankCandidates(
  candidates: CandidateMedia[],
  plan: ContextPlan,
  resolvedKeywords: ResolvedKeyword[],
  apiKey: string | undefined,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const startedAt = performance.now()
  const settled = apiKey
    ? await Promise.allSettled(
        candidates.map((candidate) =>
          scoreCandidate(
            candidate,
            plan,
            resolvedKeywords,
            apiKey,
            signal,
            fetcher,
          ),
        ),
      )
    : candidates.map(() => ({ status: 'rejected' as const }))
  const scored = settled.flatMap((result, index) =>
    result.status === 'fulfilled'
      ? [{ ...result.value, candidate: candidates[index]!, index }]
      : [],
  )
  const passing = scored
    .filter(({ score }) => score >= RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, FINAL_RECOMMENDATION_LIMIT)
  const fullFallback = scored.length === 0
  const model = scored[0]?.model

  console.info('openrouter rerank completed', {
    candidateCount: candidates.length,
    successCount: scored.length,
    failureCount: candidates.length - scored.length,
    passingCount: passing.length,
    latencyMs: Math.round(performance.now() - startedAt),
    model,
    cost: scored.reduce((total, item) => total + (item.cost ?? 0), 0),
    fullFallback,
  })

  return {
    candidates: fullFallback
      ? candidates.slice(0, FINAL_RECOMMENDATION_LIMIT)
      : passing.map(({ candidate }) => candidate),
    fullFallback,
    model,
  }
}
