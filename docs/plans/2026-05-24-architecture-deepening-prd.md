# 2026-05-24 Architecture Deepening PRD

Status: ready-for-agent

## Problem Statement

Movie Picker 已經具備瀏覽電影、AI 挑片、隨機挑片、Top 100、搜尋與收藏等主要流程，但部分行為知識分散在頁面、hook、store、工具函式與測試之間。維護者在修改一個領域概念時，必須同時理解 TMDB 查詢參數、React Query 分頁、UI 狀態、i18n 文案、收藏轉換與測試假設，造成修改成本偏高。

目前最明顯的摩擦是電影詳情頁仍保留「地區海報輪播」的測試與文案殘留，但該功能已被產品決策移除。這讓測試結果把已移除功能誤判成缺漏，也讓後續 agent 可能重建不需要的功能。

更廣泛地說，挑片條件、電影清單瀏覽與預告片媒體行為都存在淺 Module：Interface 看似簡單，但 caller 仍需知道過多 Implementation 細節。這降低 Locality，也讓測試難以集中在穩定 Interface 上。

## Solution

將前次架構掃描列出的候選項目整理成一組可執行的架構深化工作。第一階段處理已移除的地區海報輪播殘留，避免錯誤測試和文案繼續干擾開發。第二階段深化挑片條件、電影清單瀏覽與預告片媒體 Module，把分散規則集中到更穩定、更可測試的 Interface。

完成後，使用者看到的功能不應大幅改變；主要收益在於維護者與 agent 能用較少上下文安全修改推薦、篩選、清單與預告片行為。

## User Stories

1. As a Movie Picker 使用者, I want 已移除的地區海報輪播不要再被測試要求出現, so that 頁面不會因過期規格而被誤判為壞掉。
2. As a Movie Picker 使用者, I want 電影詳情頁保留核心資訊、演員、評分、預告片與收藏操作, so that 我仍能快速判斷是否要看這部電影。
3. As a Movie Picker 使用者, I want AI 挑片與隨機挑片的條件規則一致可信, so that 我得到的推薦符合我選擇的情緒、場合、節奏與年代偏好。
4. As a Movie Picker 使用者, I want 手動篩選與 AI 推薦都能使用合理的評分、年份、類型與排序規則, so that 推薦片單品質穩定。
5. As a Movie Picker 使用者, I want 首頁電影清單的載入更多行為穩定, so that 我能連續探索更多電影而不遇到重複或卡住的狀態。
6. As a Movie Picker 使用者, I want Top 100 頁面只呈現前 100 部高分電影, so that 排行體驗符合頁面名稱。
7. As a Movie Picker 使用者, I want 電影卡片 hover 預告片在桌面上維持延遲載入, so that 頁面初始載入速度不被影片資料拖慢。
8. As a Movie Picker 使用者, I want 無預告片時仍看到電影簡介 fallback, so that 卡片互動不會出現空白。
9. As a 行動裝置使用者, I want 電影卡片不要依賴 hover 預告片, so that 觸控操作保持單純且不浪費網路。
10. As a 維護者, I want 電影詳情展示資料集中整理, so that 修改外部評分、預告片、演員或收藏資料轉換時不用翻完整頁面。
11. As a 維護者, I want 地區海報輪播移除決策被明確反映在測試與文案, so that 未來 agent 不會把它重新補回。
12. As a 維護者, I want 挑片條件有單一 Module 負責轉成 TMDB discover 查詢, so that AI 挑片和手動篩選不會各自長出不同規則。
13. As a 維護者, I want 推薦排序規則能被單獨測試, so that 調整評分、人氣、年代 bonus 時不用啟動整個 UI。
14. As a 維護者, I want 電影清單瀏覽的分頁與顯示數量邏輯集中, so that 首頁四個區塊與 Top 100 不會重複維護相似行為。
15. As a 維護者, I want 預告片選取和 YouTube embed 參數集中, so that 電影卡片預覽與詳情頁播放共享同一套規則。
16. As a 維護者, I want 每個深化 Module 的 Interface 成為測試表面, so that 測試能驗證外部行為而不是脆弱的 Implementation 細節。
17. As a agent, I want 清楚知道哪些功能是 out of scope, so that 我不會擅自重建 Firebase、地區海報輪播或新的 UI 框架。
18. As a agent, I want PRD 明確標記 ready-for-agent, so that 我可以直接依範圍拆解實作。

## Implementation Decisions

- 採用「先刪除殘留，再深化 Module」的順序。地區海報輪播已被移除，工作內容是移除測試、文案與不再需要的查詢或展示資料，不是重建輪播。
- 電影詳情展示 Module 應集中整理頁面需要的展示資料，包括詳情主資料、演員截斷、預告片選取、外部評分、收藏項目轉換與錯誤/loading 狀態。Interface 應讓頁面少知道資料來源細節。
- 挑片條件 Module 應負責把手動篩選狀態與 AI 問答答案轉換成 discover 查詢。它應封裝年份區間、評分區間、類型合併、最低票數、排序與語言參數規則。
- AI 推薦排序可留在同一個挑片領域內，但應保持可單獨測試。推薦排序的 Interface 應接受候選電影與完整答案，回傳排序後推薦與命中偏好。
- 電影清單瀏覽 Module 應集中處理清單分類、分頁、顯示數量、載入更多與上限策略。首頁與 Top 100 應透過同一組行為規則取得 Leverage。
- 預告片媒體 Module 應集中處理 trailer 選取、可預覽條件、embed URL 參數與無 trailer fallback。電影卡片與詳情頁是兩個 Adapter，代表這是實際 Seam。
- 不引入新的 production dependency。若需要整理 Module，優先使用現有 React、React Query、Zustand、TypeScript 與專案工具函式模式。
- 不改動尚未完成的 Firebase 服務。
- 保持現有 i18n 支援。若刪除地區海報文案，需同步處理英文與繁體中文 locale。
- 若後續實作牽涉大規模改動，需依專案慣例補充 logs 形式紀錄。

## Testing Decisions

- 好的測試應驗證 Module 的外部行為，不應鎖死內部拆分方式、暫時變數名稱或特定 JSX 結構。
- 第一優先測試是地區海報輪播移除後的電影詳情頁行為：測試不應再期待輪播存在，並應保留核心詳情、fallback 背景、收藏、評分與預告片相關外部行為。
- 挑片條件 Module 需要單元測試。測試應覆蓋手動篩選轉 discover 查詢、AI 答案轉 discover 查詢、年代條件、評分條件、最低票數與類型合併。
- AI 推薦排序需要單元測試。既有 AI picker 測試可作為 prior art，保留「輸入候選電影與答案，輸出前三名與命中關鍵字」這種外部行為測試。
- 電影清單瀏覽 Module 需要測試載入更多策略、Top 100 上限策略與分頁觸發條件。測試應避免依賴實際 TMDB 網路。
- 預告片媒體 Module 需要測試 trailer 選取、embed URL 參數、desktop preview 條件與無 trailer fallback。
- 整體修改完成後需執行專案測試與 lint。若只修改文件，不需要執行 JavaScript 測試；若修改 JavaScript，依 AGENTS.md 需執行 npm test，並依專案慣例也執行 bun 測試與 lint。

## Out of Scope

- 不重建地區海報輪播。
- 不新增 production dependency。
- 不導入新的 UI 框架。
- 不改動 Firebase Authentication 或 Firestore 規劃中服務。
- 不改變 TMDB/OMDb 資料來源策略。
- 不新增真正 AI 後端或 LLM API 串接。
- 不重新設計整體視覺語彙；維持既有 Spotify-inspired dark UI。
- 不把本 PRD 拆成完整 issue 清單；若需要，後續可用 to-issues 依此 PRD 拆分。

## Further Notes

- 本 PRD 來自 2026-05-23 至 2026-05-24 的架構掃描與後續澄清。
- 關鍵澄清：地區海報輪播是使用者已移除的功能，任何實作 agent 都應把相關測試與文案視為殘留，而不是缺失功能。
- 候選項目的優先順序建議為：電影詳情殘留清理、挑片條件 Module、預告片媒體 Module、電影清單瀏覽 Module。
- 此 repo 尚未設定 `docs/agents/` issue tracker 文件；本 PRD 先依現有 `docs/plans/` 慣例發佈為本地 Markdown。
