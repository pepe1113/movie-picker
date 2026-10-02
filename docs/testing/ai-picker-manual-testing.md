# AI Picker 本機手動測試指南

給開發者在完成 AI Picker 相關功能後，本機啟動專案、操作畫面並快速確認成果。這不是完整 QA 驗收規格。

## 最快方式：前端連既有 Supabase

適合只調整 UI、文案或前端互動時使用。

確認 `.env.local` 有以下設定：

```dotenv
VITE_TMDB_ACCESS_TOKEN=你的_TMDB_TOKEN
VITE_SUPABASE_URL=你的_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=你的_PUBLIC_ANON_KEY
```

啟動前端：

```bash
bun run dev
```

打開終端顯示的網址，依序確認：

1. 未登入也能看到並使用 AI Picker。
2. 四個模板只顯示 emoji 與短名稱，點擊後會把完整需求帶入文字框，但不會自動送出。
3. 送出後會看到載入文字、Nyan Cat 原圖與進度；完成後出現推薦結果。
4. 切換「電影／影集」後，結果的媒體類型正確。
5. 未登入不保存歷史；登入後重新推薦，歷史頁會出現紀錄。
6. 將瀏覽器縮到約 390px，確認模板、文字框與按鈕沒有溢出。

若只改 UI，完成以上項目通常就足夠。

## 完整方式：前端連本機 Supabase

只有修改 Edge Function、migration 或匿名額度時才需要。需要 Supabase CLI 與 Docker 相容的 container runtime，並會呼叫真實 OpenAI／TMDB API。登入、歷史與 RLS 仍以自動化測試及已配置 OAuth 的開發環境確認，不包含在這份 quick guide。

### 1. 準備 Function secrets

建立不會進 Git 的 `supabase/functions/.env`：

```dotenv
OPENAI_API_KEY=你的_OPENAI_KEY
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-6-luna
TMDB_ACCESS_TOKEN=你的_TMDB_TOKEN
OMDB_API_KEY=選填
ANONYMOUS_RECOMMENDATIONS_ENABLED=true
ANONYMOUS_DAILY_LIMIT=50
```

`OPENAI_API_KEY` 與 service role key 不得加上 `VITE_` 前綴。

### 2. 啟動後端

第一個終端：

```bash
supabase start
supabase status
```

如果需要即時查看 Function log 或讓 Function 重新載入程式碼，再開第二個終端：

```bash
supabase functions serve --env-file supabase/functions/.env
```

### 3. 讓前端連到本機

把 `.env.local` 改為 `supabase status` 顯示的本機 URL 與 anon key：

```dotenv
VITE_TMDB_ACCESS_TOKEN=你的_TMDB_TOKEN
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=本機_anon_key
```

第三個終端：

```bash
bun run dev
```

現在從畫面送出推薦，流程會是：

```text
React UI → 本機 recommend-movies Function → OpenAI／TMDB → 本機 Postgres
```

開著 Function 終端與瀏覽器 Network，確認請求只有一次、成功回傳推薦，而且終端沒有未處理錯誤。

### 4. 手動確認本機後端成果

- 未登入送出：可以取得推薦，但不會建立個人歷史。
- 切換電影／影集：Function 收到的 `media_type` 與畫面選擇一致。
- 修改匿名額度或 Function env 後：重新啟動 Function，再從畫面操作確認結果。
- 修改 migration 後：執行 `supabase db reset` 重新套用本機 migration，再重測相關流程。這會清除本機資料，不能對 production 使用。

完成後停止本機服務：

```bash
supabase stop
```

## 真實 AI 結果與成本

需要單獨查看 query plan、推薦片名、token、估算成本與執行時間時，不必啟動前端或 Supabase：

先在專案根目錄的 `.env.local` 加入：

```dotenv
OPENAI_API_KEY=你的_OPENAI_KEY
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-6-luna
TMDB_ACCESS_TOKEN=你的_TMDB_TOKEN
```

```bash
bun run test:ai-live
```

指定想測試的模板文字：

```bash
AI_LIVE_REQUEST='想看科幻或懸疑作品，節奏緊湊、評價不錯，但不要恐怖或太壓抑。' \
  bun run test:ai-live -- gpt-6-luna
```

比較模型：

```bash
bun run test:ai-live -- gpt-4o-mini gpt-6-luna
```

這個指令會真的呼叫 OpenAI／TMDB並消耗額度，但不測登入、歷史或 RLS。片名可能隨模型與 TMDB 資料改變，主要確認 query plan 有遵守輸入條件，推薦方向合理即可。成本是腳本估算，不代表最終帳單。

## 開發完成後的基本檢查

手動看完畫面後，再執行：

```bash
bun run format
bun run lint
bun run test:run
bun run build
```
