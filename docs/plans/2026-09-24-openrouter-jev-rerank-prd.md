# 2026-09-24 OpenRouter Jev Candidate Rerank PRD

Status: ready-for-agent

## Problem Statement

Movie Picker 目前能把自然語言需求轉成受限制的 TMDB 查詢計畫，並從熱門度與評分排序結果建立最多二十部候選片。然而候選合併後只依既有順序截取結果，沒有再次判斷每部候選是否真正符合「激勵工作」、「重新振作」、「輕鬆但不要愛情片」等語意目標。

因此，候選片可能符合寬泛類型、熱門度或評分條件，卻與使用者當下的選片方向無關。例如「尋找能激勵工作的電影」可能混入只有藝術、裸體或一般劇情關聯，但沒有工作、職涯、堅持或重新開始主題的電影。

目前查詢計畫已能產生 `qualities` 等軟性偏好，但這些資料沒有參與候選片的最終排序。若直接擴充 TMDB 類型或關鍵字規則，仍難以完整表示自然語言情境，也容易讓查詢條件膨脹。

## Solution

在現有 TMDB 候選探索完成後、建立最終推薦快照前，加入 OpenRouter Jev 語意重排。

系統保留目前的需求解析、明確限制、TMDB 查詢與 deterministic filtering。Jev 不負責判斷年份、片長、語言、國家、人物、媒體類型或排除類型等硬條件，只判斷一部已通過硬篩選的候選片，是否實質符合本次選片方向。

後端對最多二十部候選逐部呼叫 OpenRouter Decisions API，使用相同的 `Noul` 問題取得 0–1 的語意相關度。通過最低相關度的候選依分數由高到低排列，同分時保留原候選順序，最後回傳最多五部。候選不足五部時不以低相關電影湊數。

OpenRouter 呼叫只存在 Supabase Edge Function 內，使用 server-side Secret 與原生 `fetch`。第一版固定模型為 `typesafe/jev-1.13`，不使用會自動漂移的 latest alias，也不新增 OpenRouter SDK 或其他 production dependency。

## User Stories

1. As a 使用者, I want 最終推薦依自然語言需求的實質符合度排序, so that 熱門但無關的電影不會排在真正符合的電影前面。
2. As a 想獲得工作動力的使用者, I want 系統優先推薦與工作、職涯、創業、堅持或重新振作有核心關聯的電影, so that 結果不只是泛用勵志片。
3. As a 有排除要求的使用者, I want 明確限制在語意重排前已被可靠執行, so that 模型不能把不合格電影重新放回片單。
4. As a 有片長、年份或語言限制的使用者, I want 這些條件由程式與 TMDB 資料判斷, so that 不會因模型誤讀數字而違反需求。
5. As a 使用者, I want 最終片單最多五部, so that 我能在少量、較相關的選項中快速決定。
6. As a 使用者, I want 合格電影不足五部時看到較少的結果, so that 系統不會為了湊數加入無關電影。
7. As a 使用者, I want 所有推薦仍來自已取得的 TMDB 候選集, so that AI 不能捏造或新增不存在的電影。
8. As a 使用者, I want 同一批候選在相同條件下有穩定的排序規則, so that 同分與部分失敗不會造成不可解釋的亂序。
9. As a 使用者, I want Jev 暫時無法使用時仍能取得現有基本推薦, so that 上游服務失敗不會讓整個挑片流程中斷。
10. As a 使用者, I want fallback 結果不冒充已完成語意重排, so that 系統回傳的 provider 與 fallback metadata 能反映實際處理結果。
11. As a 繁體中文使用者, I want 「激勵工作」等繁中需求有固定回歸案例, so that 上線前能確認 Jev 對本產品語料真的有效。
12. As a 英文使用者, I want 英文選片需求使用相同的排序政策, so that 不同 locale 不會走兩套難以維護的流程。
13. As a 維護者, I want Jev 只處理語意判斷, so that deterministic 規則與概率判斷的責任清楚分開。
14. As a 維護者, I want OpenRouter API key 只存在 Supabase Secrets, so that 瀏覽器與公開 bundle 不會取得供應商憑證。
15. As a 維護者, I want Jev 回應在使用前經過嚴格驗證, so that 缺少答案、非法分數或非預期回應不會污染片單。
16. As a 維護者, I want 每次 Jev 只收到判斷所需的最少資料, so that token、延遲與不相關 context 保持可控。
17. As a 維護者, I want 二十個候選判斷共用既有 deadline 與取消訊號, so that 使用者離開或請求逾時後不會繼續消耗額度。
18. As a 維護者, I want 個別候選失敗不影響其他成功判斷, so that 暫時性錯誤不必丟棄整批已完成結果。
19. As a 維護者, I want 在正式流量前以固定 fixture 比較原排序與 Jev 排序, so that 導入決策建立在本產品資料而非供應商範例上。
20. As a 維護者, I want 記錄實際模型名稱、成本、延遲與 fallback 狀態, so that 模型漂移與推薦品質問題可以追查。
21. As a 產品擁有者, I want 第一版不增加資料表與新的 production dependency, so that 驗證方案的成本與回復成本保持低。
22. As a agent, I want PRD 明確區分 Jev ranking 與推薦理由生成, so that 實作時不會要求 Jev 產生它不支援的文字理由。

## Implementation Decisions

- 保留現有自然語言查詢計畫、deterministic media rules、人物與 keyword 解析、TMDB Discover 及候選池合併流程。
- 語意重排放在候選探索完成後、最終推薦快照建立前；候選上限維持二十部，最終推薦上限從十部調整為五部。
- Jev 經由 OpenRouter Decisions API 呼叫，而不是一般 Chat Completions endpoint。端點為 `POST https://openrouter.ai/api/alpha/decisions`。
- 第一版固定使用 `typesafe/jev-1.13`。不得使用 `~typesafe/jev-latest`，避免未經測試的模型更新直接改變排序。
- 使用現有平台 `fetch` 呼叫 OpenRouter，不加入 `@openrouter/sdk`。只有當原生請求與回應維護成本實際造成問題時，才另案評估 SDK。
- OpenRouter 憑證使用新的 server-side `OPENROUTER_API_KEY` Secret。前端不得讀取、轉送或顯示此 Secret。
- 每部候選各自形成一個 pointwise 判斷。`state` 僅包含驗證後的選片方向、相關 soft preferences，以及該候選的 ID、片名、簡介、類型名稱、年份與原始語言。
- 不把 poster、backdrop、熱門度、評分、票數或其他不影響語意符合度的欄位送給 Jev。
- 不把原始使用者文字再次送給 OpenRouter；優先使用已由現有查詢計畫產生且驗證過的 intent summary、qualities、include keywords 與 display labels，降低不必要的敏感資訊傳輸。
- 每部候選使用相同且單一的 `Noul` 問題：「這部候選是否實質符合本次選片目標？」true criteria 要求核心內容明確支持需求；false criteria 包含只有寬泛類型相近、關聯附帶或缺乏證據的情況。
- 第一版不使用 `Choice` 選 top 5，也不使用一個綜合 `Score` 代替相關度。`Choice` 只產生一個首選；`Score` 保留給未來需要評估單一程度軸時使用。
- 二十個 pointwise 判斷可並行執行，並以 settled 結果個別處理；不實作 190 次 pairwise 比較、重試佇列或額外批次服務。
- 所有 OpenRouter 請求共用現有 Edge Function 的 AbortSignal 與三十秒 deadline。第一版不新增隱藏自動 retry。
- 只接受 `type=noul` 且 `noul` 為 0–1 有限數值的回應。缺少欄位、非法型別、非有限值或超出範圍均視為該候選判斷失敗。
- 排序只使用同一次推薦執行中的 `noul` 值，不把它描述成跨請求可比較的使用者偏好機率。
- 初始最低相關度以 `0.5` 作為「yes 比 no 更可能」的簡單門檻；正式上線前必須用固定 fixture 校準。門檻先以程式常數維持，不新增只有一個使用點的設定系統。
- 通過門檻的候選依 `noul` 由高到低排序；分數相同時以原候選位置作 deterministic tie-break。
- 至少一部候選取得有效且通過門檻的結果時，只回傳這些合格候選，最多五部，不以判斷失敗或低於門檻的電影補滿。
- Jev 有有效回應但所有候選都低於門檻時，回傳 empty state；這不是 provider fallback。
- 全部 Jev 判斷失敗、OpenRouter 整體不可用或在 deadline 前沒有任何有效答案時，回退到現有 deterministic 候選順序並取前五部。
- 現有 `used_fallback` 必須涵蓋候選探索放寬或 Jev 全量 fallback。個別候選失敗但仍有至少一部有效結果時，不視為全量 fallback，但需記錄成功與失敗數量。
- 最終回應與歷史紀錄的 provider/model metadata 代表實際決定最終順序的引擎。Jev 成功時 provider 為 `openrouter`，model 使用 OpenRouter 回應中的實際模型名稱；全量 fallback 時保留既有 planner provider/model 並標記 fallback。
- 前端 provider schema 必須接受 `openrouter`，但一般使用者介面仍顯示「AI 模型」泛稱，不新增 Jev 或 OpenRouter 品牌文案。
- Jev 不產生推薦理由。第一版電影卡片繼續使用現有電影簡介與選片方向，不新增第三次生成式模型呼叫。
- 不新增資料表或 migration。沿用現有推薦歷史結構保存最終推薦快照、provider、model 與 fallback 狀態；若現有欄位無法容納個別判斷 telemetry，先只寫 Edge Function structured logs。
- structured logs 至少記錄 request 級候選數、成功判斷數、失敗判斷數、通過門檻數、總延遲、OpenRouter 回傳模型、usage cost 與是否全量 fallback；不得記錄 API key、完整原始輸入或完整電影簡介。
- OpenRouter Decisions API 目前位於 alpha 路徑。若端點或回應契約變更，應由 response validation 觸發安全 fallback，不可讓未驗證資料進入推薦結果。
- 不更動 Firebase、一般瀏覽、搜尋、收藏、帳號或其他非 AI Picker 流程。
- 實作完成後新增一份 logs 形式的變更紀錄，記錄部署設定、回退策略與驗證結果。

## Testing Decisions

- 好的測試只驗證可觀察的候選 membership、排序、門檻、結果數量、fallback、deadline 與 metadata，不鎖死 helper 名稱、模組拆分或完整 question 字串。
- 語意重排邏輯需要單元測試，使用固定 Jev 回應驗證 0–1 分數解析、降冪排序、原順序 tie-break、最多五部與低於門檻淘汰。
- 回應驗證需要覆蓋缺少 answer、錯誤 question ID、非 `noul` 類型、字串分數、NaN、Infinity、小於 0 與大於 1。
- 候選 membership 測試必須確認最終推薦只能來自輸入候選，不能增加、替換或重複電影 ID。
- 部分失敗測試必須確認成功且通過門檻的候選仍可回傳，失敗候選不補入結果，並保留 deterministic tie-break。
- 全量失敗測試必須涵蓋 401、402、413、429、5xx、逾時、AbortError、非法 JSON 與沒有任何有效 answer，並確認回退至現有候選順序的前五部。
- Deadline 測試必須確認上游 OpenRouter fetch 收到同一個 AbortSignal，請求取消後不再修改結果。
- Provider metadata 測試必須確認 Jev 成功時回傳 `openrouter` 與實際模型名稱，全量 fallback 時回傳實際使用的 fallback provider/model 並標記 `used_fallback=true`。
- 前端服務 schema 測試需要新增 `openrouter` provider 成功案例，並保留未知 provider 拒絕案例。
- AI Picker UI 只需確認結果數量可以是一至五部、少於五部不視為錯誤，且 provider 變更不造成使用者可見品牌文案。
- 歷史紀錄測試需要確認保存的是重排後順序與實際 provider/model，且不新增原始使用者輸入。
- 固定 fixture 至少包含以下案例：
  1. 「尋找能激勵工作的電影」：工作、職涯、創業、堅持或重新振作題材應優先；裸體藝術但沒有工作動機的候選不得進入 top 5。
  2. 「剛失戀，但不要愛情片」：已被 hard constraint 排除的愛情片不得出現在 Jev 輸入或最終結果。
  3. 「工作很累，想看不用動腦的電影」：輕鬆、低理解負擔的候選應優先，單純高評分的沉重電影不應自動勝出。
  4. 相同意圖的繁中與英文改寫：比較 top-5 membership，量化 CJK 品質差距。
  5. 同一批二十部候選洗牌：確認高分候選集合穩定，只有同分候選依輸入順序 tie-break。
  6. 所有候選皆低於門檻：回傳 empty state，不以低相關電影湊滿。
- 離線評估至少記錄 Precision@5、nDCG@5、hard-constraint violation、candidate-membership violation、empty rate、fallback rate 與 p50/p95 latency。
- 不把 OpenRouter 或 TMDB live request 放入一般單元測試。部署前使用受控帳號執行一次 live smoke test，確認 Decisions API、Secret、模型 ID、response shape、成本與 Edge Function deadline。
- 完成實作後執行 `bun run test:run`、`bun run lint` 與 `bun run build`。若 `bun run test:run` 已通過，不再額外執行 `npm test`。

## Out of Scope

- 不讓 Jev 產生推薦理由、選片方向或其他自然語言內容。
- 不以 Jev 取代現有需求解析模型或 TMDB candidate retrieval。
- 不建立電影向量資料庫、embedding 搜尋、自有電影 metadata DB 或人工 tagging 系統。
- 不逐片查詢額外 TMDB detail、credits、watch provider 或 certification 資料。
- 不實作 Choice top-1、pairwise tournament、listwise top-k、multi-stage ensemble 或 A/B 平台。
- 不新增 OpenRouter SDK、queue、cache、rate-limit table、telemetry table 或新的 production dependency。
- 不建立使用者長期偏好模型，也不讓不同使用者的 Jev 分數互相比較。
- 不改變 hard constraints、TMDB fallback 放寬政策或候選召回策略。
- 不顯示原始 Jev score、confidence、prompt、criteria、provider error 或技術 fallback 訊息給一般使用者。
- 不修改尚未完成的 Firebase 服務。
- 不在本 PRD 中實作、部署或建立多個工程 issues。

## Further Notes

- OpenRouter 已於 2026-09-24 提供 Jev 1.13，模型 ID 為 `typesafe/jev-1.13`，並透過 Decisions API 接受 `state`、`questions` 與 `model`。參考：[OpenRouter Decisions API](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request)、[Jev 1.13 model page](https://openrouter.ai/typesafe/jev-1.13/)。
- OpenRouter Decisions API 的輸出直接支援 `Noul`、`Choice` 與 `Score`；本 PRD 選擇 `Noul`，因為需求是對每一部候選判斷「是否符合」，再由程式排序，而不是一次選出唯一電影。
- 官方 TypeSafe reranking cookbook 使用相同的 query-candidate pointwise 方式逐候選取得 `Noul` 並排序。參考：[TypeSafe reranking cookbook](https://docs.typesafe.ai/cookbooks/rerank_typesafe)。
- `0.5` 是第一版可解釋的起始門檻，不是供應商保證值。實作前若 fixture 顯示不適合，應直接在同一處調整常數，不先建立遠端設定系統。
- Supabase 2026-09-24 changelog 未顯示與本 PRD 的 Edge Function `fetch`、AbortSignal 或 Secrets 使用方式直接衝突的 breaking change；實作與部署時仍需再確認當日文件。
- `ready-for-agent` 表示產品方向與 MVP 範圍已收斂；OpenRouter alpha endpoint 的 live response shape 與繁中 fixture 表現仍是實作前置驗證門檻。
