# Query Plan 可觀測性

## 變更

- `recommend-movies` 成功 response 新增 versioned `query_plan`。
- 同一份 snapshot 保存到既有 history `intent.query_plan` JSONB。
- AI Picker 與新 history 紀錄的 badges 改由 `query_plan` 產生，不再使用模型回傳的 display labels。
- history 型別將 `query_plan` 設為 optional，保留舊資料相容性。

## 未變更

- 無 migration、新 dependency、prompt、模型、TMDB query、排序或 fallback 行為變更。

## 驗證

- `bun run test:run`
- `bun run lint`
- `bun run build`
