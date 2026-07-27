import type { ContextPlan } from './domain.ts'
import type { recommendationSnapshots } from './orchestrator.ts'

export function createHistoryRecord(
  userId: string,
  plan: ContextPlan,
  candidateIds: number[],
  recommendations: ReturnType<typeof recommendationSnapshots>,
  model: string,
) {
  return {
    user_id: userId,
    intent: {
      summary: plan.intent_summary,
      hard_constraints: plan.hard_constraints,
      soft_preferences: plan.soft_preferences,
      display_labels: plan.display_labels,
    },
    discover_plan: plan.discover_plan,
    candidate_movie_ids: candidateIds,
    recommendations,
    provider: 'openrouter',
    model,
  }
}

export function saveHistoryInBackground(
  waitUntil: (task: Promise<unknown>) => void,
  insert: () => Promise<void>,
  onError: (error: unknown) => void = (error) =>
    console.error('recommendation history background insert failed', error),
) {
  waitUntil(insert().catch(onError))
}
