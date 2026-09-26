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
- 📝 **Description編集**: Gist Descriptionをアップロード時に指定可能
- ✏️ **ファイル名編集**: アップロード前にファイル名を変更可能
- 🔁 **ファイル上書き**: 更新時に同じファイル名を指定して既存ファイルを上書き可能
- 🔗 **URL自動コピー**: 作成されたGist URLをワンクリックでコピー
- 💻 **プレビュー機能**: テキストファイルの内容を事前確認
- 🔒 **可視性制御**: Public/Secret（非公開）の選択可能

## 技術スタック

- **ランタイム**: Cloudflare Workers (workerd)
- **フレームワーク**: Hono + JSX
- **UI**: Pico CSS v2（モバイルファースト）
- **デプロイ**: Cloudflare Workers（世界中のエッジで配信）

## 必要要件

- Node.js 22.12以上（24 推奨。wrangler 4 / vitest 5 の要件）

## セットアップ

1. **GitHub OAuth App の作成**
   - GitHub Developer Settings から OAuth App を作成します。
   - **Authorization callback URL** に `http://localhost:8787/auth/callback` を設定します。

2. **環境変数の設定**
   プロジェクトルートに `.dev.vars` ファイルを作成し、以下の情報を記述します。

   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   SESSION_SECRET=session_cookie_encryption_key  # user_session Cookie の暗号化鍵（ランダムな長い文字列）
   # BASE_URL は省略時はリクエストの origin が使われる
   # （wrangler dev なら http://localhost:8787）
   ```

   **必要なGitHub OAuth scopes**: `read:user,gist`

3. **依存関係のインストール**

   ```bash
   npm install
   ```

## 実行方法

### ローカル開発

以下のコマンドで開発サーバー（wrangler dev / workerd）を起動します。

```bash
npm run dev
```

ブラウザで `http://localhost:8787` にアクセスしてください。

### テスト・型チェック

```bash
npm test            # vitest
npm run typecheck   # tsc --noEmit
```

### デプロイ

```bash
npm run deploy
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put SESSION_SECRET
```

BASE_URL は未設定ならリクエストの origin が使われるため、workers.dev でもカスタムドメインでもそのまま動きます。GitHub OAuth App の callback URL にデプロイ先の `https://<host>/auth/callback` を登録してください（固定したい場合のみ `wrangler.jsonc` の `vars.BASE_URL` を設定）。

## 使い方

### 新規Gist作成

1. **ログイン**: GitHubアカウントでログイン
2. **Description設定（オプション）**: Gist Descriptionフィールドに説明を入力
   - 空の場合は自動生成されます（例: "Uploaded via Gist Uploader - 2024-01-01T12:00:00.000Z"）
3. **ファイル選択**: 「ファイルを選択」ボタンから複数ファイルを選択
4. **プレビュー**: 選択されたファイルの内容を確認
5. **ファイル名編集（オプション）**: 各ファイルのファイル名を編集可能
   - ファイル名をクリックして変更できます
   - 空の場合は元のファイル名が使用されます
6. **公開設定**: Public（誰でも閲覧可能）またはSecret（URLを知っている人のみ）を選択
7. **Gist作成**: 「Gistを作成」ボタンでアップロード
8. **URL取得**: 作成されたGist URLをコピーして共有

### 既存Gist更新

1. **ログイン**: GitHubアカウントでログイン
2. **Gist URL入力**: 更新したいGistのURLを入力フィールドに入力
   - 例: `https://gist.github.com/username/gist_id`
   - ファイルフラグメント付きURLも対応: `https://gist.github.com/username/gist_id#file-name-md`
3. **Description編集（オプション）**: 必要に応じてGist Descriptionを変更
4. **ファイル選択**: 更新するファイルを選択
5. **ファイル名編集**: 
   - 新しいファイルを追加する場合は、そのままアップロード
   - **既存ファイルを上書きする場合は、ファイル名を既存のファイル名に変更**
   - 例: `new-data.txt` をアップロードして `old-data.txt` に変更すると、Gist内の `old-data.txt` が上書きされます
6. **公開設定**: 必要に応じて公開設定を変更
7. **Gist更新**: ボタンが「Gistを更新」に変わるのでクリック
8. **URL取得**: 更新されたGist URLを確認

## 対応ファイル形式

- **テキストファイル**: `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.md`, `.txt`, `.json`, `.html`, `.css` など
- **バイナリファイル**: 画像や実行ファイルなども対応
- **複数ファイル**: 一度に複数のファイルを選択可能

## 開発状況

プロジェクトの進行状況と今後のタスクについては [TODO.md](./TODO.md)
を参照してください。

## 構成について

- **wrangler.jsonc**: Workers の設定（エントリーポイント、vars）。
- **src/index.tsx**:
  アプリケーションロジックのすべて（ルーティング、JSXコンポーネント、OAuth処理）。
- **src/session.ts**: `user_session` Cookie の AES-GCM 暗号化/復号。
- **test/**: vitest によるロジックテスト。
- **Pico CSS**:
  CDN経由で読み込み、クラスレスに近い形でモバイルファーストなUIを実現。

## 注意点

- ユーザー情報（アクセストークン含む）は `SESSION_SECRET` で AES-GCM 暗号化して Cookie (`user_session`)
  に保存しています。さらに堅くするなら Workers KV などサーバー側セッションストアへの移行も検討してください。
- `SESSION_SECRET` を変更すると既存のログインセッションはすべて無効になります。
- オリジン（`BASE_URL`、未設定ならリクエストURL）が `https:` のときのみ Cookie に `Secure` 属性が付きます。http の localhost では動作確認のため付けていません。
