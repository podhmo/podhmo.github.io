# Gist File Uploader

**スマホのクリップボード制限を回避してGistにファイルアップロードするWebアプリケーション**

GitHubアカウントでログインし、複数ファイルを選択してGistに直接アップロードできます。
モバイルファースト設計で、スマートフォンからも快適に利用できます。

## 主な機能

- 🔐 **GitHub OAuth認証**: GitHubアカウントでログイン
- 📁 **複数ファイル対応**: 一度に複数のファイルをアップロード
- 📱 **モバイルファースト**: スマートフォン最適化UI
- ⚡ **即座にGist作成**: 選択したファイルから自動でGist生成
- 🔄 **既存Gist更新**: Gist URLを指定して既存Gistを更新可能
- 🔗 **URL自動コピー**: 作成されたGist URLをワンクリックでコピー
- 💻 **プレビュー機能**: テキストファイルの内容を事前確認
- 🔒 **可視性制御**: Public/Secret（非公開）の選択可能

## 技術スタック

- **ランタイム**: Deno
- **フレームワーク**: Hono + JSX
- **UI**: Pico CSS v2（モバイルファースト）
- **デプロイ**: Deno Deploy（世界中のエッジで配信）

## 必要要件

- Deno 1.40以上

## セットアップ

1. **GitHub OAuth App の作成**
   - GitHub Developer Settings から OAuth App を作成します。
   - **Authorization callback URL** に `http://localhost:3333/auth/callback` を設定します。

2. **環境変数の設定**
   プロジェクトルートに `.env` ファイルを作成し、以下の情報を記述します。

   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   BASE_URL=http://localhost:3333
   ```

   **必要なGitHub OAuth scopes**: `read:user,gist`

## 実行方法

### ローカル開発

以下のコマンドで開発サーバーを起動します。

```bash
deno task dev
```

ブラウザで `http://localhost:3333` にアクセスしてください。

## 使い方

### 新規Gist作成

1. **ログイン**: GitHubアカウントでログイン
2. **ファイル選択**: 「ファイルを選択」ボタンから複数ファイルを選択
3. **プレビュー**: 選択されたファイルの内容を確認
4. **公開設定**: Public（誰でも閲覧可能）またはSecret（URLを知っている人のみ）を選択
5. **Gist作成**: 「Gistを作成」ボタンでアップロード
6. **URL取得**: 作成されたGist URLをコピーして共有

### 既存Gist更新

1. **ログイン**: GitHubアカウントでログイン
2. **Gist URL入力**: 更新したいGistのURLを入力フィールドに入力
   - 例: `https://gist.github.com/username/gist_id`
   - ファイルフラグメント付きURLも対応: `https://gist.github.com/username/gist_id#file-name-md`
3. **ファイル選択**: 更新するファイルを選択
4. **公開設定**: 必要に応じて公開設定を変更
5. **Gist更新**: ボタンが「Gistを更新」に変わるのでクリック
6. **URL取得**: 更新されたGist URLを確認

## 対応ファイル形式

- **テキストファイル**: `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.md`, `.txt`, `.json`, `.html`, `.css` など
- **バイナリファイル**: 画像や実行ファイルなども対応
- **複数ファイル**: 一度に複数のファイルを選択可能

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
