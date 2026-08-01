# 2026-07-29 AI 推薦人物、關鍵字與媒體型別路由 PRD

Status: ready-for-agent

## Problem Statement

Movie Picker 現有 AI 推薦只接受自由文字與介面語言，後端固定建立電影
Discover 查詢。查詢計畫能表達類型、keyword、片長、年份、語言與排除條件，
但不能表達演員、導演或其他人物。當使用者輸入「我喜歡布萊德彼特」時，
模型只能把人名塞進 `keyword_names`；TMDB keyword search 找不到人物後，
條件會被靜默移除，最後回傳與布萊德彼特無關的熱門或高評分電影。

單純新增人物 ID 仍不足以解決問題。電影 Discover 的 `with_cast` 適合演員，
但 `with_crew` 會包含 Director、Writer、Producer、Storyboard Artist、
Thanks 等所有 crew 工作。實測「我要看宮崎駿電影」時，`with_crew=608`
會包含宮崎駿僅列為 Thanks 的《復仇者聯盟：奧創紀元》與
《玩具總動員3》，不能代表「宮崎駿導演作品」。

Keyword 也存在語言與解析問題。AI 以繁體中文產生「療癒」、「復仇」或
「太空旅行」時，TMDB keyword search 可能回傳零筆；相同概念改用
`healing`、`revenge`、`space travel` 才能解析。現有 resolver 又直接採用
第一筆結果，無法保證取得的是正規化後的同名 keyword。

產品同時已有一般電影與劇集瀏覽能力，但 AI 推薦的 request、候選 schema、
結果快照、歷史紀錄與 UI 卡片仍只接受電影。只在前端新增「劇集」標籤並切換
Discover URL，會讓 TV 回應中的 `name`、`original_name`、
`first_air_date` 等欄位無法通過既有電影 schema。

「我想看點題材輕鬆的日劇」也揭露電影與劇集不能共用同一組搜尋預設。
日本 Comedy TV 若未排除 Animation，結果會被日本動畫佔據；若沿用電影的
`vote_count.gte=100`，加入日本、真人、Comedy 與 slice-of-life 條件後會
得到零筆。推薦系統需要明確區分使用者選擇的媒體型別、明確正向條件、
明確排除條件與 AI 推測偏好，才能避免再次以無關熱門內容填補結果。

## Solution

在 AI Picker 輸入區加入電影／劇集媒體型別標籤，並把選擇結果作為結構化
`media_type` 傳給 Supabase Edge Function。媒體型別是使用者明確選擇，
不交給 AI 判斷，也不透過在 prompt 後附加文字實作。

保留目前一次 OpenAI 規劃呼叫。模型在既有 query plan 中額外輸出受限的
人物名稱、人物角色提示、英文 TMDB keyword lookup name，以及條件是
使用者明說或模型推測。模型不得輸出 TMDB person ID 或 keyword ID。

後端以 TMDB 驗證所有外部實體：

- 人物名稱透過 Person Search 解析真實人物與主要工作部門。
- 電影演員可使用 `with_cast` 建立候選池。
- 電影導演與其他 crew 條件須以 Movie Credits 驗證實際 department/job，
  再與 Discover 條件結果取交集；不得只用 `with_crew`。
- 劇集人物條件使用 TV Credits 驗證 cast 或 crew 關係，再與 TV Discover
  結果取交集。
- Keyword 使用英文 lookup name 搜尋，優先選擇正規化後完全同名的結果。
- 人物與 keyword 搜尋可並行，且共用現有 deadline 與 AbortSignal。

候選探索依 `media_type` 固定路由至 Movie Discover 或 TV Discover，並將
兩種回應正規化為帶有 `media_type` 的共用 MediaItem snapshot。熱門與
高評分查詢維持並行與 deterministic merge，最多回傳十筆，不新增第二次
AI 呼叫。

Fallback 依條件來源分級。媒體型別、系統安全條件、使用者明確限制，以及
人物、明確類型、明確 keyword 等正向錨點都不可靜默移除。候選不足時只可
移除 AI 推測的 genre 或 keyword。全部明確條件無法滿足時回傳 empty 或
可修正錯誤，不使用無關熱門內容湊數。

## User Stories

1. As a 使用者, I want 在 AI Picker 明確選擇電影或劇集, so that 推薦不需要從自由文字猜測媒體型別。
2. As a 電影使用者, I want 電影標籤只搜尋電影, so that 結果不會混入劇集。
3. As a 劇集使用者, I want 劇集標籤只搜尋劇集, so that 結果不會混入電影。
4. As a 使用者, I want 媒體型別選擇不增加一次 AI 呼叫, so that 成本與等待時間維持可控。
5. As a 使用者, I want 輸入中的演員名字成為真實人物條件, so that 推薦確實包含該演員作品。
6. As a 布萊德彼特影迷, I want 「我喜歡布萊德彼特」回傳他的演出電影, so that 結果不會退化成一般熱門片。
7. As a 使用者, I want 人名先由 TMDB Person Search 驗證, so that 模型不能捏造 person ID。
8. As a 使用者, I want 中文譯名與人物別名能被 TMDB 搜尋, so that 我不需要先查英文姓名。
9. As a 使用者, I want 同名人物無法可靠辨識時看到明確狀態, so that 系統不會選錯人物後假裝符合需求。
10. As a 使用者, I want 找不到人物時不要回傳無關熱門內容, so that 片單不會掩蓋條件失敗。
11. As a 使用者, I want 「某人演的」只套用演員 credits, so that 其他工作關係不會污染結果。
12. As a 使用者, I want 「某人導演的」只套用 Director credits, so that Thanks、Writer 或 Producer credits 不會被當成導演作品。
13. As a 宮崎駿影迷, I want 「我要看宮崎駿電影」只回傳他導演的作品, so that 《復仇者聯盟：奧創紀元》與《玩具總動員3》不會因 Thanks credit 出現。
14. As a 使用者, I want 明確提到編劇或製片時依對應 department/job 驗證, so that 人物角色符合我的文字。
15. As a 使用者, I want 沒有明說人物角色時採用 TMDB 的主要工作部門, so that 常見演員與導演輸入仍能一次出片。
16. As a 使用者, I want 人物主要工作部門仍無法決定角色時看到可修正狀態, so that 系統不會使用過寬的 `with_people` 冒險猜測。
17. As a 使用者, I want 「布萊德彼特或李奧納多都可以」採用 OR, so that 任一人物的作品都可以入選。
18. As a 使用者, I want 「布萊德彼特和李奧納多共同演出」採用 AND, so that 結果必須同時包含兩人。
19. As a 使用者, I want 人物條件與 genre、keyword、年份等條件共同生效, so that 「布萊德彼特的復仇片」不會只滿足其中一項。
20. As a 使用者, I want 主題詞由 TMDB Keyword Search 驗證, so that 模型不能捏造 keyword ID。
21. As a 繁體中文使用者, I want UI 保留「療癒」等自然中文標籤, so that 技術 lookup name 不會出現在畫面。
22. As a 使用者, I want 後端使用英文 keyword lookup name, so that 中文主題詞不會因 TMDB keyword 語料限制而直接失效。
23. As a 使用者, I want keyword resolver 優先選擇正規化後完全同名的結果, so that 搜尋第一筆的近似詞不會被誤用。
24. As a 使用者, I want 明確說出的 keyword 不可在 fallback 中被靜默移除, so that 結果仍符合我指定的主題。
25. As a 使用者, I want AI 推測的 keyword 查不到時仍能使用其他有效條件, so that 次要推測不會阻止推薦。
26. As a 使用者, I want AI 推測的 genre 或 keyword 只在候選不足時放寬一次, so that 精準結果優先且 fallback 可預期。
27. As a 使用者, I want 完全沒有有效人物、keyword 或其他條件時看到誠實的熱門／高分基準片單, so that 系統不會把它宣稱為高度個人化推薦。
28. As a 使用者, I want 有明確正向條件但找不到結果時看到 empty state, so that 系統不會為湊滿十部而違反需求。
29. As a 劇集使用者, I want 人物條件透過 TV Credits 驗證, so that 電影專用的 `with_cast` 或 `with_crew` 不會被錯用到 TV Discover。
30. As a 劇集使用者, I want TV 回應正確顯示名稱與首播日期, so that 卡片不會因電影欄位假設而解析失敗。
31. As a 使用者, I want 每筆推薦快照都保存 `media_type`, so that 相同 TMDB ID 的電影與劇集不會互相衝突。
32. As a 歷史頁使用者, I want 電影與劇集推薦都能重新開啟正確詳情頁, so that 歷史紀錄不會固定導向電影路由。
33. As a 使用者, I want 「日劇」在劇集模式下代表日本真人劇集, so that 日本動畫不會大量佔據結果。
34. As a 使用者, I want 「日本動畫」能明確覆寫真人日劇預設, so that 動畫需求不會被錯誤排除。
35. As a 使用者, I want 「題材輕鬆」成為正向偏好, so that 結果不會只因日本與 Comedy 類型就納入沉重作品。
36. As a 使用者, I want 日本劇集使用符合 TV 資料量的品質門檻, so that 電影的高票數門檻不會造成零結果。
37. As a 使用者, I want 明確語言、來源國家、年份、片長與排除類型在 fallback 後仍保留, so that 系統不會犧牲實際限制。
38. As a 使用者, I want 人物與 keyword 搜尋並行, so that 增加實體解析後的等待時間仍可控。
39. As a 使用者, I want 所有上游請求共用三十秒 deadline, so that 失敗或逾時後不會繼續消耗資源。
40. As a 維護者, I want 電影與劇集候選正規化成共用媒體契約, so that 推薦 UI 與歷史不需要維護兩套互斥流程。
41. As a 維護者, I want query plan、實體解析與候選探索可獨立測試, so that 模型或 TMDB 變動能快速定位。
42. As a 維護者, I want provider 回應、Person、Credits、Keyword 與 Discover 資料都經 schema 驗證, so that 外部欄位漂移不會直接污染應用程式。
43. As a 維護者, I want 外部 schema 接受額外欄位但驗證必要欄位, so that TMDB 新增欄位不會再次造成 502。
44. As a 產品擁有者, I want 人物支援沿用現有一次 OpenAI 呼叫, so that 新增能力的 AI 邊際成本接近零。
45. As a 產品擁有者, I want 不增加新的 production dependency, so that 部署風險與維護成本維持最低。
46. As a agent, I want PRD 明確定義 `/search/movie` 的邊界, so that 電影片名搜尋不會被誤用為演員或 keyword fallback。
47. As a agent, I want 固定驗收輸入與已知反例, so that 人物、keyword 與劇集支援能以使用者可見結果驗證。

## Implementation Decisions

- Request contract 增加必填 `media_type: "movie" | "tv"`。`request`、`locale` 與
  `media_type` 由前端直接傳入；媒體型別不由模型產生。
- 電影／劇集標籤是單選且必須有預設值。使用者文字若明確要求的媒體型別與
  標籤衝突，回傳可修正的 mismatch error，不靜默改變標籤或忽略文字。
- 保留一次 OpenAI Chat Completions tool call。工具輸出新增最多兩位人物，
  每位包含名稱與受限角色提示；同時保留最多兩個 keyword lookup names。
- 人物角色白名單為 cast、director、writer、producer、any。模型只輸出名稱
  與角色提示，person ID、department 與 job 必須由 TMDB 回應驗證。
- 只有使用者明確提到人名時才能產生人物條件。模型不得從情緒、類型或片名
  推測某位演員或導演。
- 多人物預設採 OR；只有「共同演出」、「兩人都有參與」等明確語句才能採
  AND。最多處理兩位人物，超出部分不得建立額外 TMDB 查詢。
- 人物先經 Person Search 解析。優先採用名稱或別名相符且 department 符合
  角色提示的結果，再以主要工作部門與 popularity 協助排序。沒有清楚唯一
  結果時視為 unresolved。
- 電影 cast 條件使用已驗證 person ID 的 `with_cast`。電影 director、
  writer、producer 或 any crew 條件須取得 Movie Credits，依 department/job
  建立允許的 movie ID set，再與 Movie Discover 結果取交集。
- `with_crew` 不可單獨代表導演、編劇或製片作品。宮崎駿的 Thanks credit
  是固定回歸案例。
- 劇集的人物條件取得 TV Credits，依 cast 或 crew department/job 建立允許的
  TV ID set，再與 TV Discover 結果取交集。TV Discover 不承擔人物角色解析。
- 人物、keyword 與 credits 查詢在彼此獨立時使用 `Promise.all` 並行，全部
  接收同一個 AbortSignal。
- Keyword lookup name 使用英文 TMDB 詞彙；使用者可見摘要與 display label
  仍依 locale 輸出繁體中文或英文。
- Keyword resolver 先做 trim、大小寫與連字號正規化，再尋找完全同名結果；
  只有沒有完全同名且唯一近似結果足夠清楚時才可採用近似結果。
- 模型不得直接輸出 keyword ID。找不到的 inferred keyword 可移除；找不到的
  explicit keyword 必須產生 unresolved condition，不得靜默變成一般熱門片。
- 查詢計畫必須記錄每個正向條件是 explicit 或 inferred。Explicit positive
  anchors 包含人物、使用者明說的 genre 與 keyword；inferred soft includes
  包含模型從情境推測的 genre、keyword 與 qualities。
- Fallback 優先順序固定為：系統安全條件、媒體型別、明確 hard constraints、
  explicit positive anchors、inferred soft preferences。只有最後一層可以
  在候選不足時移除。
- Adult 排除、媒體型別、人物、明確 genre/keyword、排除 genre、片長、年份、
  語言與來源國家不得在 fallback 中移除。
- 精準查詢沒有結果時可執行一次 fallback；fallback 只移除 inferred genre
  與 inferred keyword。仍為零筆時回傳 empty state。
- 沒有人物、keyword、genre 或其他限制時，可回傳該媒體型別的熱門與高評分
  deterministic merge，但方向摘要必須清楚表示為一般探索，不宣稱已套用
  不存在的個人化條件。
- Movie route 使用 Movie Discover 與電影 genre 白名單；TV route 使用 TV
  Discover 與劇集 genre 白名單。兩者不得共用不相容的 genre enum。
- Movie route 的系統最低票數維持 100。TV route 的第一版最低票數使用 30，
  由後端常數控制且不交給模型。
- 「日劇」在 `media_type=tv` 下建立 `with_origin_country=JP`、
  `with_original_language=ja` 與 `without_genres=16`。明確的日本動畫需求
  取消此真人排除並加入 Animation。
- 「題材輕鬆」屬 explicit positive preference，可映射 Comedy genre 與經
  TMDB 驗證的英文 keyword。UI 顯示「輕鬆」，不顯示 `slice of life` 或 ID。
- 不要求每個「輕鬆」輸入都固定映射同一 keyword；但產生的 keyword 必須能
  解析，且測試 fixture 必須能驗證 explicit/inferred 與 fallback 行為。
- Movie 與 TV 回應正規化為共用 MediaItem snapshot，保留 `media_type`，
  並將 `title/release_date` 與 `name/first_air_date` 的呈現差異封裝在媒體
  顯示介面內。
- API 回應與推薦歷史中的每筆 recommendation 都必須包含 `media_type`。
  唯一識別使用 `(media_type, id)`，不得只以 TMDB 數字 ID 去重。
- 推薦歷史保存結構化 media type、人物名稱、已解析人物 ID、角色、
  explicit/inferred keyword、Discover plan 與推薦快照；仍不保存原始輸入、
  原始 prompt、模型原始回應或 chain-of-thought。
- 歷史 JSONB 可直接保存增量欄位；若資料庫欄位名稱仍使用 movie 專用語意，
  實作前需以 migration 改成媒體中立名稱或新增 media type，並保持既有 RLS
  與 user ownership policy。
- 最終仍以熱門／高評分候選 deterministic merge 回傳最多十筆。不新增第二次
  模型重排、逐片詳情查詢或隱藏 retry。
- Edge Function 維持 authenticated access、server-side OpenAI key、
  server-side TMDB token、三十秒 deadline 與背景歷史保存。
- 外部 OpenAI 與 TMDB schema 驗證必要欄位並 strip 額外欄位，避免 additive
  provider fields 再次造成整體失敗。
- 不新增 production dependency。沿用現有 Zod、平台 fetch、AbortController、
  Supabase client 與 MediaItem 模式。
- 大規模功能完成後新增 implementation log，記錄資料契約、fallback、測試、
  migration、部署版本與 live smoke test 結果。

## Testing Decisions

- 好的測試驗證 request、query plan、TMDB URL、候選集合、fallback、回應與
  UI 可見行為；不鎖死 prompt 全文、私有 helper 名稱或元件拆分方式。
- Request contract 測試電影與劇集 media type、缺少 media type、未知值，以及
  標籤與文字明確衝突的錯誤行為。
- Query plan 測試人物最多兩位、角色 enum、多人物 any/all、keyword 最多兩個、
  keyword lookup name、explicit/inferred 標記與 genre 白名單。
- Person resolver 使用 mock TMDB 回應測試中文譯名、別名、同名人物、
  department match、無結果與上游錯誤。
- Keyword resolver 測試英文完全同名優先、連字號正規化、近似結果、
  中文 lookup 無結果、explicit unresolved 與 inferred unresolved。
- Movie actor 測試確認「我喜歡布萊德彼特」解析 person ID 後建立 cast 條件，
  且結果只包含他的 cast credits。
- Movie director 測試以宮崎駿 fixture 驗證只保留 `job=Director`；
  《復仇者聯盟：奧創紀元》、《玩具總動員3》與其他 Thanks credits 必須排除。
- Movie crew 測試確認 writer 與 producer 只接受對應 department/job，不把其他
  crew credit 當成符合。
- TV person 測試確認使用 TV Credits ID set 與 TV Discover 取交集，不建立
  Movie Discover 的 person filters。
- 多人物 OR 測試任一人物符合即可；AND 測試必須同時符合所有已解析人物。
- 人物加 keyword 測試兩者同時套用；任一 explicit anchor unresolved 時不得
  回傳假裝完全符合的熱門內容。
- Candidate discovery 測試 Movie／TV endpoint 分流、兩套 genre 白名單、
  Movie 票數 100、TV 票數 30、熱門與高評分並行、去重與最多十筆。
- TV normalization 測試 `name`、`original_name`、`first_air_date` 被保留，
  Movie normalization 測試 `title`、`original_title`、`release_date` 被保留。
- MediaItem 去重測試相同數字 ID 的 movie 與 tv 不互相覆蓋。
- Fallback 測試只移除 inferred genre/keyword，並保留 media type、person、
  explicit keyword、hard constraints 與 adult 排除。
- Empty-state 測試人物無法解析、explicit keyword 無法解析、全部明確條件
  零交集，以及 fallback 後仍為零筆。
- General exploration 測試完全沒有可用條件時仍能回傳熱門／高評分內容，
  且方向摘要不得聲稱套用了人物或主題。
- 歷史測試確認保存 media type、解析後人物、條件來源與 MediaItem snapshots，
  且不包含原始輸入、prompt 或 provider 原始回應。
- History UI 測試 movie／tv 詳情路由、不同標題日期欄位，以及相同數字 ID
  不衝突。
- AI Picker UI 測試媒體型別標籤、送出的 request body、重設行為、loading、
  empty state、少於十筆與 TV 卡片。
- i18n 測試所有新增的標籤、mismatch、unresolved person/keyword 與 empty
  state 在繁體中文與英文都有文案。
- 固定驗收案例至少包含：
  1. 電影：「我喜歡布萊德彼特」只能回傳布萊德彼特 cast 電影。
  2. 電影：「我要看宮崎駿電影」只能回傳宮崎駿 Director credits。
  3. 電影：「布萊德彼特的復仇片」同時套用 person 與 `revenge` keyword。
  4. 電影：「布萊德彼特或李奧納多都可以」採 OR。
  5. 電影：「布萊德彼特和李奧納多共同演出」採 AND。
  6. 電影：「想看復仇題材」使用英文 lookup 並保留繁中顯示標籤。
  7. 電影：「想看不存在主題」不得退化成無關熱門片。
  8. 劇集：「我想看點題材輕鬆的日劇」只回傳日本真人 TV，不含動畫。
  9. 劇集：「我想看日本動畫」必須允許 Animation。
  10. 劇集人物條件必須使用 TV Credits，不得呼叫 movie-only person filter。
  11. 無人物、無 keyword、只有 hard constraints 時保留所有限制。
  12. 無任何條件時回傳一般探索片單並誠實標示方向。
- 「輕鬆日劇」live smoke test 需確認電影票數門檻 100 不會被沿用。受控驗證
  基準可先使用 TV 票數 30；若真實資料變動，驗收重點是媒體、國家、語言、
  排除動畫與 explicit preference，而不是鎖死片名順序。
- 部署前執行完整 unit tests、lint、build、Edge Function bundle、
  `git diff --check`，再以登入帳號各 smoke test 一次電影人物與劇集案例。
- Live smoke test 必須檢查 Supabase Function log、HTTP status、回應 media type、
  推薦快照、歷史背景寫入與實際 UI 詳情連結；部署成功不等於驗證成功。

## Out of Scope

- 不支援以參考電影尋找相似片；`/search/movie` 不作為人物或 keyword fallback。
- 不支援單次請求混合電影與劇集；使用者一次只能選擇一個 media type。
- 不新增人物選擇器或同名人物追問 UI；無法可靠解析時回傳可修正狀態。
- 不支援製片公司、串流平台、供應地區、認證分級或付費方案篩選。
- 不建立自訂人物資料庫、keyword 翻譯資料庫或搜尋索引。
- 不讓模型直接輸出 TMDB person、keyword、movie 或 TV ID。
- 不新增第二次 AI 重排、逐片 AI 評分、embedding、RAG 或 reranker。
- 不為每個候選逐一取得完整詳情；人物 credits 與 Discover 交集應提供第一版
  所需資料，只有未來出現無法滿足的明確條件時再評估詳情查詢。
- 不自動降低 explicit 條件或在背景切換到另一個模型。
- 不改變一般瀏覽、一般搜尋、隨機挑片、收藏、帳號或未完成 Firebase 服務。
- 不在本 PRD 中執行 migration、部署 Edge Function、建立 issue 或提交程式碼。

## Further Notes

- 本 PRD 是既有 Context-Aware AI Movie Picker 的增量規格。既有 PRD 把人物與
  劇集排除在範圍外；本文件只覆寫相關 out-of-scope 決策，不重做既有登入、
  loading、deadline、歷史背景保存與基本推薦 UI。
- 2026-08-01 已確認採單一 active media type：選擇電影只走 Movie Discover，
  選擇劇集只走 TV Discover；不保留舊設計的雙選 3+3。
- 目前 production 路徑為 Supabase Edge Function 直接呼叫 OpenAI
  `gpt-4o-mini`，再呼叫 TMDB；人物判斷加入同一次 tool call，因此 AI 成本
  只增加少量 schema 與輸出 token。
- 2026-07-28 的實際紀錄顯示「我喜歡布萊德彼特」被存成
  `keyword_names=["布萊德彼特"]`，人物條件消失後回傳一般熱門片。
- 2026-07-28 至 2026-07-29 的受控 TMDB 驗證結果：
  - `布萊德彼特` 可由 Person Search 解析為 person ID 287。
  - `宮崎駿` 可解析為 person ID 608，主要部門為 Directing。
  - `with_crew=608` 會包含宮崎駿 credit 為 Thanks 的電影，證明 crew filter
    不能取代 exact job 驗證。
  - 中文 keyword `療癒`、`復仇`、`太空旅行` 回傳零筆；英文 `healing`、
    `revenge`、`space travel` 可取得結果。
  - 日本、日語、真人、Comedy、slice-of-life TV 查詢使用
    `vote_count.gte=100` 時為零筆，30 時為四筆，10 時為十二筆。
- Movie Discover 支援 `with_cast`、`with_crew`、`with_people` 與
  `with_keywords`；TV Discover 支援 genre、keyword、origin country、
  original language、runtime、票數等條件，但沒有相同的人物 filters。
- TMDB 使用逗號表示 AND、pipe 表示 OR。這個語意只在使用者明確表達人物或
  keyword 關係時採用，不讓模型為了增加候選量自行改變。
- 本地 worktree 在建立本 PRD 前已有未提交修改。本文件必須保持為獨立新增
  檔案，不覆寫或整理其他既有變更。
