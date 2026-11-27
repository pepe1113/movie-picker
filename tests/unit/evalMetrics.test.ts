import { describe, expect, it } from 'vitest'
import { averageBy, checkGoals, listSignals } from '../../scripts/eval/metrics'

describe('benchmark metrics', () => {
  it('reports no data, not a perfect rate, for an empty list', () => {
    const signals = listSignals([])
    expect(signals.returned).toBe(0)
    expect(signals.emptyOverviewRate).toBeNaN()
    expect(signals.familiarRate).toBeNaN()
  })

  it('averages only cases that have data', () => {
    expect(
      averageBy([{ rate: 0.5 }, { rate: Number.NaN }, { rate: 0.1 }]).rate,
    ).toBeCloseTo(0.3)
  })

  it('marks goals without data as n/a instead of failing them', () => {
    const goals = checkGoals(
      { emptyOverviewRate: Number.NaN, familiarRate: Number.NaN },
      { precision: 0.5, ndcg: 0.9 },
    )
    expect(goals.map((goal) => goal.status)).toEqual([
      'n/a',
      'n/a',
      'n/a',
      'n/a',
    ])
    expect(
      checkGoals({ emptyOverviewRate: 0.2, familiarRate: 0.8 }).map(
        (goal) => goal.status,
      ),
    ).toEqual(['fail', 'pass'])
  })
})
