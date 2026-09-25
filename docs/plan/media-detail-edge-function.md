# 電影／影集詳情整合到單一 Edge Function

## 目標與現況

目前 `useMovieDetail` 從瀏覽器分別呼叫 TMDB 詳情、演員、影片，電影再依 `imdb_id` 呼叫 OMDb。詳情頁未登入也能使用；推薦 Function 則要求登入，不能直接拿它代替。本次讓瀏覽器對詳情頁只發出一次 `media-detail` Function 請求，由 Function 整合 TMDB 與 OMDb，保留現有電影、影集 UI、收藏與推薦流程。

## 影響範圍與決策

1. 新增公開的 `supabase/functions/media-detail`，在 `supabase/config.toml` 對此 Function 設 `verify_jwt = false`。它只接受 `movie | tv`、正整數 ID 與允許的語系；固定呼叫 TMDB／OMDb host 與路徑，不接收任意 URL。需處理 CORS。TMDB token、OMDb key 由 Function secrets 讀取；TMDB token 必填，OMDb key 可選。此 Function 不讀寫使用者資料。
2. Function 對 TMDB 詳情、演員、影片平行請求；影集演員使用 `/aggregate_credits`，保留 `roles`。電影詳情一到就啟動 OMDb，OMDb 設比主請求短的 timeout，涵蓋讀取 JSON body。詳情 404 才回 404，其他上游錯誤回 502；非必要來源失敗回空資料／`null` 並記錄不含金鑰的來源名稱與狀態。所有狀態碼都附 CORS。
3. 回傳 `{ detail, credits, videos, omdb }`，電影和影集沿用既有 TMDB 型別與 `buildMovieDetailPresentation`、`buildTvDetailPresentation`。以 Zod 驗證 UI 與收藏實際讀取的必要欄位，包括 `genres`、評分計數、影集 `episode_run_time`、演員 `cast`／`roles`、影片 `results`、OMDb `Ratings`；次要來源無效時降級。電影 `imdb_id` 可為 null；影集 `omdb` 為 null。
4. 將 `useMovieDetail` 合併成一個 React Query；前端呼叫 `media-detail` 並檢查回應與非 2xx 錯誤。無效 ID 立即顯示錯誤，404／輸入錯誤不重試。移除原本只供詳情頁使用的瀏覽器直呼 TMDB／OMDb 函式與 OMDb 公開 key 變數；首頁、搜尋等其餘 TMDB 呼叫不在本次遷移範圍。更新 `deploy:supabase` 使手動部署也包含新 Function，並同步三語 README、`.env.example` 與 Function secrets 指引。
5. 不新增正式依賴、不新增資料表／migration、不改收藏的 Supabase SDK + RLS 流程。這次不加 Docker 或獨立後端服務。

## 驗證與發布

- 測試 Function 的輸入拒絕、電影／影集整合與非空影集 `roles`、404 與其他上游錯誤分流、次要來源無效／失敗、OMDb 無 key／無 IMDb ID／逾時，以及 OPTIONS／所有錯誤 CORS；測試前端單次 invoke、語系、非 2xx、回應驗證、無效 ID 與頁面既有呈現。
- 執行 `bun run format && bun run lint`、`bun run test:run`、`bun run build`，以及可用的 Deno 型別檢查／本機 Function 驗證；保留原本工作樹未提交修改。
- PR 以繁體中文說明變更、環境變數、手動本地測試步驟與未涵蓋的真實外部服務驗證；不直接部署 production。

## Astra 對抗性審查與採納

Astra 審查現有程式後指出：手動部署指令漏新 Function、影集需 `aggregate_credits`、粗略驗證可能造成 UI 白屏、OMDb 進入首屏等待、公開 Function 的 CORS 與錯誤分類、無效 ID 卡骨架。上述全部納入第 1～4 點與驗證項；`verify_jwt = false` 僅設於新 Function，不改推薦 Function。審查未要求加入新依賴或額外資料庫。
