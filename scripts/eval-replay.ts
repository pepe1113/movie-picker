// Offline benchmark: replays saved candidate pools, Jev scores and labels
// through the current ranking code. Needs no API keys.
//   bun run eval:replay [path/to/evaluation-dir]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { RELAXATION_THRESHOLD } from '../supabase/functions/recommend-movies/domain.ts'
import { blendedScore } from '../supabase/functions/recommend-movies/ranking.ts'
import {
  VOTE_COUNT_TIERS,
  type CandidateMedia,
} from '../supabase/functions/recommend-movies/tmdb.ts'
import {
  averageBy,
  checkGoals,
  listSignals,
  ndcgAtK,
  precisionAtK,
  TOP_K,
  type Grade,
} from './eval/metrics.ts'

const RELEVANCE_THRESHOLD = 0.5
const RATINGS_LOOKUP_LIMIT = 8

interface Pool {
  id: number
  request: { request: string; media_type: 'movie' | 'tv' }
  candidates: CandidateMedia[]
}
interface Run {
  id: number
  repeat: number
  decisions: { id: number; score?: number }[]
}

type Scored = { media: CandidateMedia; semantic: number; index: number }
type Variant = (pool: Pool, scores: Map<number, number>) => CandidateMedia[]

function gated(candidates: CandidateMedia[], scores: Map<number, number>) {
  return candidates
    .map((media, index) => ({ media, semantic: scores.get(media.id), index }))
    .filter(
      (item): item is Scored =>
        item.semantic !== undefined && item.semantic >= RELEVANCE_THRESHOLD,
    )
    .sort((a, b) => b.semantic - a.semantic || a.index - b.index)
}

function blend(items: Scored[]) {
  return items
    .slice(0, RATINGS_LOOKUP_LIMIT)
    .map((item) => ({
      ...item,
      final: blendedScore(item.media, item.semantic),
    }))
    .sort((a, b) => b.final - a.final || a.index - b.index)
    .slice(0, TOP_K)
    .map((item) => item.media)
}

/**
 * Approximates the vote tiers on a saved pool: keep the strictest floor that
 * leaves enough candidates. The live code also fetches new, higher-voted
 * titles, which a replay cannot do, so this understates the change.
 */
function tierFilter(pool: Pool) {
  for (const floor of VOTE_COUNT_TIERS[pool.request.media_type]) {
    const kept = pool.candidates.filter((media) => media.vote_count >= floor)
    if (kept.length >= RELAXATION_THRESHOLD) return kept
  }
  return pool.candidates
}

const variants: Record<string, Variant> = {
  'main（只看語意）': (pool, scores) =>
    gated(pool.candidates, scores)
      .slice(0, TOP_K)
      .map((item) => item.media),
  混合排序: (pool, scores) => blend(gated(pool.candidates, scores)),
  '票數分層＋混合排序': (pool, scores) =>
    blend(gated(tierFilter(pool), scores)),
}

const dir = process.argv[2] ?? 'docs/evaluations/2026-10-03-rerank/current'
const read = (name: string) => JSON.parse(readFileSync(join(dir, name), 'utf8'))
const pools: Pool[] = read('pools.json').pools
const runs: Run[] = read('runs.json').runs
const labels: Record<string, Record<string, { grade: Grade }>> = read(
  'labels.json',
)

const results = Object.entries(variants).map(([name, pick]) => {
  const perCase = pools.map((pool) => {
    const grade = (media: CandidateMedia) =>
      labels[pool.id]?.[media.id]?.grade ?? 0
    const poolGrades = pool.candidates.map(grade)
    const repeats = runs
      .filter((run) => run.id === pool.id)
      .map((run) => {
        const scores = new Map(
          run.decisions.flatMap((d) =>
            typeof d.score === 'number' ? [[d.id, d.score] as const] : [],
          ),
        )
        const picked = pick(pool, scores)
        const grades = picked.map(grade)
        return {
          precision: precisionAtK(grades),
          ndcg: ndcgAtK(grades, poolGrades),
          ...listSignals(picked),
        }
      })
    return {
      id: pool.id,
      request: pool.request.request,
      metrics: averageBy(repeats),
    }
  })
  const summary = averageBy(perCase.map((row) => row.metrics))
  return { name, summary, perCase }
})

const baseline = results[0]!.summary
const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const lines = [
  `# Replay benchmark（${new Date().toISOString().slice(0, 10)}）`,
  '',
  `資料：\`${dir}\`，${pools.length} 題 × ${runs.length / pools.length} 次 Jev 重複；標註為 0／1／2。`,
  '',
  `| 版本 | Precision@5 | nDCG@5 | 回傳部數 | 空白簡介率 | 知名作品比例 | 票數中位數 | 平均評分 |`,
  `| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
  ...results.map(
    ({ name, summary: s }) =>
      `| ${name} | ${pct(s.precision)} | ${s.ndcg.toFixed(3)} | ${s.returned.toFixed(1)} | ${pct(s.emptyOverviewRate)} | ${pct(s.familiarRate)} | ${Math.round(s.medianVotes)} | ${s.meanRating.toFixed(2)} |`,
  ),
  '',
  '## 目標檢查（對照 main）',
  '',
  ...results
    .slice(1)
    .flatMap(({ name, summary }) => [
      `**${name}**`,
      '',
      ...checkGoals(summary, baseline).map(
        (c) => `- ${c.pass ? '✅' : '❌'} ${c.goal}`,
      ),
      '',
    ]),
]
console.log(lines.join('\n'))

const outDir = 'evals/results'
mkdirSync(outDir, { recursive: true })
const outFile = join(
  outDir,
  `${new Date().toISOString().slice(0, 10)}-replay.json`,
)
writeFileSync(outFile, JSON.stringify({ source: dir, results }, null, 2) + '\n')
console.error(`wrote ${outFile}`)
