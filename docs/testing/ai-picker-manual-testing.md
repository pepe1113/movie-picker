# AI Picker 手動測試指南

本文件記錄 AI Picker 的三種手動測試方式：前端 UI、本機完整前後端，以及真實 AI 品質與成本測試。自動化測試仍應先執行 `bun run test:run`；本文件專注於自動化測試無法完全覆蓋的瀏覽器互動、Supabase 權限邊界與真實第三方 API 行為。

## 測試範圍

| 層級             | 驗證目標                                             | 是否使用真實第三方 API | 是否產生費用       |
| ---------------- | ---------------------------------------------------- | ---------------------- | ------------------ |
| 前端手動測試     | UI、響應式、模板、載入與登入提示                     | 視前端連線環境而定     | 視前端連線環境而定 |
| 本機完整前後端   | React → Edge Function → Postgres／RLS → OpenAI／TMDB | 是                     | 是                 |
| 真實 AI 品質測試 | Query plan、推薦品質、token、成本與延遲              | 是                     | 是                 |

## 安全規則

- `.env.local` 只放瀏覽器可用的 `VITE_*` 值，以及只供本機腳本讀取、沒有 `VITE_` 前綴的 server-side key。
- `OPENAI_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 與其他 secret 不得使用 `VITE_` 前綴，也不得貼進測試報告、截圖或 Git。
- 本機 Function secret 放在已被 `.gitignore` 排除的 `supabase/functions/.env`。
- 瀏覽器只能使用專案 URL 與 public anon key；目前匿名身分判斷仍使用 `SUPABASE_ANON_KEY`，本機測試請沿用 `supabase status` 顯示的 anon key。
- 不要用 production 環境進行大量額度、錯誤或壓力測試。

官方參考：[Supabase Local Development](https://supabase.com/docs/guides/local-development)、[Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)、[Edge Function development environment](https://supabase.com/docs/guides/functions/development-environment)。

## 1. 前端手動測試

### 1.1 準備環境

依照專案根目錄的 `.env.example` 建立 `.env.local`：

```dotenv
VITE_TMDB_ACCESS_TOKEN=你的_TMDB_TOKEN
VITE_SUPABASE_URL=測試環境的_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=測試環境的_PUBLIC_ANON_KEY
```

啟動前端：

```bash
bun run dev
```

開啟終端顯示的本機網址，並同時開啟瀏覽器 DevTools 的 Network 與 Console。

### 1.2 UI 與互動檢查

| ID    | 操作                           | 預期結果                                                                                |
| ----- | ------------------------------ | --------------------------------------------------------------------------------------- |
| FE-01 | 未登入開啟首頁                 | AI Picker 可使用，顯示「登入後會保存推薦紀錄」提示                                      |
| FE-02 | 依序點擊四個模板               | 卡片只顯示 emoji 與短名稱；文字框會帶入完整需求，但不會自動送出                         |
| FE-03 | 空白或只輸入一個字後送出       | 顯示輸入錯誤，不發出推薦請求                                                            |
| FE-04 | 未登入輸入有效需求並送出       | 顯示輕鬆的載入文字、原始 Nyan Cat 圖與進度；完成後顯示推薦結果                          |
| FE-05 | 切換「影集」後送出             | Request 的 `media_type` 為 `tv`，結果只包含影集                                         |
| FE-06 | 切換繁中／英文                 | 標題、模板、提示、載入與錯誤文字同步切換                                                |
| FE-07 | 將 viewport 設為 390px         | 卡片、文字框、按鈕不超出畫面；英文模板名稱可換行                                        |
| FE-08 | 開啟減少動態效果後重新載入     | Nyan Cat 不執行上下浮動動畫，內容與進度仍可理解                                         |
| FE-09 | 未登入完成推薦後查看歷史       | 匿名推薦不會出現在個人歷史                                                              |
| FE-10 | 登入後完成推薦並重新整理歷史頁 | 推薦紀錄仍存在，媒體類型、intent summary、query plan 與結果一致；歷史不保存原始輸入文字 |

### 1.3 Network 與 Console 檢查

成功送出時應只有一個主要請求：

```text
POST /functions/v1/recommend-movies
```

確認：

- 成功為 HTTP `200`，回應包含 `direction`、`recommendations` 與 `query_plan`。
- Request body 包含 `request`、`locale`、`media_type`。
- 未登入請求只使用 public anon key；登入請求由 Supabase client 附上使用者 access token。
- Network、Console 與前端 bundle 不得出現 OpenAI key 或 service role key。
- 一般操作沒有未處理例外、無限重試或重複 Function 請求。

## 2. 本機完整前後端測試

### 2.1 前置條件

- 已安裝 Bun、Supabase CLI 與 Docker 相容的 container runtime。
- 專案已有 `supabase/config.toml`，不需要再次執行 `supabase init`。
- 本機測試會呼叫真實 OpenAI／TMDB，會消耗 API 額度。

### 2.2 啟動本機 Supabase

在專案根目錄執行：

```bash
supabase start
supabase status
```

記下本機 API URL、Studio URL 與 anon key。`supabase start` 會套用 migrations；不要把本機 secret 或 service role key記進測試報告。

建立 `supabase/functions/.env`：

```dotenv
OPENAI_API_KEY=你的_OPENAI_KEY
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-6-luna
TMDB_ACCESS_TOKEN=你的_TMDB_TOKEN
OMDB_API_KEY=選填
ANONYMOUS_RECOMMENDATIONS_ENABLED=true
ANONYMOUS_DAILY_LIMIT=50
```

`supabase start` 會自動載入 `supabase/functions/.env`。需要獨立重啟 Function、觀察即時 log 或使用另一個 env 檔時，可在另一個終端執行：

```bash
supabase functions serve --env-file supabase/functions/.env
```

將前端 `.env.local` 指向本機 Supabase：

```dotenv
VITE_TMDB_ACCESS_TOKEN=你的_TMDB_TOKEN
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=supabase_status_顯示的_anon_key
```

重啟前端：

```bash
bun run dev
```

### 2.3 直接呼叫 Edge Function

以未登入訪客身分呼叫 `recommend-movies`：

```bash
curl -i http://127.0.0.1:54321/functions/v1/recommend-movies \
  -H "Content-Type: application/json" \
  -H "apikey: 本機_anon_key" \
  -H "Authorization: Bearer 本機_anon_key" \
  -H "Accept: application/vnd.movie-picker.query-plan+json" \
  -d '{
    "request": "想看輕鬆喜劇，不要恐怖",
    "locale": "zh-TW",
    "media_type": "movie"
  }'
```

測試媒體詳情：

```bash
curl -i http://127.0.0.1:54321/functions/v1/media-detail \
  -H "Content-Type: application/json" \
  -H "apikey: 本機_anon_key" \
  -H "Authorization: Bearer 本機_anon_key" \
  -d '{
    "media_type": "movie",
    "id": 550,
    "language": "zh-TW"
  }'
```

### 2.4 建立本機登入測試帳號

前端目前只提供 GitHub／Google OAuth。為了不依賴本機 OAuth provider，權限測試改用 Supabase Auth REST API 建立兩個只存在本機的 email/password 帳號。

建立帳號 A；再以不同 email 重複一次建立帳號 B：

```bash
curl -i http://127.0.0.1:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: 本機_anon_key" \
  -d '{
    "email": "tester-a@example.com",
    "password": "local-only-password-A!"
  }'
```

登入帳號 A 取得 access token；帳號 B 使用自己的 email/password 重複執行：

```bash
curl -i 'http://127.0.0.1:54321/auth/v1/token?grant_type=password' \
  -H "Content-Type: application/json" \
  -H "apikey: 本機_anon_key" \
  -d '{
    "email": "tester-a@example.com",
    "password": "local-only-password-A!"
  }'
```

從回應中暫時複製 `access_token`，只用於本機終端，不要寫進文件或 Git。以帳號 A 的 token 呼叫推薦 Function：

```bash
curl -i http://127.0.0.1:54321/functions/v1/recommend-movies \
  -H "Content-Type: application/json" \
  -H "apikey: 本機_anon_key" \
  -H "Authorization: Bearer 帳號_A_access_token" \
  -d '{
    "request": "想看輕鬆喜劇，不要恐怖",
    "locale": "zh-TW",
    "media_type": "movie"
  }'
```

等待背景寫入完成後，分別使用 A、B 的 token 查詢歷史：

```bash
curl -i 'http://127.0.0.1:54321/rest/v1/ai_recommendation_runs?select=id,user_id,media_type,intent,recommendations' \
  -H "apikey: 本機_anon_key" \
  -H "Authorization: Bearer 帳號_A_access_token"
```

```bash
curl -i 'http://127.0.0.1:54321/rest/v1/ai_recommendation_runs?select=id,user_id,media_type,intent,recommendations' \
  -H "apikey: 本機_anon_key" \
  -H "Authorization: Bearer 帳號_B_access_token"
```

帳號 A 應看到自己的紀錄，帳號 B 應得到空陣列。這同時驗證 Function 使用呼叫者 JWT 寫入，以及資料庫查詢套用該使用者的 RLS context。

### 2.5 權限與錯誤矩陣

| ID    | 情境                | 測試方式                                                                 | 預期結果                                                       |
| ----- | ------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| BE-01 | 匿名推薦            | anon key 呼叫 `recommend-movies`                                         | HTTP `200`；不建立個人歷史列                                   |
| BE-02 | 登入推薦            | 依 2.4 建立帳號 A，使用 A 的 access token 呼叫 Function                  | HTTP `200`；A 查詢 `ai_recommendation_runs` 時看得到自己的紀錄 |
| BE-03 | 無效 JWT            | Authorization 使用隨機 bearer 字串                                       | HTTP `401`                                                     |
| BE-04 | 匿名功能停用        | 將 `ANONYMOUS_RECOMMENDATIONS_ENABLED=false` 後重啟 Function             | 匿名請求回 HTTP `503`；登入請求仍可使用                        |
| BE-05 | 匿名額度用完        | 在全新的本機測試資料上將 `ANONYMOUS_DAILY_LIMIT=1`，連續發送兩次匿名請求 | 第一次通過，第二次回 HTTP `429` 並帶 `Retry-After`             |
| BE-06 | 無效 JSON／缺少欄位 | 傳入空物件或錯誤型別                                                     | HTTP `400`                                                     |
| BE-07 | 媒體型別衝突        | `request` 明確寫「想看影集」，但 `media_type` 傳入 `movie`               | HTTP `422`                                                     |
| BE-08 | 上游規劃失敗        | 使用無效 OpenAI key 的隔離 env 啟動 Function                             | HTTP `502`，log 不得輸出 key                                   |
| BE-09 | RLS 使用者隔離      | 依 2.4 分別用 A、B 的 access token 查詢歷史                              | A 看得到自己的紀錄；B 得到空陣列，看不到 A 的紀錄              |
| BE-10 | 背景寫入失敗        | 在隔離本機環境使歷史 insert 失敗後送出已登入推薦                         | 已完成的推薦仍回成功；Function log 顯示不含 secret 的寫入錯誤  |

使用 Supabase Studio 檢查資料時，只記錄 row 數、測試 user ID 的遮蔽版本與結果，不要複製 access token 或完整個資。

### 2.6 結束本機環境

```bash
supabase stop
```

需要清掉本機資料時才執行 `supabase db reset`；這會刪除並重建本機資料庫，不得對 production 使用。

## 3. 真實 AI 品質與成本測試

這個測試直接執行共用 coordinator，呼叫 OpenAI 與 TMDB，但不經過 Supabase Auth、Edge Function HTTP 或資料庫，因此不能取代第 2 節的權限測試。

### 3.1 準備環境

在 `.env.local` 設定：

```dotenv
OPENAI_API_KEY=你的_OPENAI_KEY
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-6-luna
TMDB_ACCESS_TOKEN=你的_TMDB_TOKEN
```

執行預設測試：

```bash
bun run test:ai-live
```

比較多個模型：

```bash
bun run test:ai-live -- gpt-4o-mini gpt-6-luna
```

指定測試輸入：

```bash
AI_LIVE_REQUEST='今天很累，想看輕鬆好懂的喜劇或動畫，不要恐怖。' \
  bun run test:ai-live -- gpt-6-luna
```

### 3.2 四個模板測試

每個模板至少執行一次。推薦片名可能因模型、日期及 TMDB 資料改變，不應將固定片名當成 pass 條件。

| ID    | 模板     | 正式測試輸入                                                         | 測試重點                                               |
| ----- | -------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| AI-01 | 輕鬆入門 | 想看一部輕鬆好懂的喜劇或動畫作品，口碑不錯，不要恐怖、沉重或太血腥。 | 偏向容易理解、輕鬆的大眾作品；排除恐怖、沉重與過度血腥 |
| AI-02 | 刺激冒險 | 想看節奏明快、緊張刺激的冒險故事，但不要恐怖或太血腥。               | 節奏明快、有冒險或動作感；排除恐怖與過度血腥           |
| AI-03 | 約會療癒 | 想和另一半一起看輕鬆好懂的愛情作品，不要恐怖或太沉重。               | 適合兩人觀看、情緒溫暖；排除恐怖與沉重題材             |
| AI-04 | 科幻驚喜 | 想看科幻或懸疑作品，節奏緊湊、評價不錯，但不要恐怖或太壓抑。         | 科幻或懸疑、節奏緊湊；避免恐怖與過度壓抑               |

依序將表格中的「正式測試輸入」代入以下命令：

```bash
AI_LIVE_REQUEST='正式測試輸入' bun run test:ai-live -- gpt-6-luna
```

### 3.3 每次執行要記錄

- Commit、分支、日期、時區與模型 ID。
- 完整測試輸入、locale、media type。
- HTTP／API 是否成功，是否通過 query plan schema。
- `intent_summary` 與 labels 是否符合輸出語言。
- 明確條件、排除條件、人物角色及 media type 是否正確。
- Script 實際輸出的推薦數量與片名。
- 根據片名與公開 TMDB 資料，人工判斷是否符合模板 TA，以及是否過度冷門、過度集中單一年代或系列。
- input、cached input、output、reasoning 與 total tokens。
- Script 顯示的估算單次成本、總成本與執行時間。
- 錯誤類型、重試次數及任何人工調整。

不要只看「推薦片名是否喜歡」。先檢查硬性限制和結構契約，再分析大眾化程度、TA 與主觀品質。

`test:ai-live` 目前只輸出 query plan、推薦數量、片名、token usage、部分成本估算與執行時間，不輸出年份、類型或推薦理由。需要這些欄位時，改用第 2 節的完整 Edge Function response 作為證據，不要在報告中聲稱 live script 已提供。

目前成本是腳本內建單價的部分估算，未涵蓋 cache write、processing tier、Supabase、TMDB 或網路成本；模型沒有內建單價時會顯示 `pricing unavailable`。報告必須保留這項限制，不得將估算值寫成實際帳單。

## 4. 測試紀錄模板

完成測試後，在 `docs/reports/` 建立 `YYYY-MM-DD-ai-picker-manual-test-report.md`，使用以下格式：

```markdown
# AI Picker 手動測試報告

## 測試資訊

- 日期／時區：
- Commit／分支：
- 測試人員：
- 前端環境：local / preview / production
- Supabase 環境：local / staging / production
- 模型：
- 瀏覽器／viewport：

## 結果摘要

| 範圍             | Pass | Fail | Blocked | 備註 |
| ---------------- | ---: | ---: | ------: | ---- |
| 前端手動測試     |      |      |         |      |
| 本機完整前後端   |      |      |         |      |
| 真實 AI 品質測試 |      |      |         |      |

## 測試結果

| ID    | 結果 | 實際結果 | 證據／截圖 | Issue |
| ----- | ---- | -------- | ---------- | ----- |
| FE-01 | PASS |          |            |       |
| BE-01 | PASS |          |            |       |
| AI-01 | PASS |          |            |       |

## AI 品質與成本

| 模板／輸入 | 模型 | 推薦摘要 | TA 與大眾化評估 | Tokens | 成本 | 延遲 |
| ---------- | ---- | -------- | --------------- | -----: | ---: | ---: |
|            |      |          |                 |        |      |      |

## 問題與後續

-
```

## 5. 完成判定

本次版本可接受的最低條件：

- FE-01～FE-10 沒有阻斷使用的失敗。
- BE-01～BE-09 通過；BE-10 若不方便故障注入，可標記 `BLOCKED` 並保留既有自動化測試證據。
- 四個模板都能產生符合明確限制的 query plan 與至少一筆有效推薦。
- 未登入流程不建立個人歷史；登入流程會保存且通過 RLS 使用者隔離。
- 沒有 secret 出現在瀏覽器、log、截圖或測試報告。
- 記錄真實模型、token、成本、延遲與任何不符合預期的推薦。
