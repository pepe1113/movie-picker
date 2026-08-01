# 2026-08-01 AI 推薦人物、關鍵字與媒體型別路由實作紀錄

## 範圍

- 採單一 active 媒體型別；每次請求只推薦電影或影集，不做 3+3 混合片單。
- 完成 GitHub issues #11–#15：媒體路由、人物與精確 credits、keyword 解析、
  媒體中立歷史，以及正式環境驗收。
- 未新增 production dependency，也未改動 Firebase。

## 實作

- 前端 request 加入必填 `media_type`，電影為預設值；切換、重設、錯誤與空狀態
  均沿用既有 AI Picker UI。
- OpenAI 維持一次 forced function call，只產生受限查詢計畫；人物與 keyword ID
  全部由 TMDB 驗證。
- 電影演員使用 `with_cast`；導演、編劇、製片與劇集人物使用精確 credits 集合
  和 Discover 結果取交集，避免把 `Thanks` 當成導演作品。
- Movie／TV Discover 分流、使用各自 genre 白名單與票數門檻；人物、keyword、
  credits 解析共用同一個 AbortSignal。
- Fallback 最多一次，只移除 inferred genre／keyword；媒體型別、人物、明確
  keyword 與 hard constraints 不會被靜默放寬。
- API、推薦快照與歷史紀錄使用 `(media_type, id)` 識別作品；歷史詳情連結會依
  電影或影集前往正確路由。

## Migration 與部署

- Supabase migration `20260801075037_make_ai_recommendation_history_media_neutral`
  已套用；既有 6 筆紀錄保留、RLS 維持啟用。
- Supabase Edge Function `recommend-movies` version 30 已部署為 `ACTIVE`，JWT
  驗證維持啟用。
- 前端正式部署與登入後 happy path 結果記錄於本次提交完成後補上。

## 驗證

- `bun run test:run --maxWorkers=1`：21 個 test files、80 個 tests 通過。
- `bun run lint`：通過。
- `bun run build`：通過；既有 chunk size warning 不影響產出。
- Edge Function 入口以 Bun bundler 成功載入 14 個 modules。
- `git diff --check`：通過。
- 固定回歸案例涵蓋 Brad Pitt cast、宮崎駿 Director 排除 Thanks、人物 OR／AND、
  explicit keyword、只放寬 inferred 條件、TV credits、輕鬆日劇與電影／影集歷史路由。
