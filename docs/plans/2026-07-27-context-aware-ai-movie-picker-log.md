# 2026-07-27 Context-Aware AI Movie Picker 實作紀錄

## 對應 Issues

- #5：情境式推薦 happy path
- #6：明確限制與 TMDB keyword 解析
- #7：重排驗證與 deterministic fallback
- #8：十秒 deadline 與等待體驗
- #9：新版推薦歷史
- #10：在地化、文件與驗收

## 完成內容

- 將前端原本的「需求分析 → 前端 TMDB Discover」流程改為單一
  `recommend-movies` authenticated request。
- Edge Function 使用模型 forced function calling 產生查詢計畫，再以 Zod
  驗證 genre 白名單、keyword 數量、片長、年份與語言範圍。
- 最多兩個 TMDB keyword search 並行執行；熱門與高評分 Discover 查詢也並行，
  去重後建立最多二十部候選片。
- 候選不足十五部時只放寬一次推測出的 include 條件；明確排除、成人內容、
  片長、年份與語言限制仍保留。
- 第二次模型呼叫可淘汰及重排候選片。輸出需符合 candidate membership、去重、
  五部上限、最多一部 wildcard 及推薦理由長度限制。
- 第二次模型呼叫失敗時，以熱門／高評分結果的固定交錯順序回傳最多五部；
  fallback 卡片顯示 TMDB overview，不偽裝成個人化理由。
- 後端 deadline 設為 9.5 秒，前端十秒後中止等待，讓後端仍有短暫時間回傳
  fallback。所有模型與 TMDB fetch 共用同一個 AbortSignal。
- 等待畫面顯示 0–90% 動畫進度，完整結果回傳後顯示 100%；中間候選片不會先
  出現在畫面。
- 新 migration 只清除 `ai_recommendation_runs` 舊資料，將 `answers` 改為
  `intent`，並新增 `discover_plan`。
- `EdgeRuntime.waitUntil` 在回應 critical path 外保存結構化 intent、查詢計畫、
  候選 ID、推薦快照、provider 與 model。原始輸入、prompt 與 provider response
  不會持久保存。
- 移除舊 `analyze-movie-request` Edge Function、固定四分類前端服務與未使用元件。
- 繁體中文與英文 UI、三份產品 README 改用「AI 模型」泛稱；部署文件保留實際
  provider 與 Supabase Secrets 設定。

## 2026-07-28 流程簡化

- 移除第二次 AI 候選重排與推薦理由生成，只保留一次 forced tool call 產生
  TMDB 查詢計畫。
- 最終結果改為熱門／高評分 Discover 的固定交錯順序，最多回傳十部，卡片顯示
  TMDB overview。

## 2026-07-28 OpenAI 直連

- 移除 OpenRouter 中介層，Edge Function 改為直接呼叫 OpenAI Chat Completions。
- 預設模型改為 `gpt-4o-mini`，server-side secrets 改用 `OPENAI_API_KEY`、
  `OPENAI_MODEL` 與 `OPENAI_BASE_URL`。
- provider metadata 改為 `openai`；既有 forced function calling 與 Zod 驗證保留。

## 2026-07-28 TMDB schema 相容性修正

- OpenAI 規劃成功後，TMDB Discover 回應新增 `softcore` 欄位；原本
  `movieSchema.strict()` 將未知欄位判定為無效，導致推薦流程回傳 502。
- TMDB 電影 schema 改為驗證並保留既有必要欄位、移除未知欄位，避免供應商新增
  欄位再次中斷流程。
- 上游非 2xx 錯誤現在只記錄 host、status、type、code 與 param；不記錄 key、
  prompt 或完整 provider response。

## 驗證

- `bun run test:run`：21 個 test files、76 個 tests 通過。
- `bun run lint`：通過。
- `bun run build`：通過。
- Edge Function 入口以 Bun bundler 成功載入 14 個 modules。
- Supabase 本地 Edge Runtime 未執行：Docker Desktop 尚未啟動。
- `recommend-movies` version 29 已部署並為 `ACTIVE`。
- 登入狀態 live smoke test 回傳 `POST 200`，約 5 秒；UI 顯示選片方向與十部推薦。

## 部署順序

1. 套用 `20260726171508_replace_ai_recommendation_history.sql`。
2. 設定 `OPENAI_API_KEY`、`OPENAI_MODEL` 與 `TMDB_ACCESS_TOKEN`。
3. 部署新版 `recommend-movies` Edge Function。
4. 以登入測試帳號執行一筆受控 live smoke test。
