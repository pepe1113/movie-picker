# AI 選片 Benchmark

用來衡量推薦是否「相關、知名、有簡介」，讓每次調整排序或資料來源時都能和前一版比較。

## 兩種跑法

| 指令                     | 需要金鑰                              | 用途                                                                                                                                   |
| ------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run eval:replay`    | 不用                                  | 用 `docs/evaluations/2026-10-03-rerank/current` 存下的候選池、Jev 分數與人工標註，重播目前的排序程式。只能評估排序，不會抓新的候選片。 |
| `bun run eval:benchmark` | TMDB、OpenAI、OpenRouter（OMDb 可選） | 對 `benchmark/cases.json` 的 20 題實際跑規劃、TMDB、Jev，再用 LLM 評審對結果打 0／1／2 分。                                            |

線上版常用參數：

```bash
# 先在 main 的 worktree 跑出基準
git worktree add ../mp-main main
bun run eval:benchmark -- --impl ../mp-main
# 再跑目前分支並對照基準
bun run eval:benchmark -- --baseline evals/results/<基準檔>.json
# 只跑部分題目、或不呼叫評審
bun run eval:benchmark -- --cases 1,6,11 --no-judge
```

評審模型預設與 `OPENAI_MODEL` 相同，可用 `EVAL_JUDGE_MODEL` 換掉。結果寫在 `evals/results/`。

## 指標

- **Precision@5**：前 5 名裡評為 2 分（明確符合）的比例，分母固定為 5，不足 5 部的空位算未命中。
- **nDCG@5**：和同一候選池的理想排序比較。
- **空白簡介率**：前 5 名裡沒有簡介的比例。
- **知名作品比例**：前 5 名裡電影 ≥ 1000 票、影集 ≥ 300 票的比例。明確要冷門片的題目（tag `obscure`）不計入。
- **票數中位數、平均評分、回傳部數、延遲**：只做參考，沒有門檻。

## 目標（Goals）

程式定義在 `scripts/eval/metrics.ts` 的 `GOALS`。線上版只要有一項沒過，就會以 exit code 1 結束。

| 目標         | 門檻                        |
| ------------ | --------------------------- |
| 空白簡介率   | ≤ 5%                        |
| 知名作品比例 | ≥ 70%                       |
| Precision@5  | 比基準下降不超過 5 個百分點 |
| nDCG@5       | 比基準下降不超過 0.03       |

改題目時請把 `cases.json` 的 `version` 加一。不同版本題庫的結果不能直接比較。
