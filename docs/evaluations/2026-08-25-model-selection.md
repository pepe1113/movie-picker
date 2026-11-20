# 2026-08-25 OpenAI 模型 AI 選片測試報告

## 測試狀態

- 報告建立日期：2026-08-25
- 實測狀態：已完成
- 測試範圍：10 個 AI 選片題目 × 4 個 OpenAI 模型，共 40 次主要呼叫
- 測試環境：本機／非 production；不得更改 production Supabase Secrets
- 測試分支：`feature/switch-model`
- API 路徑：OpenAI `v1/chat/completions`
- AI 階段：只評估一次 forced `plan_movie_search` function call；TMDB 查詢另列為端對端確認

## 測試目標

本次測試要確認哪個模型最適合低推理、結構化的 AI 選片需求。模型必須先穩定產生符合既有工具契約的 TMDB 查詢計畫，再比較條件解析品質、回應時間與成本。

不以一般知識或高推理 benchmark 代替產品測試。OpenAI 官方建議使用符合實際流量的 task-specific eval、記錄執行資料、自動評分並用人工判斷校正；同一輸入也可能得到不同輸出，因此 10 題單次執行只能作為小樣本比較。[Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

## 官方模型規格

以下價格為 2026-08-25 查閱到的 OpenAI 標準文字 token 單價，不含 Batch 折扣、快取折扣或其他工具費用。

| 模型          | Model ID        | Chat Completions | Function calling | Input / 1M tokens | Output / 1M tokens | 官方定位                 |
| ------------- | --------------- | ---------------- | ---------------- | ----------------: | -----------------: | ------------------------ |
| GPT-4o mini   | `gpt-4o-mini`   | 支援             | 支援             |           US$0.15 |            US$0.60 | 快速、低成本、聚焦任務   |
| GPT-5.6 Luna  | `gpt-5.6-luna`  | 支援             | 支援             |           US$0.20 |            US$1.20 | 成本敏感、高流量工作負載 |
| GPT-5.6 Terra | `gpt-5.6-terra` | 支援             | 支援             |           US$2.00 |           US$12.00 | 智慧與成本平衡           |
| GPT-5.6 Sol   | `gpt-5.6-sol`   | 支援             | 支援             |           US$4.00 |           US$20.00 | 複雜專業工作的旗艦模型   |

來源：[OpenAI model catalog](https://developers.openai.com/api/docs/models)、[OpenAI model comparison](https://developers.openai.com/api/docs/models/compare)、[GPT-4o mini model page](https://developers.openai.com/api/docs/models/gpt-4o-mini)。價格可能調整，重新執行報告前應再次核對官方頁面。

## 測試配置

為了貼近現有 `recommend-movies` Edge Function，四個模型使用相同的：

- `createPlanMessages(request)` system／user messages
- `createPlanTool(media_type)` function schema
- forced `tool_choice: plan_movie_search`
- `max_completion_tokens: 900`
- 輸入題目、`locale` 與 `media_type`
- 不啟用 Web search、File search 或其他付費工具

目前 production-equivalent payload 使用 `temperature: 0.2`。如果某模型不接受相同參數，必須記錄實際錯誤與調整後的完整配置，不可在結果中隱藏配置差異。GPT-5.6 若另外測試 `reasoning_effort`，本低推理場景以 `none` 作為延遲基準，`low` 只能列為獨立配置；官方建議在代表性任務上比較配置，不應預設較高推理一定更好。[Model guidance](https://developers.openai.com/api/docs/guides/latest-model)

### 執行環境

| 項目                     | 實際值                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| 執行日期與時區           | 2026-08-25 16:39（Asia/Taipei）                                    |
| Commit / worktree        | `1dc3d2c` / `feature/switch-model`                                 |
| OpenAI endpoint          | `https://api.openai.com/v1/chat/completions`                       |
| 每題重複次數             | 1（本次小樣本）                                                    |
| 共同參數                 | forced tool choice、`max_completion_tokens=900`、`temperature=0.2` |
| GPT-5.6 reasoning effort | `none`                                                             |
| TMDB 是否執行            | 否；只測 AI 查詢計畫層，未寫入 Supabase                            |

## 10 個測試題目

每題都要先檢查 function call 結構，再依預期條件檢查欄位。未要求的演員、導演或硬性限制不得自行加入。

| ID  | Locale  | Media type | 使用者輸入                                                         | 主要預期                                                                                                                                 |
| --- | ------- | ---------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Q01 | `zh-TW` | `movie`    | 最近很累，想看溫暖輕鬆、不用太動腦的電影                           | 不新增人物；以推論型 genre／keyword／quality 表達心情，不捏造硬限制                                                                      |
| Q02 | `zh-TW` | `movie`    | 不要恐怖片，片長 100 分鐘內，只看 2015 年以後的電影                | 排除 Horror；`runtime_max=100`；`release_year_min=2015`                                                                                  |
| Q03 | `zh-TW` | `movie`    | 我想看布萊德彼特主演的犯罪電影                                     | Brad Pitt；角色為 `cast`；Crime 為 explicit；不新增其他人物                                                                              |
| Q04 | `zh-TW` | `movie`    | 宮崎駿導演的奇幻電影                                               | Hayao Miyazaki；角色為 `director`；Fantasy 為 explicit                                                                                   |
| Q05 | `zh-TW` | `tv`       | 想看輕鬆的日本真人影集，不要動畫                                   | 維持 `tv`；日本／日語條件合理；排除 Animation；不新增人物                                                                                |
| Q06 | `en`    | `tv`       | I want a Korean thriller series from 2020 or later, but no horror. | 維持 `tv`；韓國／韓語；`release_year_min=2020`；排除 Horror；英文 labels。實測後確認現有 TV schema 無 Thriller／Horror genre，屬契約缺口 |
| Q07 | `zh-TW` | `movie`    | 週末に家族で気軽に見られる映画がいい。ホラーは避けたい。           | 能理解日文輸入；排除 Horror；輸出摘要與 labels 為繁體中文                                                                                |
| Q08 | `zh-TW` | `movie`    | 想看女同志成長故事，節奏自然，不要恐怖片                           | 以精簡英文 TMDB keyword 查詢；繁中 display label；排除 Horror；不新增人物                                                                |
| Q09 | `zh-TW` | `movie`    | 兩小時內的法國喜劇，1980 年到 2000 年之間                          | `runtime_max=120`；法國／法語；Comedy 為 explicit；年份上下限正確                                                                        |
| Q10 | `zh-TW` | `tv`       | 好笑的，短一點                                                     | 維持 `tv`；能處理短而模糊的輸入；不捏造人物、年份、國家或語言限制                                                                        |

## 評分方法

OpenAI 官方建議把評估做成明確的分類、pairwise comparison 或依特定標準打分，並針對使用工具的系統檢查 tool selection 與 argument precision。[Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

### 1. 必要門檻

每次呼叫必須全部通過，否則該題記為失敗：

1. HTTP／API 呼叫成功。
2. 回傳 `plan_movie_search` function call。
3. Function arguments 是合法 JSON。
4. 通過現有 Zod schema。
5. `media_type` 路由沒有被模型輸出或語意暗中改變。

模型若無法在 10 題中全部通過必要門檻，不進入 production 候選名單。

### 2. 任務正確性

每題依適用項目逐項記錄 pass／fail，不用主觀的綜合印象代替欄位檢查：

- 明確 hard constraints 是否完整且數值正確。
- 指名人物、角色與 people match 是否正確。
- 未指名人物時是否保持 people 空白。
- Explicit／inferred genre 與 keyword source 是否正確。
- Keyword `lookup_name` 是否為精簡英文 TMDB 詞；display label 是否符合 locale。
- 是否遵守 genres、keywords、people、qualities 的數量上限。
- `intent_summary` 與 display labels 是否符合 locale，且沒有揭露推理或診斷使用者。

主要品質指標為「完全正確題數 / 10」與各欄位 pass rate。不要把延遲或價格混進品質分數；通過品質門檻後，再以成本與延遲排序。

### 3. 人工檢查

對 mood、keyword 與 qualities 等沒有唯一答案的欄位，隱藏模型名稱後進行 pass／fail 人工檢查；若要比較兩個都合格的輸出，採 pairwise ranking。這符合官方對 blind human review、pass/fail threshold 與 pairwise comparison 的建議。[Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

### 4. 效能與成本

每次記錄：

- `prompt_tokens`／input tokens
- `completion_tokens`／output tokens（包含 API usage 提供的 reasoning tokens 時，按官方 usage 計價）
- latency milliseconds
- HTTP 狀態、錯誤類型與重試次數
- 單次實際成本

摘要至少提供成功率、平均與 p95 latency、平均 input/output tokens、平均單次成本。

## 實測結果

### 模型摘要

| 模型            | API 成功 / 10 | 結構門檻通過 / 10 | 完全正確 / 10 | 欄位正確率 | 平均 input tokens | 平均 output tokens | 平均 latency |  p95 latency |    測試總成本 |
| --------------- | ------------: | ----------------: | ------------: | ---------: | ----------------: | -----------------: | -----------: | -----------: | ------------: |
| `gpt-4o-mini`   |         10/10 |              9/10 |          5/10 |      80.0% |             704.1 |              121.3 |     2,938 ms |     5,106 ms | US$0.00178395 |
| `gpt-5.6-luna`  |         10/10 |              9/10 |          5/10 |      84.4% |             778.1 |              124.6 |     2,497 ms |     3,803 ms | US$0.00305140 |
| `gpt-5.6-terra` |         10/10 |         **10/10** |          6/10 |      88.6% |             778.1 |              139.7 | **2,336 ms** | **2,870 ms** | US$0.03232600 |
| `gpt-5.6-sol`   |         10/10 |              9/10 |      **7/10** |  **93.3%** |             778.1 |              132.0 |     2,719 ms |     3,705 ms | US$0.05752400 |

「完全正確」採原先的嚴格自動欄位規則；結構失敗的呼叫仍有 token 用量並計入成本。四模型共 40 次呼叫的實際估算 token 成本為 **US$0.09468535**。

### 各題結果

| Model           | Q01            | Q02       | Q03  | Q04     | Q05     | Q06             | Q07    | Q08  | Q09       | Q10     |
| --------------- | -------------- | --------- | ---- | ------- | ------- | --------------- | ------ | ---- | --------- | ------- |
| `gpt-4o-mini`   | PASS           | PASS      | PASS | PARTIAL | PARTIAL | STRUCTURE FAIL  | PASS\* | PASS | PARTIAL   | PARTIAL |
| `gpt-5.6-luna`  | STRUCTURE FAIL | PARTIAL\* | PASS | PASS    | PARTIAL | PARTIAL†        | PASS   | PASS | PARTIAL\* | PASS    |
| `gpt-5.6-terra` | PASS           | PARTIAL\* | PASS | PASS    | PASS    | PARTIAL†        | PASS   | PASS | PARTIAL\* | PARTIAL |
| `gpt-5.6-sol`   | PASS           | PARTIAL\* | PASS | PASS    | PASS    | STRUCTURE FAIL† | PASS   | PASS | PARTIAL\* | PASS    |

- `PASS*`：Q07 自動條件通過，但 GPT-4o mini 的摘要仍是日文，未完全遵守 `zh-TW` 輸出要求。
- `PARTIAL*`：嚴格評分把 `2015 年以後 → 2016`、`法國 → origin_country=FR 但未限制 original_language=fr` 判為缺欄位；人工檢查認為這些結果有語意合理性，不應單獨作為淘汰依據。
- `†`：Q06 暴露 schema 缺口。現有 TV genre 白名單沒有 Thriller 和 Horror；GPT-4o mini 產生不允許的 genre，GPT-5.6 Sol 產生錯誤欄位型別，Luna／Terra 則保留韓國、年份與 thriller keyword，但無法表示「排除恐怖」。

### 主要失敗原因

- `gpt-4o-mini`：Q06 使用 TV schema 不允許的 genre；Q05 漏掉日本地區／日語；Q10 從「短一點」捏造排除 Drama、Crime、Documentary 等硬限制；Q04、Q09 把明確 genre 標成 inferred。
- `gpt-5.6-luna`：Q01 `display_labels.soft` 產生 5 筆，超過 schema 上限 4；其他輸出大多保守，但 Q05 只設定日本地區、未加日語。
- `gpt-5.6-terra`：唯一 10/10 通過結構；Q10 把模糊的「短一點」推成硬性 `runtime_max=30`，屬過度限制。
- `gpt-5.6-sol`：一般欄位正確率最高，但 Q06 把 `include_genres` 回成 object 而不是 array，造成整題結構失敗。

原始執行資料位置：`/tmp/openai-model-benchmark-results.json`（本機暫存，不含 API Key）

## US$10 可運行次數

採未快取的保守估算，依每個模型的實測平均 token 用量計算：

```text
單次成本 = (平均 input tokens / 1,000,000 × input 單價)
         + (平均 output tokens / 1,000,000 × output 單價)

US$10 可運行次數 = floor(10 / 單次成本)
```

若 API usage 顯示 cached input，另列「實測含快取」結果，不可直接假設每次都會命中快取。此估算只包含 OpenAI 文字 token，不包含 Supabase、TMDB、網路或其他營運費用。

| 模型            | 實測平均 input | 實測平均 output |   估算單次成本 | US$10 可運行次數 |
| --------------- | -------------: | --------------: | -------------: | ---------------: |
| `gpt-4o-mini`   |          704.1 |           121.3 | US$0.000178395 | **約 56,055 次** |
| `gpt-5.6-luna`  |          778.1 |           124.6 | US$0.000305140 | **約 32,771 次** |
| `gpt-5.6-terra` |          778.1 |           139.7 | US$0.003232600 |  **約 3,093 次** |
| `gpt-5.6-sol`   |          778.1 |           132.0 | US$0.005752400 |  **約 1,738 次** |

## 2026-08-26 GPT-4o-mini 修正後重測

### 修正內容

- 啟用 OpenAI strict function schema；nullable 欄位全部列入 `required`，本機仍保留 Zod 邊界驗證。
- `temperature` 從 `0.2` 降為 `0`，並收緊 explicit／inferred、hard／soft、輸出語言與禁止捏造條件的說明。
- 新增 `runtime_min`；「短一點的電影」由應用程式穩定映射為 `60–90` 分鐘，並送出 TMDB `with_runtime.gte/lte`。
- TV 不支援 Horror／Thriller genre 時，改以 TMDB keyword 表示；排除條件送出 `without_keywords`，不再拿其他 genres 代替。
- 修正「日本真人影集」規則、日文輸入的繁中摘要，以及 hard／soft 顯示標籤分類。

### 最終 10 題結果

Q01–Q09 沿用原測試題；Q10 改為 `movie / 好笑的，短一點的電影`，明確驗證 60–90 分鐘與不得捏造其他硬限制。每題仍只執行一次。

| 指標               | 修正前 GPT-4o-mini | 修正後 GPT-4o-mini |
| ------------------ | -----------------: | -----------------: |
| API 成功           |              10/10 |          **10/10** |
| 結構門檻           |               9/10 |          **10/10** |
| 完全正確           |               5/10 |          **10/10** |
| 欄位正確率         |              80.0% |           **100%** |
| 平均 input tokens  |              704.1 |            1,030.9 |
| 平均 output tokens |              121.3 |              141.9 |
| 平均 latency       |           2,938 ms |       **2,503 ms** |
| p95 latency        |           5,106 ms |       **3,431 ms** |
| 平均單次成本       |     US$0.000178395 |     US$0.000239775 |
| US$10 可運行次數   |       約 56,055 次 |   **約 41,705 次** |

| Case | 結果 | 修正後主要確認                                                                          |
| ---- | ---- | --------------------------------------------------------------------------------------- |
| Q01  | PASS | 心情只進軟偏好，沒有捏造硬限制                                                          |
| Q02  | PASS | Horror、100 分鐘、2015 年完整保留                                                       |
| Q03  | PASS | Brad Pitt／cast／Crime explicit                                                         |
| Q04  | PASS | 宮崎駿／director／Fantasy explicit                                                      |
| Q05  | PASS | 日本真人影集、日語、日本、排除動畫，心情未混入 hard labels                              |
| Q06  | PASS | Thriller explicit keyword、Horror excluded keyword、2020／韓國條件，未替換成錯誤 genres |
| Q07  | PASS | 日文需求正確解析，摘要與 labels 為繁中                                                  |
| Q08  | PASS | 英文 TMDB keyword、繁中 label、排除 Horror                                              |
| Q09  | PASS | 120 分鐘、FR、1980–2000、Comedy explicit                                                |
| Q10  | PASS | `runtime_min=60`、`runtime_max=90`、Comedy explicit，無其他捏造硬限制                   |

本輪 10 次總 token 成本為 **US$0.00239775**。依平均 input 1,030.9、output 141.9 與 GPT-4o-mini 單價計算：

```text
平均單次成本 = 1,030.9 / 1,000,000 × US$0.15
             + 141.9 / 1,000,000 × US$0.60
             = US$0.000239775

US$10 可運行次數 = floor(10 / 0.000239775)
                  = 41,705 次
```

原始資料：`/tmp/openai-gpt4mini-retest-results.json`（本機暫存，不含 API Key）。本輪仍是 OpenAI 規劃層實測；TMDB `with_runtime.gte`／`without_keywords` 串接由可執行的 orchestrator 測試覆蓋，未呼叫 production Supabase、未部署 Function、未更改 Secrets。

## 結論與建議

- 原始四模型比較仍保留為修正前基準；修正後 `gpt-4o-mini` 已達 API、結構與完整條件 **10/10**。
- 以目前低推理 AI 選片場景，建議改由 **`gpt-4o-mini` 作為 preview／staging 首選**：本輪品質通過，US$10 約 41,705 次，明顯低於 Terra 成本。
- 目前只完成本機分支修改與測試，**production 沒有變更**。正式切換前仍應在測試 Supabase project 做 TMDB 端對端測試，並將 10 題各重跑至少 3 次以降低單次樣本偏差。

## 端對端確認

本次未執行 TMDB 端對端測試，也沒有部署 Supabase Function 或更改 production Secret。模型層選出候選者後，下一階段應以相同 10 題串接 TMDB，確認：

- 人物與 keyword 能由 TMDB 正確解析。
- Discover 結果保留媒體型別、人物、硬限制與 explicit 條件。
- 成功回傳推薦且沒有 production 資料寫入。
- 最終候選模型只先部署到測試 Supabase project；正式環境切換需另外確認。

## 官方來源

- [OpenAI model catalog](https://developers.openai.com/api/docs/models)
- [OpenAI model comparison](https://developers.openai.com/api/docs/models/compare)
- [GPT-4o mini model page](https://developers.openai.com/api/docs/models/gpt-4o-mini)
- [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
