# 2026-07-26 DeepSeek 結構化需求分析

## 本次變更

- AI 挑片入口改為自由文字，讓使用者直接描述心情或觀影需求。
- 新增 `analyze-movie-request` Supabase Edge Function；DeepSeek 只負責把文字分析成 `mood`、`occasion`、`pace`、`era` 四個結構化條件。
- Edge Function 使用 Zod 驗證請求與 DeepSeek JSON；前端收到結果後再驗證一次。
- 只有通過 Zod 的條件會被轉成 TMDB discover 查詢，DeepSeek 不生成電影名稱或電影資料。
- DeepSeek 分析與 TMDB 查詢各自提供 loading、錯誤與重試狀態。
- TMDB 找不到符合條件的電影時顯示可返回調整需求的空狀態。
- 成功查到電影後，沿用既有推薦紀錄服務保存驗證條件與 TMDB 電影快照，不保存原始輸入或 DeepSeek 原始回應。
- 未登入使用者會看到登入提示，不會呼叫 DeepSeek 或 TMDB。

## 資料流程

1. 使用者輸入心情或觀影需求。
2. 前端透過 Supabase Edge Function 將文字送至 DeepSeek。
3. DeepSeek 回傳固定的四項結構化條件。
4. Edge Function 與前端分別用 Zod 驗證條件。
5. 前端依驗證後的條件查詢 TMDB。
6. 畫面顯示 TMDB 電影、條件標籤，或對應階段的錯誤與重試操作。

## 驗證

- Edge Function 測試涵蓋輸入限制、合法條件與不合法 DeepSeek 結構。
- 前端服務測試涵蓋函式呼叫契約與第二層 Zod 驗證。
- UI 測試確認 DeepSeek 一定早於 TMDB、分析期間不查 TMDB，並覆蓋兩階段錯誤與重試。
- 執行完整測試、Lint、TypeScript 編譯與 Vite build。
