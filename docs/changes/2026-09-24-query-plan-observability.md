# Query Plan 可觀測性

## 變更

- `recommend-movies` 成功 response 新增 versioned `query_plan`。
- 同一份 snapshot 保存到既有 history `intent.query_plan` JSONB。
- AI Picker 與新 history 紀錄的 badges 改由 `query_plan` 產生，不再使用模型回傳的 display labels。
- history 型別將 `query_plan` 設為 optional，保留舊資料相容性。
- 新版前端以 `Accept: application/vnd.movie-picker.query-plan+json` 選用新 response；未選用的舊版前端仍收到原有格式。新版前端連到舊 Edge Function 時暫用原有 labels，支援分開部署。
- 多人條件以單一 badge 標示「任一」或「全部」，避免把 OR 誤顯示成 AND。
- [Before／After 元件比對圖](../ai-query-plan-before-after.jpg) 使用固定展示資料，不呼叫線上 API。

## 未變更

- 無 migration、新 dependency、prompt、模型、TMDB query、排序或 fallback 行為變更。

## 驗證

- `bun run test:run`
- `bun run lint`
- `bun run build`
