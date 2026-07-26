# 2026-07-26 DeepSeek 結構化推薦驗證

## 本次變更

- 保留現有四題選片需求輸入，先透過 TMDB 取得可信候選電影。
- Supabase Edge Function 將需求與候選電影送至 DeepSeek，要求回傳固定的 `recommendations` JSON 結構。
- Edge Function 使用 Zod 驗證請求內容與 DeepSeek 回應，拒絕欄位缺漏、型別錯誤、空推薦及超過上限的資料。
- 前端收到 Edge Function 回應後再次使用 Zod 驗證，只有合法資料能進入推薦畫面。
- DeepSeek 或結構驗證失敗時，畫面保留電影介紹作為 fallback，顯示可存取的錯誤狀態，並提供重新取得 AI 推薦的操作。
- TMDB 片單載入失敗時也提供重新載入操作。

## 資料流程

1. 使用者完成情緒、觀影場合、節奏與年代偏好。
2. 前端依偏好向 TMDB 取得候選電影。
3. 已登入使用者透過 Supabase Edge Function 呼叫 DeepSeek。
4. Edge Function 以 Zod 驗證 DeepSeek 的結構化 JSON，再正規化推薦順序與理由長度。
5. 前端再次驗證回應，顯示推薦理由；失敗時顯示 fallback 與重試狀態。

## 驗證

- 新增 Edge Function 請求與 DeepSeek 回應結構測試。
- 新增前端 Supabase 回應結構測試。
- 新增 AI 推薦錯誤狀態與重試流程測試。
- 執行完整測試、Lint、TypeScript 編譯與 Vite build。
