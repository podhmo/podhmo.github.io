# Hono GitHub OAuth Login (Deno)

GitHubアカウントを使用してログインし、プロフィールを表示するシンプルなアプリケーションです。
UIフレームワークに **Pico CSS v2** を採用し、**Hono JSX**
でレンダリングしています。

## 必要要件

- Deno 1.40以上

## セットアップ

1. **GitHub OAuth App の作成**
   - GitHub Developer Settings から OAuth App を作成します。
   - **Authorization callback URL** に `http://localhost:8000/auth/callback`
     を設定します。

2. **環境変数の設定** プロジェクトルートに `.env`
   ファイルを作成し、以下の情報を記述します。

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

ブラウザで `http://localhost:3333` にアクセスしてください。

## 開発状況

プロジェクトの進行状況と今後のタスクについては [TODO.md](./TODO.md)
を参照してください。

## 開発ガイドライン

### 依存関係管理ルール

**重要**: 以下の優先順位に従って依存関係を管理してください：

1. **JSR標準ライブラリを優先**: `jsr:@std/*` からのimportを最優先
2. **JSRレジストリを活用**: 可能な限り `jsr:@namespace/package` を使用
3. **npm fallback**: JSRで見つからない場合のみ `npm:package-name` を使用
4. **禁止事項**: `https://deno.land/x/` からの直接importは**絶対に禁止**

### プロジェクト構成ルール

- **複数ファイルプロジェクト**: `deno.json` で依存関係を管理（現在の構成）
- **単一ファイルプロジェクト**: `deno.json`
  を作らず、import時に直接バージョン指定

```typescript
// ✅ 推奨: JSR標準ライブラリ
import { load } from "jsr:@std/dotenv@^0.220.0";

// ✅ 推奨: JSRパッケージ
import { Hono } from "jsr:@hono/hono@^4.1.0";

// ⚠️ 許可: JSRで見つからない場合のみ
import { somePackage } from "npm:package-name@^1.0.0";

// ❌ 禁止: deno.land/x からの直接import
import { someLib } from "https://deno.land/x/somelib@v1.0.0/mod.ts";
```

## 構成について

- **deno.json**: 依存関係管理（JSR使用）とタスクランナー設定。
- **main.tsx**:
  アプリケーションロジックのすべて（ルーティング、JSXコンポーネント、OAuth処理）。
- **Pico CSS**:
  CDN経由で読み込み、クラスレスに近い形でモバイルファーストなUIを実現。

## 注意点

- 本実装では簡易化のため、ユーザー情報をJSON化して直接Cookie (`user_session`)
  に保存しています。本番環境では暗号化するか、Deno
  KVなどを用いたセッションストアの実装を推奨します。
