# 🍿 Movie Picker

[繁體中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

![website-demo](public/homepage-demo.gif)

> 「看的電影總是那幾部？有沒有其他我沒聽過、或許很適合我的片單？」

讓 Movie Picker 提供給你幾個電影提案吧！
輸入**此刻心情、想看的電影描述**，由 AI 判斷你可能會有興趣的電影類型、年代、keywords，從電影資料庫(TMBD)原生 discover API 推薦幾部電影/影集，讓挑選多個選擇。

此專案前端主要為 React，資料庫與後端為 supabase 支援，資料來源為 TMBD/OMDb，串接 AI model 判斷電影標籤完成。主要為個人專案作品使用。

### 👀 Take a peek at <u>[Movie Picker](https://movie-picker.peiwang.dev/)</u>

## Feature

- **最新趨勢**：切換電影與影集的最新、每週趨勢、熱門、高評分及各種類型
- **電影搜尋**：搜尋電影／影集，查看詳情、演員、預告片、影集季數與總集數
- **AI 選片**：登入後使用，以自然文字描述期待與限制，由 AI 模型規劃並挑選最多十部作品
- **History**：需登入使用，AI 選片歷史紀錄，最多載入20筆，支援一次刪除
- **Wishlist**：電影願望清單
- **使用者登入**：目前僅支援 Github，可使用電影選片，可儲存 AI 選片歷史
- **Localize**：支援英文／繁體中文，RWD 支援各裝置大小

|   feature    |             screenshot             |
| :----------: | :--------------------------------: |
| movie detail | ![movie-detail](public/detail.png) |
|   History    |   ![history](public/history.png)   |
|   Wishlist   |  ![wishlist](public/wishlist.png)  |

## Tech Stack

| Framework      | Used for                                   |
| -------------- | ------------------------------------------ |
| React 19       | Frontend interface library                 |
| TypeScript     | Static type checking                       |
| Vite           | 本機開發與前端建置                         |
| Tailwind CSS 4 | CSS style                                  |
| shadcn/ui      | Reusable UI components                     |
| Motion         | UI 動畫與降低動態效果支援                  |
| React Router   | SPA routing                                |
| TanStack Query | API 資料取得、快取與伺服器狀態同步         |
| Zustand        | 管理語言、主題、登入與收藏狀態             |
| i18next        | localization                               |
| Zod            | 驗證 AI API 資料與查詢計畫                 |
| Supabase       | 儲存使用者資料、GitHub Auth、Edge Function |
| TMDB API       | 搜尋、瀏覽與顯示電影及影集資料             |
| OMDb API       | 取得電影外部評分                           |
| AI 模型        | 將自然語言需求轉換為 TMDB 查詢計畫         |

## Data & Persistence

| 資料        | 保存位置                                                 | 用途                                   |
| ----------- | -------------------------------------------------------- | -------------------------------------- |
| 收藏清單    | 未登入時使用瀏覽器 `localStorage`；登入後同步至 Supabase | 跨裝置保留想看的電影與影集             |
| AI 推薦紀錄 | Supabase                                                 | 保存選片條件、推薦結果及產生時間       |
| 使用者身分  | Supabase Auth                                            | 支援 GitHub 登入並隔離每位使用者的資料 |

所有雲端資料均受 Row Level Security 保護，登入使用者只能存取自己的收藏與推薦紀錄

## Architecture

```text
React 頁面／元件
├─ TanStack Query hooks → TMDB / OMDb
├─ Zustand stores → UI 狀態 + 本機收藏快取
└─ Supabase client → GitHub Auth + Postgres (RLS)
                       └─ recommend-movies Edge Function → AI 模型 + TMDB
```

- `src/pages` 管理路由頁面，`src/components` 放共用 UI 與功能元件。
- `src/hooks` 協調伺服器狀態，`src/services` 隔離外部 API。
- `src/stores` 管理前端狀態，`supabase/migrations` 與 `supabase/functions` 管理後端行為。
- AI 選片限定登入使用者；模型只產生查詢計畫，Edge Function 將 TMDB 熱門與高評分候選片穩定交錯排序。

## Develop

- Local develop environment 複製 .env.example 改成 .env，需要 AI model key, TMDB token, supabase secrets，缺少則會啟動失敗
