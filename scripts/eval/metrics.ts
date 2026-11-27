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

/**
 * Label-free quality signals for a returned list. Rates are NaN ("no data")
 * for an empty list, so returning nothing cannot improve them. Familiarity
 * is NaN when the user asked for little-known titles.
 */
export function listSignals(
  items: CandidateMedia[],
  { exemptFamiliarity = false } = {},
) {
  const n = items.length
  const rate = (count: number) => (n ? count / n : Number.NaN)
  return {
    returned: n,
    emptyOverviewRate: rate(items.filter((m) => !m.overview.trim()).length),
    familiarRate: exemptFamiliarity
      ? Number.NaN
      : rate(items.filter(isFamiliar).length),
    medianVotes: n ? median(items.map((m) => m.vote_count)) : Number.NaN,
    meanRating: rate(items.reduce((t, m) => t + m.vote_average, 0)),
  }
}

export type ListSignals = ReturnType<typeof listSignals>

/** Mean of the finite values; NaN when there are none. */
export function mean(values: number[]) {
  const finite = values.filter(Number.isFinite)
  return finite.length
    ? finite.reduce((a, b) => a + b, 0) / finite.length
    : Number.NaN
}

/** Averages each numeric field over cases, skipping cases with no data. */
export function averageBy<T extends Record<string, number>>(rows: T[]) {
  const keys = [
    ...new Set(rows.flatMap((row) => Object.keys(row))),
  ] as (keyof T)[]
  return Object.fromEntries(
    keys.map((key) => [key, mean(rows.map((row) => row[key] ?? Number.NaN))]),
  ) as T
}

/** Benchmark goals; a run passes when no check fails. See evals/README.md. */
export const GOALS = {
  maxEmptyOverviewRate: 0.05,
  minFamiliarRate: 0.7,
  maxPrecisionDrop: 0.05,
  maxNdcgDrop: 0.03,
} as const

export type GoalStatus = 'pass' | 'fail' | 'n/a'
export const GOAL_ICON: Record<GoalStatus, string> = {
  pass: '✅',
  fail: '❌',
  'n/a': '➖',
}

/** 'n/a' when there is no data to judge, so it never fails a run. */
function judge(value: number | undefined, ok: (value: number) => boolean) {
  if (value === undefined || !Number.isFinite(value)) return 'n/a' as const
  return ok(value) ? ('pass' as const) : ('fail' as const)
}

export function checkGoals(
  candidate: {
    emptyOverviewRate: number
    familiarRate: number
    precision?: number
    ndcg?: number
  },
  baseline?: { precision?: number; ndcg?: number },
) {
  const checks: { goal: string; status: GoalStatus }[] = [
    {
      goal: `top-${TOP_K} 空白簡介率 ≤ ${GOALS.maxEmptyOverviewRate * 100}%`,
      status: judge(
        candidate.emptyOverviewRate,
        (v) => v <= GOALS.maxEmptyOverviewRate,
      ),
    },
    {
      goal: `top-${TOP_K} 中知名作品（電影 ≥ ${FAMILIAR_VOTES.movie} 票、影集 ≥ ${FAMILIAR_VOTES.tv} 票）比例 ≥ ${GOALS.minFamiliarRate * 100}%（不含要求冷門片的題目）`,
      status: judge(candidate.familiarRate, (v) => v >= GOALS.minFamiliarRate),
    },
  ]
  if (
    baseline?.precision !== undefined &&
    Number.isFinite(baseline.precision)
  ) {
    const floor = baseline.precision - GOALS.maxPrecisionDrop
    checks.push({
      goal: `Precision@${TOP_K} 不低於基準 ${GOALS.maxPrecisionDrop * 100} 個百分點以上`,
      status: judge(candidate.precision, (v) => v >= floor),
    })
  }
  if (baseline?.ndcg !== undefined && Number.isFinite(baseline.ndcg)) {
    const floor = baseline.ndcg - GOALS.maxNdcgDrop
    checks.push({
      goal: `nDCG@${TOP_K} 不低於基準 ${GOALS.maxNdcgDrop} 以上`,
      status: judge(candidate.ndcg, (v) => v >= floor),
    })
  }
  return checks
}
