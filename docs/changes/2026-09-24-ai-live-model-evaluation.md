# AI live model evaluation log

Date: 2026-09-24

## Changes

- Added `bun run test:ai-live` to call `coordinateRecommendations()` directly with local OpenAI and TMDB credentials.
- Added OpenAI prompt, cached, completion, reasoning, and total token usage to the coordinator result and console output.
- Added per-model cost calculation for `gpt-4o-mini` and `gpt-6-luna`.
- Changed the default model to `gpt-6-luna` with `reasoning_effort: none` for Chat Completions function calling.
- Verified that hard and soft query-plan labels are rendered in the AI result UI.

## Verification

- `bun run test:run`: 88 tests passed.
- `bun run lint`: passed.
- `bun run build`: passed.
- Live comparison command: `bun run test:ai-live -- gpt-4o-mini gpt-6-luna`.

## Live comparison

Input: `我想看 2010 年之後的科幻片，不要太冷門，最好有 Amy Adams。`

| Metric           | `gpt-4o-mini` | `gpt-6-luna` |
| ---------------- | ------------: | -----------: |
| Input tokens     |         1,042 |        1,116 |
| Output tokens    |           134 |          176 |
| Total tokens     |         1,176 |        1,292 |
| Reasoning tokens |             0 |            0 |
| Estimated cost   |   $0.00023670 |  $0.00019960 |
| Duration         |      6,675 ms |     3,785 ms |
| Recommendations  |             4 |            4 |

Luna used 9.9% more total tokens but cost 15.7% less because its token rates are lower. Its single-run latency was 43.3% lower; one request is not enough to treat this as a stable latency benchmark.

Luna produced the more precise plan: it converted "after 2010" to `release_year_min: 2011`, identified Amy Adams as `cast`, localized the summary, and returned labels for year, genre, popularity intent, and actor. GPT-4o Mini used `release_year_min: 2010`, left the person role as `any`, and returned only a science-fiction label.

Both models returned the same four TMDB titles: Arrival, Her, Man of Steel, and Justice League. The current pipeline stores "not too obscure" in `qualities` but does not turn it into a TMDB popularity threshold or ranking weight. It also treats every named person as a filter, so "preferably with Amy Adams" is not yet a genuinely soft preference. These application rules, rather than model quality, now limit the recommendation difference.
