// Shared metrics for the recommendation benchmark (see evals/README.md).
import type { CandidateMedia } from '../../supabase/functions/recommend-movies/tmdb.ts'

export const TOP_K = 5
/** Vote count from which a title counts as widely seen (TV gets fewer votes). */
export const FAMILIAR_VOTES = { movie: 1000, tv: 300 } as const
const isFamiliar = (m: CandidateMedia) =>
  m.vote_count >= FAMILIAR_VOTES[m.media_type]

/** 0 = no evidence of fit, 1 = partial fit, 2 = clear fit. */
export type Grade = 0 | 1 | 2

export function precisionAtK(grades: Grade[], k = TOP_K) {
  return grades.slice(0, k).filter((grade) => grade === 2).length / k
}

function dcg(grades: Grade[], k: number) {
  return grades
    .slice(0, k)
    .reduce<number>(
      (total, grade, index) => total + (2 ** grade - 1) / Math.log2(index + 2),
      0,
    )
}

/** nDCG@k against the best order of `pool`, so shorter lists are not rewarded. */
export function ndcgAtK(grades: Grade[], pool: Grade[], k = TOP_K) {
  const ideal = dcg(
    [...pool].sort((a, b) => b - a),
    k,
  )
  return ideal === 0 ? 1 : dcg(grades, k) / ideal
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/** Label-free quality signals for a returned list. */
export function listSignals(items: CandidateMedia[]) {
  const n = items.length || 1
  return {
    returned: items.length,
    emptyOverviewRate: items.filter((m) => !m.overview.trim()).length / n,
    familiarRate: items.filter(isFamiliar).length / n,
    medianVotes: median(items.map((m) => m.vote_count)),
    meanRating: items.reduce((t, m) => t + m.vote_average, 0) / n,
  }
}

export type ListSignals = ReturnType<typeof listSignals>

export function mean(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

/** Averages each numeric field over cases. */
export function averageBy<T extends Record<string, number>>(rows: T[]) {
  const keys = Object.keys(rows[0] ?? {}) as (keyof T)[]
  return Object.fromEntries(
    keys.map((key) => [key, mean(rows.map((row) => row[key]))]),
  ) as T
}

/** Benchmark goals; a run passes when every check holds. See evals/README.md. */
export const GOALS = {
  maxEmptyOverviewRate: 0.05,
  minFamiliarRate: 0.7,
  maxPrecisionDrop: 0.05,
  maxNdcgDrop: 0.03,
} as const

export function checkGoals(
  candidate: {
    emptyOverviewRate: number
    familiarRate: number
    precision?: number
    ndcg?: number
  },
  baseline?: { precision?: number; ndcg?: number },
) {
  const checks = [
    {
      goal: `top-${TOP_K} 空白簡介率 ≤ ${GOALS.maxEmptyOverviewRate * 100}%`,
      pass: candidate.emptyOverviewRate <= GOALS.maxEmptyOverviewRate,
    },
    {
      goal: `top-${TOP_K} 中知名作品（電影 ≥ ${FAMILIAR_VOTES.movie} 票、影集 ≥ ${FAMILIAR_VOTES.tv} 票）比例 ≥ ${GOALS.minFamiliarRate * 100}%`,
      pass: candidate.familiarRate >= GOALS.minFamiliarRate,
    },
  ]
  if (baseline?.precision !== undefined && candidate.precision !== undefined) {
    checks.push({
      goal: `Precision@${TOP_K} 不低於基準 ${GOALS.maxPrecisionDrop * 100} 個百分點以上`,
      pass: candidate.precision >= baseline.precision - GOALS.maxPrecisionDrop,
    })
  }
  if (baseline?.ndcg !== undefined && candidate.ndcg !== undefined) {
    checks.push({
      goal: `nDCG@${TOP_K} 不低於基準 ${GOALS.maxNdcgDrop} 以上`,
      pass: candidate.ndcg >= baseline.ndcg - GOALS.maxNdcgDrop,
    })
  }
  return checks
}
