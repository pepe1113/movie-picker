// Live benchmark: runs every case in evals/benchmark/cases.json through the
// real planner, TMDB and Jev, grades results with an LLM judge, and checks
// the goals in evals/README.md.
//
//   bun run eval:benchmark                         # current checkout
//   bun run eval:benchmark -- --impl ../main-tree  # another checkout, e.g. a baseline
//   bun run eval:benchmark -- --baseline evals/results/<file>.json
//   bun run eval:benchmark -- --no-judge           # label-free signals only
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { prefersObscure } from '../supabase/functions/recommend-movies/discovery.ts'
import type { CandidateMedia } from '../supabase/functions/recommend-movies/tmdb.ts'
import {
  averageBy,
  checkGoals,
  listSignals,
  ndcgAtK,
  precisionAtK,
  type Grade,
} from './eval/metrics.ts'

interface BenchmarkCase {
  id: number
  tag: string
  locale: 'zh-TW' | 'en'
  media_type: 'movie' | 'tv'
  request: string
}

function arg(name: string) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function env(name: string, fallback?: string) {
  const value =
    process.env[name] ?? (fallback ? process.env[fallback] : undefined)
  if (!value) throw new Error(`Missing ${name} in the local environment`)
  return value
}

const impl = resolve(arg('--impl') ?? '.')
const judgeEnabled = !process.argv.includes('--no-judge')
const suite = JSON.parse(
  readFileSync('evals/benchmark/cases.json', 'utf8'),
) as {
  version: number
  cases: BenchmarkCase[]
}
const only = arg('--cases')?.split(',').map(Number)
const cases = only
  ? suite.cases.filter((c) => only.includes(c.id))
  : suite.cases

const { coordinateRecommendations } = (await import(
  join(impl, 'supabase/functions/recommend-movies/orchestrator.ts')
)) as typeof import('../supabase/functions/recommend-movies/orchestrator.ts')

const config = {
  openaiApiKey: env('OPENAI_API_KEY'),
  openaiBaseUrl: env('OPENAI_BASE_URL'),
  openaiModel: env('OPENAI_MODEL'),
  openrouterApiKey: env('OPENROUTER_API_KEY'),
  tmdbAccessToken: env('TMDB_ACCESS_TOKEN', 'VITE_TMDB_ACCESS_TOKEN'),
  omdbApiKey: process.env.OMDB_API_KEY,
}
const judgeModel = process.env.EVAL_JUDGE_MODEL ?? config.openaiModel

const title = (m: CandidateMedia) =>
  m.media_type === 'movie' ? m.title : m.name
const year = (m: CandidateMedia) =>
  (m.media_type === 'movie' ? m.release_date : m.first_air_date).slice(0, 4)

/** Grades each title 0/1/2 against the request in one judge call. */
async function judge(
  request: string,
  items: CandidateMedia[],
): Promise<Grade[]> {
  if (!judgeEnabled || items.length === 0) return []
  const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: judgeModel,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You grade movie recommendations. For each item return 2 if its core story or viewing experience clearly fits the request, 1 if it fits partly, 0 if it does not fit or there is no evidence. Use your own knowledge of the title, not only the overview. Reply as {"grades":[{"id":number,"grade":0|1|2}]}.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            request,
            items: items.map((m) => ({
              id: m.id,
              title: title(m),
              year: year(m),
              overview: m.overview,
            })),
          }),
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`judge failed: ${response.status}`)
  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }
  const parsed = JSON.parse(data.choices[0]!.message.content) as {
    grades: { id: number; grade: Grade }[]
  }
  const byId = new Map(parsed.grades.map((g) => [g.id, g.grade]))
  return items.map((m) => byId.get(m.id) ?? 0)
}

type Row = BenchmarkCase &
  ReturnType<typeof listSignals> & {
    ok: true
    ms: number
    titles: string[]
    poolEmptyOverviewRate: number
    precision?: number
    ndcg?: number
  }
type FailedRow = BenchmarkCase & { ok: false; error: string }
const rows: (Row | FailedRow)[] = []
for (const item of cases) {
  const startedAt = performance.now()
  try {
    const result = await coordinateRecommendations(
      {
        request: item.request,
        locale: item.locale,
        media_type: item.media_type,
      },
      config,
      AbortSignal.timeout(60_000),
    )
    const ms = performance.now() - startedAt
    const picked = result.recommendations.map(
      (r) => r.media_snapshot as CandidateMedia,
    )
    // Judging the whole pool gives nDCG an ideal order to compare against.
    const poolGrades = await judge(item.request, result.candidates)
    const gradeOf = new Map(
      result.candidates.map((m, i) => [m.id, poolGrades[i] ?? 0]),
    )
    const grades = picked.map((m) => gradeOf.get(m.id) ?? 0)
    rows.push({
      ...item,
      ok: true as const,
      ms,
      titles: picked.map((m) => `${title(m)} (${year(m)}, ${m.vote_count} 票)`),
      ...listSignals(picked, {
        exemptFamiliarity: prefersObscure(item.request),
      }),
      poolEmptyOverviewRate: listSignals(result.candidates).emptyOverviewRate,
      ...(judgeEnabled
        ? { precision: precisionAtK(grades), ndcg: ndcgAtK(grades, poolGrades) }
        : {}),
    })
    console.error(
      `#${item.id} ok ${Math.round(ms)}ms ${picked.map(title).join(' / ')}`,
    )
  } catch (error) {
    rows.push({ ...item, ok: false as const, error: String(error) })
    console.error(`#${item.id} failed: ${String(error)}`)
  }
}

const ok = rows.filter((r): r is Row => r.ok)
const metricKeys = (r: Row) => ({
  returned: r.returned,
  emptyOverviewRate: r.emptyOverviewRate,
  familiarRate: r.familiarRate,
  poolEmptyOverviewRate: r.poolEmptyOverviewRate,
  meanRating: r.meanRating,
  medianVotes: r.medianVotes,
  ms: r.ms,
  ...(r.precision !== undefined
    ? { precision: r.precision, ndcg: r.ndcg! }
    : {}),
})
const averages: Partial<ReturnType<typeof metricKeys>> = averageBy(
  ok.map(metricKeys),
)
// Missing metrics are NaN ("no data"), which checkGoals reports as n/a.
const summary = {
  ...averages,
  emptyOverviewRate: averages.emptyOverviewRate ?? Number.NaN,
  familiarRate: averages.familiarRate ?? Number.NaN,
  failures: rows.length - ok.length,
}

const baselineFile = arg('--baseline')
const baseline = baselineFile
  ? (
      JSON.parse(readFileSync(baselineFile, 'utf8')) as {
        summary: typeof summary
      }
    ).summary
  : undefined
const goals = checkGoals(summary, baseline)

const outDir = 'evals/results'
mkdirSync(outDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outFile = join(outDir, `${stamp}-live.json`)
writeFileSync(
  outFile,
  JSON.stringify(
    {
      suiteVersion: suite.version,
      impl,
      judgeModel,
      planningModel: config.openaiModel,
      summary,
      goals,
      rows,
    },
    null,
    2,
  ) + '\n',
)
console.log(JSON.stringify({ summary, goals }, null, 2))
console.error(`wrote ${outFile}`)
if (goals.some((g) => g.status === 'fail')) process.exitCode = 1
