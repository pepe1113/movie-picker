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
- Edge Function 使用 OpenRouter forced tool calling 產生查詢計畫，再以 Zod
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
  fallback。所有 OpenRouter 與 TMDB fetch 共用同一個 AbortSignal。
- 等待畫面顯示 0–90% 動畫進度，完整結果回傳後顯示 100%；中間候選片不會先
  出現在畫面。
- 新 migration 只清除 `ai_recommendation_runs` 舊資料，將 `answers` 改為
  `intent`，並新增 `discover_plan`。
- `EdgeRuntime.waitUntil` 在回應 critical path 外保存結構化 intent、查詢計畫、
  候選 ID、推薦快照、provider 與 model。原始輸入、prompt 與 provider response
  不會持久保存。
- 移除舊 `analyze-movie-request` Edge Function、固定四分類前端服務與未使用元件。
- 繁體中文與英文 UI、三份產品 README 改用「AI 模型」泛稱；部署文件保留實際
  OpenRouter 與 Supabase Secrets 設定。

## 驗證

- `bun run test:run`：19 個 test files、77 個 tests 通過。
- `bun run lint`：通過。
- `bun run build`：通過。
- Edge Function 入口以 Bun bundler 成功載入 14 個 modules。
- Supabase 本地 Edge Runtime 未執行：Docker Desktop 尚未啟動。
- OpenRouter live smoke test 尚未執行：需在部署 migration、function 與 Secrets
  後，以登入測試帳號驗證兩次 tool calls。

## 部署順序

1. 套用 `20260726171508_replace_ai_recommendation_history.sql`。
2. 設定 `OPENROUTER_API_KEY`、`OPENROUTER_MODEL` 與 `TMDB_ACCESS_TOKEN`。
3. 部署新版 `recommend-movies` Edge Function。
4. 以登入測試帳號執行一筆受控 live smoke test。
