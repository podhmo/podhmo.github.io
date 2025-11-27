# Hono GitHub OAuth Login (Deno)

GitHubアカウントを使用してログインし、プロフィールを表示するシンプルなアプリケーションです。
UIフレームワークに **Pico CSS v2** を採用し、**Hono JSX** でレンダリングしています。

## 必要要件

- Deno 1.40以上

## セットアップ

1. **GitHub OAuth App の作成**
   - GitHub Developer Settings から OAuth App を作成します。
   - **Authorization callback URL** に `http://localhost:8000/auth/callback` を設定します。

2. **環境変数の設定**
   プロジェクトルートに `.env` ファイルを作成し、以下の情報を記述します。

   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   BASE_URL=http://localhost:8000
   ```

## 実行方法

以下のコマンドで開発サーバーを起動します。

```bash
deno task dev
```

ブラウザで `http://localhost:8000` にアクセスしてください。

## 構成について

- **deno.json**: 依存関係管理（JSR使用）とタスクランナー設定。
- **main.tsx**: アプリケーションロジックのすべて（ルーティング、JSXコンポーネント、OAuth処理）。
- **Pico CSS**: CDN経由で読み込み、クラスレスに近い形でモバイルファーストなUIを実現。

## 注意点

- 本実装では簡易化のため、ユーザー情報をJSON化して直接Cookie (`user_session`) に保存しています。本番環境では暗号化するか、Deno KVなどを用いたセッションストアの実装を推奨します。