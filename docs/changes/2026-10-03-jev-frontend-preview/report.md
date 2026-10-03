# Jev PR 衝突修正與前端等待時間實測

PR：[Movie Picker #20](https://github.com/pepe1113/movie-picker/pull/20)。衝突修正 commit：`9ab79a3`，包含 master `348cad3`。PR 尚未合併。

## 結果

10 種需求各跑一次，9 次成功、1 次失敗。成功樣本送出到結果顯示的中位數 **4.11 秒**、最慢 **5.61 秒**；送出到海報完成的中位數 **4.50 秒**、最慢 **6.22 秒**。所有成功樣本海報解碼錯誤均為 0。正式環境網路、冷啟動與重複測量未包含，這不是穩定的 production p95。

| 案例 | 結果         | 結果顯示秒 | 海報完成秒 | 海報數 | Jev ms | Jev USD                |
| ---- | ------------ | ---------- | ---------- | ------ | ------ | ---------------------- |
| 1    | 成功         | 5.61       | 6.22       | 3      | 613    | 8.022e-05              |
| 2    | 成功         | 3.41       | 3.45       | 5      | 408    | 0.00050106             |
| 3    | 成功         | 4.53       | 4.56       | 1      | 364    | 0.0005392379999999999  |
| 4    | 成功         | 3.45       | 3.57       | 1      | 388    | 0.00010609200000000001 |
| 5    | 成功         | 4.24       | 4.50       | 5      | 413    | 0.0005791800000000001  |
| 6    | 成功         | 3.97       | 4.12       | 3      | 284    | 0.00010999799999999999 |
| 7    | 成功         | 4.11       | 4.97       | 5      | 329    | 0.0006271860000000001  |
| 8    | 成功         | 4.67       | 5.26       | 5      | 854    | 0.000495852            |
| 9    | 主題解析失敗 | 2.64       | 2.67       | 0      | —      | —                      |
| 10   | 成功         | 3.32       | 3.45       | 2      | 517    | 0.0004462499999999999  |

案例順序與原本 10 項評估一致：工作動力、下班療癒、約會喜劇、反轉懸疑、家庭動畫、Amy Adams 科幻、日語療癒、辦公室影集、英文職涯挫折、英文人際科幻。完整需求、未四捨五入的時間與 rerank 紀錄在 [timings.json](./timings.json)。

第 9 例顯示 `We could not resolve the theme starting over after career failure. Try a more common phrase.`，約 2.64 秒顯示錯誤，發生在 Jev 之前。這不是 Jev 故障，也不能算成成功推薦的等待時間。

9 次 rerank 共處理 129 個候選、全部 provider 呼叫成功，成本合計 **US$0.003485076**，每次平均 **US$0.000387231**；不含 query planning 與其他 API 成本。Jev 階段中位數 **408 ms**、最慢 **854 ms**。原先的瀏覽器實測只開啟 rerank；下方另補同環境 API 有／無 Jev 比較，仍不能把階段延遲直接當成前端增量。

## 測量方式與環境

預覽：[http://127.0.0.1:5174](http://127.0.0.1:5174)。API：`127.0.0.1:55321`，DB：`55322`，project id：`movie-picker-jev-preview`。前端直接送出實際表單，呼叫隔離本機 Functions、真實 planning/TMDB/OpenRouter。前 8 項為 zh-TW，第 8 項選影集，第 9、10 項切 English、電影；皆未登入。

`preview-timing.ts` 只在 DEV 且 `VITE_LOCAL_SUPABASE=true` 載入，capture submit 作起點；MutationObserver 確認完成進度條或錯誤，再經兩次 requestAnimationFrame 記錄結果顯示近似時間；等待結果區全部 image.decode() 後再經兩次 RAF，記錄海報完成。兩次 RAF 是繪製近似值，並非精確像素顯示儀器。API Resource Timing 與兩種前端時間分開保存，不包含自動操作工具等待。production build 未含此工具。

CLI 2.101.0、Docker Desktop、Postgres 17.6 image `17.6.1.121`、GoTrue `v2.189.0`、PostgREST `v14.5`、Edge Runtime `v1.73.13`。啟動時 Docker credential helper 卡住，使用 `/private/tmp/movie-picker-docker-config` 空 auth 的暫存設定；原 Docker 設定未改。為利用 cached images，暫時將前三個映像掛上 CLI 所需標籤，實際版本以上述來源為準；不把這個版本映射當成正式環境驗證。開機未完成留下空 schema，後續以 `supabase migration up --local` 套用本預覽 migrations；沒有改遠端 DB。

## 重跑

```sh
bun --env-file=/path/to/.env.local run dev:local
```

環境檔需要 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`、`OPENROUTER_API_KEY` 與 `TMDB_ACCESS_TOKEN`（或 `VITE_TMDB_ACCESS_TOKEN`）。開啟預覽後送出需求，Console 的 `ai-picker frontend wait` 印出 JSON，同時 Performance entries 有 `ai-picker:frontend-wait`。本機 Functions 可從 Docker logs 讀到 Jev 成本與延遲；不要輸出或提交 env/secrets。若 Docker helper 卡住，可用該次專用暫存 Docker config 與原 socket，無需修改使用者設定。

## 驗證與判斷

138 tests / 29 files、format、lint、build 全部通過；GitHub 衝突修正 revision 的 CI 與 Vercel check 通過。前端 Vercel 預覽本身不代表隔離 backend 已部署，這份端到端數據來自上述本機環境。

這批樣本顯示 rerank 的價格與約 0.4 秒階段中位數並不高，完整推薦仍約 3.3～5.6 秒才顯示。可以繼續試用，但是否值得正式上線，仍要連同原品質評估中的演員誤判、較少推薦數與人工驗證考量；解除衝突不等於已解決這些語意問題。

## 補測：有／無 Jev 的 API 回傳時間比較

補測時間：`2026-10-03T09:29:03.777Z`。同一份 PR revision `b963b67`、同一本機 Supabase endpoint、相同 10 種需求，每種各做 2 組有／無 Jev，共 40 次 HTTP 請求。第一輪先無 Jev，第二輪反向順序；每次等待 response.text() 收完整 JSON 本文才停止計時。不包含前端繪製或海報載入，與上表的前端等待時間分開解讀。

| 指標           | 無 Jev   | 有 Jev   |
| -------------- | -------- | -------- |
| HTTP 200 回傳  | 20/20    | 19/20    |
| 正常回傳中位數 | 2.839 秒 | 3.018 秒 |
| 正常回傳平均   | 2.929 秒 | 3.115 秒 |
| 正常回傳最慢   | 4.959 秒 | 4.576 秒 |

**兩組正常回傳的中位數差距約 179 ms（6.3%）**。以同案例、同輪且兩邊皆 HTTP 200 的 19 組配對計算，中位數差為 **123 ms**；這與兩組整體中位數相減是不同統計。

以下時間是各案例正常回傳樣本的平均值；最後欄依序為無 Jev、有 Jev 的正常回傳次數。第 9 例有 Jev 欄只剩 1 個正常樣本，差值不適合當成穩定效果。

| 案例             | 無 Jev 秒 | 有 Jev 秒 | 有−無 秒 | 正常回傳次數 |
| ---------------- | --------- | --------- | -------- | ------------ |
| 1 工作動力       | 3.982     | 3.138     | -0.844   | 2/2、2/2     |
| 2 下班療癒       | 2.204     | 2.554     | +0.350   | 2/2、2/2     |
| 3 約會喜劇       | 3.227     | 3.075     | -0.152   | 2/2、2/2     |
| 4 反轉懸疑       | 2.811     | 3.867     | +1.056   | 2/2、2/2     |
| 5 家庭動畫       | 2.945     | 3.351     | +0.406   | 2/2、2/2     |
| 6 Amy Adams 科幻 | 3.035     | 3.042     | +0.007   | 2/2、2/2     |
| 7 日語療癒       | 2.536     | 3.091     | +0.555   | 2/2、2/2     |
| 8 辦公室影集     | 2.769     | 3.117     | +0.348   | 2/2、2/2     |
| 9 英文職涯挫折   | 2.896     | 3.007     | +0.111   | 2/2、1/2     |
| 10 英文人際科幻  | 2.883     | 2.849     | -0.034   | 2/2、2/2     |

第 9 例第一輪的「有 Jev」請求約 2.345 秒回傳 HTTP 422 `unresolved_keyword`，發生在主題解析／候選搜尋階段、尚未進入 rerank；不納入正常回傳統計。第二輪同需求成功，說明候選規劃本身存在波動。HTTP 200 也只代表請求完成，不代表推薦品質已通過人工評估。

### 如何關閉與驗證

只在隔離 worktree 暫時讓 coordinator 呼叫讀取 `x-preview-rerank: off`，將 `openrouterApiKey` 設為 undefined。沿用 PR 既有 fallback：不呼叫 Jev、依原候選順序取最多 5 筆，其餘規劃、TMDB、匿名 quota、回應序列化相同。正常 baseline 的 response provider/model 全部為 `openai / gpt-6-luna`；有 Jev 的正常 response 全部為 `openrouter / typesafe/jev-1.13-20260917`。測量完成已還原 index.ts，這個 header 開關未提交，也未部署 production。

首次暫時修改造成服務 reload 期間立即回傳 502；該批作廢，等服務重載完成後重跑，未混入上述 40 次結果。原始狀態、case、round、mode、elapsedMs、provider/model 與推薦數在 [api-comparison.json](./api-comparison.json)。

### 解讀與限制

這輪顯示正常 API 回傳約 2.8～3.0 秒，加入 Jev 的整體中位數差距不大；成本與等待時間目前都支持繼續試用。**不能宣稱 Jev 固定只增加 179 ms**：每次仍獨立執行 planning、TMDB 與 provider 呼叫，候選可能不同；部分有 Jev 的請求甚至比 baseline 快。這是同環境完整請求對照，不是固定 candidate pool 的純 rerank 速度實驗，也未測 production 冷啟動。每種僅 2 組，尚不足以報告穩定 p95。

是否值得上線仍應同時看品質；這次比較沒有修正原評估指出的演員誤判、推薦數減少等問題。
