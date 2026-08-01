# 2026-07-27 Context-Aware AI Movie Picker PRD

Status: ready-for-agent

## Problem Statement

Movie Picker 目前會先把使用者的自由文字壓縮成固定的 mood、occasion、pace、era 四種分類，再把各分類對應的電影類型合併成 TMDB Discover 查詢。不同分類經常映射到重疊類型，而且 OR 條件會隨著類型增加而擴大候選範圍。結果再以熱門度或評分排序並直接取前幾部，造成電影雖然符合某個廣義類型，卻與使用者當下情境、期望情緒或明確排除條件有落差。

固定分類也無法可靠表達「目前很難過但想轉換心情」、「剛失戀但不要愛情片」、「工作很累，想看不費力的電影」等方向不同、甚至包含反向需求的描述。若使用者只描述目前狀態，系統目前也沒有一致政策決定要延續情緒還是協助調節情緒。

目前推薦流程仍與特定 AI 供應商名稱、固定四分類資料結構及 reason-only 契約耦合。AI 只替 TMDB 原順序補推薦理由，不能真正淘汰或重排候選片；推薦理由也容易重述電影簡介，沒有清楚說明使用者需求與電影特徵的關聯。

## Solution

將 AI 挑片改為一次輸入、直接出片的情境式推薦流程。登入使用者輸入目前狀態、想獲得的感受、觀影場合或限制後，後端先透過 OpenRouter 模型產生受白名單與 Zod 約束的 TMDB 查詢計畫，再以 TMDB Discover 建立兼顧熱門度與評分的候選池，最後讓模型依原始需求真正重排候選片並回傳最多五部電影。

當使用者只描述目前狀態而沒有指定目標時，系統預設協助改善或調節情緒；若使用者明確說明想沉浸、轉換心情或排除某類內容，則明確要求優先。只有使用者明說的限制會成為硬篩選，模型推測出的偏好只影響搜尋方向與最後排序。

結果頁顯示自然語言的「本次選片方向」與動態條件標籤，讓使用者知道系統如何理解需求，但不顯示內部推理、供應商品牌或原始 TMDB 參數。推薦理由以「使用者需求＋可驗證電影依據」為核心，不重述電影簡介、不診斷使用者，也不使用候選資料未提供的事實。

整個互動最多等待三十秒。畫面以動畫進度條從 0% 前進至 90%，成功時完成至 100%；這是等待回饋而非後端真實完成比例。推薦歷史在回傳結果後以背景任務保存，不阻塞使用者看到片單。

## User Stories

1. As a 登入使用者, I want 用自然文字描述目前狀態與觀影需求, so that 我不需要理解電影分類或逐題選擇固定答案。
2. As a 疲憊的使用者, I want 系統在我沒有指定目標時預設協助調節情緒, so that 推薦不會只是複製我的負面狀態。
3. As a 有明確情緒目標的使用者, I want 系統優先遵從「想大哭」或「想轉換心情」等要求, so that 推薦方向符合我真正想獲得的感受。
4. As a 有排除需求的使用者, I want 「不要恐怖片」或「不要愛情片」成為不可放寬的條件, so that 系統不會為了湊滿片單而違反我的要求。
5. As a 有觀影時間限制的使用者, I want 「90 分鐘內」等明確限制成為 TMDB 硬篩選, so that 推薦能符合實際可用時間。
6. As a 只描述疲憊狀態的使用者, I want 系統把低理解負擔視為偏好而不是武斷排除所有長片或劇情片, so that 推薦仍保有合理選擇空間。
7. As a 使用者, I want 推薦同時考慮內容類型、主題、年代、片長與語言限制, so that 結果比固定 mood 類型映射更貼近情境。
8. As a 使用者, I want TMDB 關鍵字由真實搜尋結果解析, so that 模型不能捏造不存在的 keyword ID。
9. As a 使用者, I want 候選池同時包含熱門與高評分電影, so that 結果不會完全被熱門度支配。
10. As a 使用者, I want 最終推薦以情境符合度為優先, so that 類型多樣性不會再次稀釋我的原始需求。
11. As a 使用者, I want 最終五部中最多包含一部合理的驚喜選擇, so that 片單在高度符合之外仍有有限探索性。
12. As a 使用者, I want AI 能真正淘汰與重排 TMDB 候選片, so that 第二次模型呼叫會實際改善片單而不只是補文字。
13. As a 使用者, I want 每部推薦理由連結我的需求與電影特徵, so that 我能理解這部片為什麼適合現在的我。
14. As a 使用者, I want 推薦理由不要重述電影簡介, so that 理由提供的是選片價值而不是重複內容。
15. As a 使用者, I want 推薦理由只引用已提供的電影資料, so that 模型不會憑記憶捏造演員、導演、片長或劇情細節。
16. As a 使用者, I want 推薦理由不對我的心理或健康狀態下診斷, so that 文字保持尊重且不做不當推論。
17. As a 繁體中文使用者, I want 選片方向、標籤與推薦理由使用自然的繁體中文, so that 結果能直接閱讀。
18. As a 英文使用者, I want 選片方向、標籤與推薦理由使用英文, so that 語言與目前介面一致。
19. As a 使用者, I want 看到「本次選片方向」摘要與少量動態標籤, so that 我知道系統如何理解我的需求。
20. As a 使用者, I want 所有明確限制都出現在選片方向標籤中, so that 我能確認重要條件沒有被遺漏。
21. As a 使用者, I want 軟性偏好只顯示最重要的兩至三項, so that 畫面不會被過多內部分類淹沒。
22. As a 使用者, I want 畫面不要出現「AI 的理解」或原始 JSON, so that 介面保持自然且非技術化。
23. As a 使用者, I want 在處理期間看到進度條與百分比, so that 我知道系統仍在工作。
24. As a 使用者, I want 進度條在三十秒內完成、回退或顯示錯誤, so that 我不會無止境等待。
25. As a 使用者, I want 只看到完成後的最終片單, so that 中間候選片不會突然消失或重新排序。
26. As a 使用者, I want 條件不足以找到五部片時仍看到較少但符合要求的結果, so that 系統不會加入不合條件的電影湊數。
27. As a 使用者, I want 完全沒有結果時能返回調整描述, so that 我可以主動放寬條件再挑一次。
28. As a 使用者, I want 第一階段模型失敗時看到可重試錯誤, so that 系統不會以無關熱門片冒充個人化推薦。
29. As a 使用者, I want 第二階段模型逾時時仍看到基本排序結果, so that 已完成的 TMDB 搜尋不會被浪費。
30. As a 使用者, I want 第二階段 fallback 不顯示額外技術提示, so that 結果畫面保持簡潔。
31. As a 使用者, I want fallback 電影卡片顯示電影介紹而不是假的個人化理由, so that 系統不會把未經模型確認的文字冒充推薦依據。
32. As a 登入使用者, I want 推薦結果自動保存到歷史紀錄, so that 我能稍後重新查看片單。
33. As a 注重隱私的使用者, I want 原始輸入不被持久保存, so that 情緒或情境描述不會留在資料庫。
34. As a 歷史頁使用者, I want 看到結構化選片方向、推薦結果與模型資訊, so that 我能理解每次紀錄的推薦背景。
35. As a 使用者, I want 歷史保存不延遲片單顯示, so that 資料庫寫入不會吃掉三十秒等待預算。
36. As a 未登入使用者, I want 仍可瀏覽、搜尋與使用其他電影功能, so that 登入限制只保護 AI 挑片額度。
37. As a 產品擁有者, I want AI 挑片限定登入使用者, so that OpenRouter 免費額度不會被匿名濫用。
38. As a 維護者, I want AI 供應商與模型由後端設定, so that 前端不會取得秘密金鑰且模型能在不改 UI 的情況下替換。
39. As a 維護者, I want 使用者介面與產品 README 使用「AI 模型」泛稱, so that 產品文案不會與單一供應商品牌綁定。
40. As a 維護者, I want 技術部署文件明確記錄 OpenRouter 與所需 Secrets, so that 部署者知道真實整合方式。
41. As a 維護者, I want 模型輸出經 tool calling 與 Zod 雙重約束, so that 不支援 Structured Outputs 的模型仍能安全產生結構化資料。
42. As a 維護者, I want TMDB 參數有嚴格白名單、數量與範圍限制, so that 模型不能產生任意或高成本查詢。
43. As a 維護者, I want 一個推薦協調介面封裝驗證、查詢計畫、候選池、重排與歷史保存, so that 前端不需要理解整條供應商資料流。
44. As a 維護者, I want 查詢計畫、候選探索與推薦重排可獨立測試, so that 外部 API 變化不會迫使測試依賴真實網路。
45. As a 維護者, I want 三十秒 deadline 能取消尚未完成的上游請求, so that timeout 後不會繼續浪費 OpenRouter 或 TMDB 資源。
46. As a 維護者, I want 推薦歷史使用背景任務保存並自行處理錯誤, so that 保存失敗不會改變已回傳結果。
47. As a 維護者, I want 清除所有舊推薦歷史資料, so that 新實作不需要維護固定四分類與新結構化意圖兩套相容邏輯。
48. As a 維護者, I want 收藏、帳號與其他資料不受歷史清理影響, so that migration 的破壞範圍只限已確認的推薦紀錄。
49. As a agent, I want PRD 明確列出不支援的電影搜尋需求, so that 我不會擅自加入演員、導演、平台或參考電影查詢。
50. As a agent, I want 有固定驗收情境與 fallback 行為, so that 實作完成與否能以外部結果判斷。

## Implementation Decisions

- AI 挑片的使用者互動維持一次輸入直接出片，不在語意模糊時追加問題。
- 沒有明說期望時，查詢計畫預設協助改善或調節當下情緒；明確要求沉浸、轉換心情或避免內容時，以明確要求為準。
- 只有使用者明確說出的限制能成為 hard constraints。模型推測出的情緒方向、節奏、理解負擔與主題只能成為 soft preferences。
- 建立一個深層的推薦協調 Module，以單一 authenticated request 接受原始需求與 locale，回傳選片方向、動態標籤、最多五部推薦、理由及 provider/model metadata。前端不直接編排 OpenRouter、TMDB keyword、Discover、重排與歷史保存步驟。
- 舊的獨立需求分析流程不再需要。推薦協調流程負責第一次模型查詢計畫、TMDB 候選探索及第二次模型重排。
- OpenRouter 使用 OpenAI-compatible Chat Completions endpoint。供應商金鑰、模型與 TMDB server token 只存在 Supabase Secrets。
- 模型設定使用 `OPENROUTER_MODEL`，預設暫定為 `inclusionai/ling-3.0-flash:free`。模型名稱必須可由環境變數替換，不得硬編碼進 UI。
- 由於暫定模型支援 tools 與 tool choice、但未宣告 Structured Outputs 或 response format 支援，兩次模型呼叫都使用強制 tool calling。每次 tool arguments 都必須經 Zod 驗證後才能進入下一階段。
- 第一階段輸出分為 intent summary、hard constraints、soft preferences、display labels 與受限的 Discover plan。不得保存模型原始回應或內部推理。
- AI 可控制的查詢白名單為：最多三個 include genre IDs、最多三個 exclude genre IDs、最多兩個 keyword names、可選 runtime maximum、release year minimum、release year maximum 及 original language。
- Genre ID 必須落在應用程式已知的 TMDB 電影類型白名單。Keyword 由模型輸出名稱，後端再透過 TMDB keyword search 解析真實 ID；模型不得直接輸出 keyword ID。
- 最多兩個 keyword search 必須並行。查不到的 keyword 可忽略，不得阻止其他有效條件繼續。
- `include_adult=false`、`include_video=false`、最低票數、排序策略與 fallback 放寬規則由系統控制，不交給模型。
- 相同查詢計畫並行取得熱門排序與高評分排序結果，再去重並建立最多二十部的候選池。候選資料只使用 Discover 已提供的片名、簡介、類型、年份、語言、評分、票數與熱門度。
- 不為候選池逐片查詢 TMDB 詳情。推薦理由不得提及候選資料未提供的演員、導演、精確片長或其他外部事實。
- 精準查詢不足十五部候選時可自動放寬一次 include 條件。任何 explicit exclusion、adult restriction、runtime maximum 或其他 hard constraint 都不得在 fallback 中移除。
- 第二階段模型同時接收原始使用者文字、驗證後的選片方向及簡化候選資料。原始文字只用於當次推論，不寫入歷史。
- 第二階段能選擇、淘汰與重新排序候選電影，而不是保持 TMDB 原順序。輸出電影 ID 必須存在於候選池且不得重複。
- 候選片至少五部時回傳五部；只有一至四部時全部回傳；零部時回傳明確 empty state。不得違反 hard constraints 湊滿五部。
- 最終片單以情境符合度為優先，其中四部預期為 primary recommendations，最多一部可標記為 wildcard。候選不足時不要求一定包含 wildcard。
- 推薦理由採一句「需求對應＋電影依據」。繁體中文上限五十個 Unicode 字元、英文上限一百二十個字元。
- 推薦理由不得重述或大幅複製電影簡介，不得直接重複敏感原始輸入，不得對使用者下心理或健康診斷，也不得加入候選資料無法支持的斷言。
- 若一部電影無法提出足夠的使用者需求關聯，就不應選入最終片單。不能以一般性的「符合你的條件」取代實際關聯。
- 前端只在完整結果回傳後顯示片單，不先顯示中間 TMDB 候選電影。
- 結果區顯示「本次選片方向」自然語言摘要。不得使用「AI 的理解」作為標題，也不得顯示原始 JSON、內部推理或 TMDB 技術參數。
- 動態標籤必須包含全部明確限制，並只顯示最重要的兩至三項 soft preferences。
- 載入 UI 使用動畫進度條與百分比。進度從 0% 隨等待時間前進至最高 90%，成功時完成至 100%；它是視覺等待回饋，不代表後端真實階段，也不導入 SSE。
- 整體流程有三十秒 hard deadline。deadline 必須傳播到尚未完成的 OpenRouter 與 TMDB fetch，避免瀏覽器停止等待後上游仍繼續執行。
- 第一階段在 deadline 前未產生有效查詢計畫時回傳可重試錯誤，不用無關熱門片代替。
- 已取得候選片但第二階段失敗或逾時時，使用熱門與高評分結果的 deterministic merge 產生最多五部 fallback。UI 不顯示額外 fallback 標籤，電影卡片顯示 overview，不冒充 AI 推薦理由。
- 不做隱藏自動 AI retry。只有使用者主動重試才開始新的完整流程，避免快速消耗免費模型額度。
- 推薦歷史不在回應 critical path 中等待。結果確定後，以 Supabase Edge Runtime background task 寫入結構化意圖、查詢計畫、候選 ID、推薦快照、理由、provider 與 model。
- 背景歷史寫入必須自行捕捉並記錄錯誤；寫入失敗不得改變已回傳片單，也不額外建立前端保存請求。
- 歷史只保存結構化 intent summary、hard constraints、soft preferences、Discover plan 與推薦結果；不保存原始使用者文字、原始 prompt 或原始模型回應。
- 新 migration 必須刪除 `ai_recommendation_runs` 的全部既有資料，包括舊 `deepseek`、`deepseek-criteria` 與 `fallback` 紀錄。不得刪除或改動 wishlist、auth user 或其他資料。
- 新歷史資料只支援新版結構，不建置舊四分類紀錄的相容 renderer。
- AI 挑片維持登入限定。未登入使用者仍可使用一般瀏覽、搜尋、隨機挑片及其他既有功能。
- 第一版不新增自訂 per-user rate-limit persistence。先以登入門檻、既有輸入長度限制、三十秒 deadline 與供應商限制控制用量；只有觀察到實際濫用時才增加。
- 使用者介面與三語產品 README 將特定供應商品牌改為泛稱 AI 模型。技術部署文件需明確說明 OpenRouter、`OPENROUTER_API_KEY`、`OPENROUTER_MODEL` 與 AI Picker 使用的 server-side TMDB token。
- provider metadata 使用 `openrouter`，model metadata 保存實際使用的完整 model slug。
- 不新增 production dependency。優先使用現有 Zod、Supabase client、TMDB service pattern、React Query 與平台 fetch/AbortController。
- 大規模變更完成後，依專案慣例新增 logs 形式的實作紀錄。

## Testing Decisions

- 好的測試應驗證可觀察的輸入、輸出、deadline 與 fallback 行為，不應鎖死 prompt 的完整字串、內部 helper 名稱或元件拆分方式。
- 查詢計畫 Module 需要單元測試，覆蓋 tool arguments 驗證、genre 白名單、最多兩個 keyword、明確限制與推測偏好的區隔，以及未指定目標時的情緒調節預設。
- 候選探索 Module 需要單元測試，覆蓋 keyword 名稱解析、熱門與高評分查詢並行結果、去重、候選上限、一次放寬及 hard constraints 不被移除。
- 推薦重排 Module 需要單元測試，覆蓋候選 ID membership、去重、輸出順序、一至五部結果、最多一部 wildcard、理由長度與不合法 provider output。
- Fallback 排序需要獨立測試，確保同一組熱門與高評分結果產生穩定輸出，不需要依賴模型或真實 TMDB。
- 推薦協調 Edge Function 需要以 mock fetch 測試 authenticated success、未登入拒絕、第一階段失敗、TMDB empty、第二階段 timeout、三十秒 deadline propagation 及 provider error normalization。
- 歷史背景保存需要測試回應不等待資料庫 insert、保存 payload 不含原始輸入，以及背景 insert 失敗不改變回傳結果。
- Migration 測試需要確認只清除 `ai_recommendation_runs`，不包含 wishlist 或 auth 相關資料。
- 前端服務測試需要確認只呼叫單一推薦協調 endpoint、驗證回應 schema，並能處理 error、empty、少於五部與 fallback 無理由結果。
- AI Picker UI 測試需要確認登入門檻、0% 至 90% 的等待進度、成功時 100%、三十秒 timeout、完成前不顯示候選片、選片方向摘要、動態標籤及結果數量。
- History UI 測試只需要覆蓋新版 intent summary、標籤、推薦快照與 provider/model metadata；不測舊四分類相容行為。
- i18n 測試或靜態檢查需要確認新增使用者可見文字在繁體中文與英文 locale 都存在，並移除使用者介面中的 DeepSeek 品牌名稱。
- README 與部署文件驗證需要確認產品文案使用 AI 模型泛稱，技術文件使用 OpenRouter 真實設定名稱，且前端程式碼不讀取 provider secret。
- 驗收測試至少涵蓋以下八個輸入，並檢查選片方向、hard constraints、動態標籤、結果類型與理由關聯：
  1. 工作很累，想看不用動腦的電影。
  2. 心情不好，想轉換心情。
  3. 剛失戀，想大哭。
  4. 剛失戀，但不要愛情片。
  5. 和家人看，不要恐怖或成人內容。
  6. 想看 90 分鐘內的輕鬆電影。
  7. 很無聊，想刺激一點但不要恐怖片。
  8. 想看近年的日語療癒電影。
- 推薦理由品質需以固定候選 fixture 檢查：理由必須引用至少一項使用者需求與一項候選資料可支持的電影特徵，且不得直接重現 overview 句子。
- 外部 OpenRouter 與 TMDB 不納入一般單元測試；部署前另以受控帳號進行一次 live smoke test，確認暫定模型能完成兩次 tool calls。
- 完成實作後執行 `bun run test:run`、`bun run lint` 與 `bun run build`。若 `bun run test:run` 已通過，不再額外執行 `npm test`。

## Out of Scope

- 不支援依參考電影尋找相似片，例如「推薦類似某部電影的作品」。
- 不支援演員、導演、製片公司或人物條件查詢。
- 不支援 Netflix 或其他串流平台供應狀態篩選。
- 不支援電影分級條件；成人內容仍由系統固定排除。
- 不替二十部候選片逐一查詢 TMDB 詳情。
- 不建立自訂 keyword 資料庫或讓模型直接產生 keyword ID。
- 不顯示模型 chain-of-thought、內部推理、原始 prompt、原始 JSON 或 TMDB 技術參數。
- 不保存使用者原始情緒或情境文字。
- 不導入 SSE 或真實後端階段進度協議。
- 不自動切換到其他 OpenRouter 模型；模型替換由部署設定控制。
- 不新增 custom per-user rate limit、queue、cache service 或新的 production dependency。
- 不變更一般電影瀏覽、搜尋、隨機挑片、收藏或帳號流程。
- 不改動尚未完成的 Firebase 服務。
- 不在本 PRD 中實作功能或拆成多個工程 issue；後續可再由 PRD 產生 issues。

## Further Notes

- 本 PRD 整理自 2026-07-26 至 2026-07-27 的需求訪談與現有程式資料流檢查。
- 暫定 OpenRouter 模型 `inclusionai/ling-3.0-flash:free` 於 2026-07-27 已確認存在，但免費模型的延遲與可用性沒有 SLA。三十秒是 UI 的最大等待預算，Edge Function 會提前三秒截止以保留 CORS 與傳輸時間；這不是每次都能產生完整 AI 重排結果的保證。
- 動畫百分比是視覺等待回饋。它可以根據 elapsed time 前進，但不得被文件或 UI 描述成真實後端完成率。
- 清除全部推薦歷史是使用者已明確確認的破壞性 migration 決策；實作與部署時仍應將 SQL 影響範圍限制在 `ai_recommendation_runs`。
- `ready-for-agent` 表示需求與主要產品決策已收斂。實作仍應先確認 OpenRouter tool call 的 live response shape、Supabase background task 型別與 TMDB server secret 名稱。
