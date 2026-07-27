# Movie Picker

> React、TMDB、Supabase、AI モデルで構築したポートフォリオ向け映画検索・推薦アプリです。

[繁體中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

**今すぐ使う：** [https://movie-picker.peiwang.dev/](https://movie-picker.peiwang.dev/)

## 機能

- 上映中、週間トレンド、人気、高評価の映画を閲覧
- 映画検索と詳細、キャスト、予告編、OMDb 評価の表示
- 人気作品またはジャンル／評価／公開年の絞り込み結果から3作品をランダム選出
- ログイン後、状況・得たい気分・制約を自然文で入力し、AI モデルが最大5作品を選定
- 未ログイン時はお気に入りをローカル保存し、GitHub ログイン後にクラウドへ統合・同期
- 最新20件の AI 推薦履歴を表示・削除
- 英語／繁体字中国語 UI とライト／ダークテーマ

## Tech Stack

React 19、TypeScript、Vite、Tailwind CSS 4、React Router、TanStack Query、Zustand、Supabase、TMDB、OMDb、AI モデル。

## データの保存方法

| データ       | 保存先                                                                | 用途                                            |
| ------------ | --------------------------------------------------------------------- | ----------------------------------------------- |
| お気に入り   | 未ログイン時はブラウザの `localStorage`、ログイン後は Supabase と同期 | 見たい映画をデバイス間で保持                    |
| AI 推薦履歴  | Supabase                                                              | 選択条件、推薦結果、作成日時を保存              |
| ユーザー情報 | Supabase Auth                                                         | GitHub ログインとユーザーごとのデータ分離に使用 |

クラウドデータは Row Level Security で保護され、ログインユーザーは自分のお気に入りと推薦履歴だけにアクセスできます。

## アーキテクチャ

```text
React ページ／コンポーネント
├─ TanStack Query hooks → TMDB / OMDb
├─ Zustand stores → UI 状態 + ローカルお気に入りキャッシュ
└─ Supabase client → GitHub Auth + Postgres (RLS)
                       └─ recommend-movies Edge Function → AI モデル + TMDB
```

- `src/pages` はルート画面、`src/components` は共通 UI と機能表示を担当します。
- `src/hooks` はサーバー状態を調整し、`src/services` は外部 API を分離します。
- `src/stores` はクライアント状態、`supabase/migrations` と `supabase/functions` はバックエンドを管理します。
- AI 選定はログインユーザー限定です。モデルによる並べ替えが失敗した場合は、Edge Function が取得済みの TMDB 候補を安定した順序で返します。

## セキュリティ

- AI プロバイダーキーとサーバー側の映画データ token は Supabase Secrets に保存され、フロントエンドには渡されません。
- `.env*` は `.env.example` を除いて Git 管理外で、プロバイダー Secret の値はリポジトリに含まれません。
- Edge Function は Bearer Token を必須とし、`supabase.auth.getUser()` でユーザーを検証してから AI モデル呼び出しと履歴保存を行います。
- 両テーブルは Row Level Security により `auth.uid() = user_id` の所有行だけを許可し、ブラウザでは公開 anon key のみを使用します。
- AI endpoint は `POST` のみを受け付け、入力長を制限し、10秒の deadline で未完了の上流リクエストを中止します。

## チェック

```bash
bun run test:run
bun run lint
bun run build
```

映画データ：[TMDB](https://www.themoviedb.org/) · 評価データ：[OMDb](https://www.omdbapi.com/)
