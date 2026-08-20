# 🍿 Movie Picker

[繁體中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

![website-demo](public/homepage-demo.gif)

> 「いつも同じ映画ばっかりて、飽きない？」<br>
> 「まだ知らない、自分に合う作品も観てみてほしいなぁ」

Movie Picker に、あなたに合う作品を提案してもらいましょう。
**今の気分や観たい作品のイメージ**を入力すると、AI が興味に合いそうなジャンル、年代、キーワードを判断し、TMDB の Discover API から映画やドラマを提案します。

フロントエンドは React、データベースとバックエンドは Supabase で構築し、TMDB／OMDb のデータと AI モデルを利用しています。ポートフォリオ用の個人開発プロジェクトです。

### >> 👀 [Movie Picker を試す](https://movie-picker.peiwang.dev/) <<

## Feature

- **最新トレンド**：映画とドラマの最新、週間トレンド、人気、高評価、ジャンル別リストを切り替えて閲覧
- **映画検索**：映画／ドラマを検索し、詳細、キャスト、予告編、シーズン数、総話数を表示
- **AI 映画選び**：ログイン後、自然文で希望と制約を入力すると、AI モデルが検索を計画して最大10作品を選定
- **History**：ログイン後に最新20件の AI 推薦履歴を表示し、一括削除に対応
- **Wishlist**：映画のお気に入りリスト
- **ユーザーログイン**：現在は GitHub のみに対応し、AI 映画選びと推薦履歴の保存が可能
- **ローカライズ**：英語／繁体字中国語とレスポンシブデザインに対応

|   feature    |             screenshot             |
| :----------: | :--------------------------------: |
| movie detail | ![movie-detail](public/detail.png) |
|   History    |   ![history](public/history.png)   |
|   Wishlist   |  ![wishlist](public/wishlist.png)  |

## Tech Stack

| Framework      | 用途                                             |
| -------------- | ------------------------------------------------ |
| React 19       | フロントエンド UI ライブラリ                     |
| TypeScript     | 静的型チェック                                   |
| Vite           | ローカル開発とフロントエンドビルド               |
| Tailwind CSS 4 | CSS スタイリング                                 |
| shadcn/ui      | 再利用可能な UI コンポーネント                   |
| Motion         | UI アニメーションと動きの軽減設定への対応        |
| React Router   | SPA ルーティング                                 |
| TanStack Query | API データの取得、キャッシュ、サーバー状態の同期 |
| Zustand        | 言語、テーマ、ログイン、お気に入り状態の管理     |
| i18next        | ローカライズ                                     |
| Zod            | AI API データと検索計画の検証                    |
| Supabase       | ユーザーデータの保存、GitHub Auth、Edge Function |
| TMDB API       | 映画・ドラマの検索、閲覧、情報表示               |
| OMDb API       | 映画の外部評価の取得                             |
| AI モデル      | 自然言語の要望を TMDB 検索計画に変換             |

## データの保存方法

| データ       | 保存先                                                                | 用途                                            |
| ------------ | --------------------------------------------------------------------- | ----------------------------------------------- |
| お気に入り   | 未ログイン時はブラウザの `localStorage`、ログイン後は Supabase と同期 | 見たい映画とドラマをデバイス間で保持            |
| AI 推薦履歴  | Supabase                                                              | 選択条件、推薦結果、作成日時を保存              |
| ユーザー情報 | Supabase Auth                                                         | GitHub ログインとユーザーごとのデータ分離に使用 |

クラウドデータは Row Level Security で保護され、ログインユーザーは自分のお気に入りと推薦履歴だけにアクセスできます。

## Architecture

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
- AI 選定はログインユーザー限定です。モデルは検索計画だけを作成し、Edge Function が TMDB の人気作品と高評価作品を安定した順序で交互に返します。

## Develop

- ローカル開発では `.env.example` を `.env` にコピーし、AI モデルのキー、TMDB token、Supabase Secrets を設定してください。不足している場合は起動に失敗します。
