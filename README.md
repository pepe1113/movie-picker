# Movie Picker

> 使用 React、TMDB、Supabase 與 DeepSeek 製作的作品集電影探索／推薦網站。

[繁體中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

**立即使用：** [https://movie-picker.peiwang.dev/](https://movie-picker.peiwang.dev/)

## 專案功能

- 瀏覽上映中、每週趨勢、熱門與高評分電影
- 搜尋電影並查看詳情、演員、預告片及 OMDb 評分
- 從熱門電影或類型／評分／年份篩選結果中隨機挑三部
- 依心情、場合、節奏與年代選片；登入後由 DeepSeek 產生推薦理由
- 未登入時在本機保存收藏，GitHub 登入後合併並同步至雲端
- 查看及刪除最近 20 筆 AI 推薦紀錄
- 支援英文／繁體中文介面與亮色／暗色主題

## Tech Stack

React 19、TypeScript、Vite、Tailwind CSS 4、React Router、TanStack Query、Zustand、Supabase、TMDB、OMDb、DeepSeek。

## 資料如何保存

| 資料        | 保存位置                                                 | 用途                                   |
| ----------- | -------------------------------------------------------- | -------------------------------------- |
| 收藏清單    | 未登入時使用瀏覽器 `localStorage`；登入後同步至 Supabase | 跨裝置保留想看的電影                   |
| AI 推薦紀錄 | Supabase                                                 | 保存選片條件、推薦結果及產生時間       |
| 使用者身分  | Supabase Auth                                            | 支援 GitHub 登入並隔離每位使用者的資料 |

所有雲端資料均受 Row Level Security 保護，登入使用者只能存取自己的收藏與推薦紀錄。

## 架構

```text
React 頁面／元件
├─ TanStack Query hooks → TMDB / OMDb
├─ Zustand stores → UI 狀態 + 本機收藏快取
└─ Supabase client → GitHub Auth + Postgres (RLS)
                       └─ recommend-movies Edge Function → DeepSeek API
```

- `src/pages` 管理路由頁面，`src/components` 放共用 UI 與功能元件。
- `src/hooks` 協調伺服器狀態，`src/services` 隔離外部 API。
- `src/stores` 管理前端狀態，`supabase/migrations` 與 `supabase/functions` 管理後端行為。
- 未登入時使用本機規則推薦；登入後呼叫 Edge Function，供應商失敗時仍回退至本機推薦。

## 安全措施

- 已於 **2026-07-16** 透過 `supabase secrets list` 驗證：連結的 Supabase 專案 Secrets 中存在 `DEEPSEEK_API_KEY`。
- DeepSeek Key 存放於 Supabase Secrets，且只由 Edge Function 讀取；前端不會收到該 Key。
- Git 會忽略 `.env*`（僅追蹤 `.env.example`），版本庫中沒有 DeepSeek Secret 值。
- Edge Function 要求 Bearer Token，並先透過 `supabase.auth.getUser()` 驗證使用者，才會呼叫 DeepSeek 或寫入紀錄。
- 兩張表皆啟用 Row Level Security，只允許 `auth.uid() = user_id` 的擁有者存取；瀏覽器只使用公開 anon key。
- AI endpoint 僅接受 `POST`，且每次最多接收 10 部候選電影。

## 檢查指令

```bash
bun run test:run
bun run lint
bun run build
```

電影資料：[TMDB](https://www.themoviedb.org/) · 評分資料：[OMDb](https://www.omdbapi.com/)
