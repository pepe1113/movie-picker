# Movie Picker AI Agent Instructions

## 目標
此專案為作品集層級的電影推薦網站／挑片工具。請協助編輯、修復、或擴充前端功能，並保持現有設計語彙與架構一致。
可以瀏覽電影資料、最新電影，還可以AI挑選電影指南

## 行為準則
- 對話統一繁體中文回覆
- 優先使用現有專案模式與元件，不要自行引入新的 UI 框架或大型依賴
- 避免改動尚未完成的 Firebase 服務，除非任務明確要求
- 每次大規模改動，都要logs 形式記錄到專案底下

## 主要命令
- 安裝：`bun install`
- 開發：`bun run dev`
- 編譯：`bun run build`
- 測試：`bun run test` / `bun run test:run`
- Lint：`bun run lint`
- 代碼格式化：`bun run format`
- 偏好 bun 安裝依賴像和執行指令

## 專案架構
- `src/components/`：React 組件，分為 `features/`、`layout/`、`ui/`
- `src/pages/`：頁面路由元件
- `src/hooks/`：自訂 hook
- `src/services/tmdb/`：TMDB API 客戶端與 endpoint
- `src/stores/`：Zustand 狀態管理
- `src/i18n/`：國際化設定，支援 `en` 和 `zh-TW`
- `src/lib/`、`src/utils/`、`src/types/`：工具與型別定義

## 開發注意事項
- 專案使用 React 19、TypeScript、Vite、Tailwind CSS 4、Zustand、React Query
- 設計請依 `DESIGN.md` 實作，保持風格一致
- 變更 UI 元件時，先檢查 `src/components/ui/` 中的可重用元件
- 使用 TypeScript 嚴格型別檢查，避免繞過 `any`
- 變更後務必執行 `bun run test` 和 `bun run lint`
- 使用 git worktree 進行版本控制，分支命名為 agents/feature-name
- git commit 的 co-author 需要有 agent name+model name

## 重要區塊
- `src/pages/RandomPick.tsx`：隨機挑片流程
- `src/pages/Top100.tsx`：Top 100 熱門電影頁
- `src/pages/Wishlist.tsx`：收藏清單頁
- `src/components/features/movie/`：電影卡片、電影列表、載入骨架
- `src/components/features/filter/`：篩選面板與篩選標籤
- `src/stores/`: `filterStore.ts`, `themeStore.ts`, `wishlistStore.ts`, `authStore.ts`

## 代碼品質規則
- 優先保留現有語意型別與資料流
- 用 `eslint` 與 `prettier` 保持一致格式
- 不要移除現有 i18n 支援，新增文字須同步更新 `src/i18n/locales/` 文字檔
- 若新增 API 呼叫，請優先放在 `src/services/tmdb/`，並保持 data fetching hook 的可測試性

## 可參考文件
- `README.zh-TW.md`：專案功能與技術概述
- `DESIGN.md`：UI/UX 設計規範
- `package.json`：執行腳本與依賴
