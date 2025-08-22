# 開発者向けドキュメント - Gist Uploader (GitHub App - PKCE)

このドキュメントは、Gist Uploader アプリケーションの開発者向けの情報を提供します。
このアプリケーションは、**GitHub App** として登録し、ユーザー認証にはPKCEを用いたUser-to-Serverトークン取得フローを利用します。

## 必要な設定

このアプリケーションをローカル環境やご自身のサーバーで動作させるためには、事前にGitHub Appの登録と設定が必要です。

### 1. GitHub App の登録

1.  GitHubにログインし、所属するOrganizationのSettingsページ、または個人のSettingsページ ([Developer settings](https://github.com/settings/developers)) にアクセスします。
2.  「GitHub Apps」セクションで、「New GitHub App」ボタンをクリックします。
3.  以下の情報を入力してアプリケーションを登録します。

    *   **GitHub App name**: 任意のアプリケーション名（例: `My Gist Uploader App`）
    *   **Homepage URL**: アプリケーションをホストするURL（例: `http://localhost:8080` や `https://your-username.github.io/your-repo/`）
    *   **User authorization callback URL**: **非常に重要です。** ユーザー認証後にリダイレクトされるURLです。アプリケーションの `index.html` が存在するURLを指定します。
        *   例1 (ローカル開発時): `http://localhost:8080/` または `http://localhost:8080/index.html`
        *   例2 (GitHub Pagesデプロイ時): `https://your-username.github.io/your-repo/`
    *   **Webhook**:
        *   **Active**: チェックを外します (このアプリケーションではWebhookは使用しません)。
    *   **Permissions**:
        *   **Repository permissions**: 不要なものは `No access` に設定します。
        *   **Organization permissions**: 不要なものは `No access` に設定します。
        *   **User permissions**: ここでGistを操作するための権限を設定します。
            *   **Gists**: `Read and write` を選択します。 (APIスコープとしては `gist` に相当します)
    *   **Subscribe to events**: Webhookを無効にしたので、イベントの選択は不要です。
    *   **Where can this GitHub App be installed?**:
        *   `Only on this account` または `Any account` を選択します。このアプリはユーザーのGistを操作するため、インストールというよりはユーザーごとの認証がメインです。`Any account` の方が汎用的かもしれません。

4.  登録後、GitHub AppのGeneral設定ページで以下の情報を控えておきます。
    *   **Client ID**: このIDを `src/config.js` に設定します。
    *   **Client secrets**: 「Generate a new client secret」ボタンで生成できますが、PKCEフローではクライアントサイドでは**使用しません**。プロキシサーバーを介してトークンリクエストを行う場合でも、PKCEを利用していれば通常は不要です。(詳細は後述の「トークン取得時の注意」を参照)

### 2. `src/config.js` の設定

プロジェクトの `src/config.js` ファイルを開き、控えておいたGitHub Appの **Client ID** と、Appに登録した **User authorization callback URL** を設定します。

```javascript
// src/config.js
// あなたのGitHub AppのClient ID
export const GITHUB_CLIENT_ID = 'YOUR_GITHUB_APP_CLIENT_ID'; // ここにClient IDを記入

// あなたのGitHub Appに登録したUser authorization callback URL
export const REDIRECT_URI = 'YOUR_USER_AUTHORIZATION_CALLBACK_URL'; // ここにCallback URLを記入
```

例:
```javascript
export const GITHUB_CLIENT_ID = 'iv1.xxxxxxxxxxxxxxxx'; // GitHub AppのClient IDは通常 `iv1.` で始まります
export const REDIRECT_URI = 'http://localhost:8080/';
```

## 認証フローについて (GitHub App User-to-Server Token with PKCE)

このアプリケーションでは、GitHub AppのUser-to-Serverアクセストークンを、PKCE (Proof Key for Code Exchange) を用いたOAuth 2.0 Authorization Code Flow で取得します。
PKCEは、OAuth 2.0 のよりセキュアな認証フローであり、特に `Client Secret` を安全に保持できないクライアント（SPAなど）に適しています。

### トークン取得時の注意 (CORS とプロキシの必要性)

PKCEフローでは、認証コード (`code`) を取得した後、その `code` と `code_verifier` を使ってGitHubのトークンエンドポイント (`https://github.com/login/oauth/access_token`) にPOSTリクエストを送信し、アクセストークンを取得します。

**重要:** ブラウザからこのトークンエンドポイントへ直接 `fetch` API などでPOSTリクエストを送信しようとすると、**CORS (Cross-Origin Resource Sharing) ポリシーによりリクエストがブロックされる可能性が非常に高いです。**

**このサンプルコード (`src/auth.js`) は、概念実証としてトークンエンドポイントへの直接リクエストを試みますが、実際の運用環境ではCORSエラーにより失敗します。**

**必要な対応:**
この問題を解決し、アクセストークンを安全に取得するためには、**ご自身でCORSを回避するためのプロキシサーバーを別途用意する必要があります。**
このプロキシサーバーは、クライアント（ブラウザ）からのリクエストを受け取り、GitHubのトークンエンドポイントに必要なパラメータ（`client_id`, `code`, `code_verifier`, `redirect_uri`, `grant_type`）を付加してサーバーサイドからリクエストを送信し、取得したアクセストークンをクライアントに返す役割を担います。

**`Client Secret` について:**
PKCEを利用する場合、クライアント（ブラウザ）は `Client Secret` を送信しません。これはPKCEの主要な利点の一つです。
GitHub AppのUser-to-Serverトークン取得に関するドキュメントには、アクセストークンリクエスト時に`client_secret`が必要と記載されている場合がありますが、これはPKCEを使用しない場合の記述である可能性が高いです。標準的なPKCEの実装では、公開クライアントは`client_secret`を使用しません。
もし、ご自身で用意するプロキシサーバーでGitHubのAPI仕様上どうしても`client_secret`が必要な場合は、そのプロキシサーバー内で安全に`client_secret`を管理し、リクエストに含めるようにしてください。しかし、基本的にはPKCEを用いることでこの必要性は回避されるべきです。

プロキシサーバーの実装例:
-   Netlify Functions, Vercel Serverless Functions, Cloudflare Workers 等のサーバーレス関数
-   その他、任意のサーバーサイド言語で構築した軽量なAPIエンドポイント

プロキシサーバーを設置後、`src/auth.js` 内の `fetchToken` 関数の `tokenUrl` を、GitHubの直接のエンドポイントではなく、ご自身で用意したプロキシサーバーのエンドポイントURLに書き換える必要があります。

## 技術スタック

-   **UI**: [Pico.css v2](https://picocss.com/)
-   **JavaScript**: [Preact](https://preactjs.com/), [htm](https://github.com/developit/htm)
-   **モジュール**: ES Modules (ESM)
-   **ビルド**: 不要 (ESMとimportmapにより、ブラウザで直接動作)

## ローカルでの開発・実行

1.  上記の「必要な設定」を完了してください。
2.  ローカルサーバーを起動して `index.html` にアクセスします (例: `python -m http.server 8080`)。
3.  ブラウザで `http://localhost:8080` を開きます。
4.  **注意:** 上記の通り、ローカルで試す場合でも、トークン取得部分はCORSエラーになるため、プロキシを別途用意しない限りログインは完了しません。

## ファイル構成 (変更なし)
(前回のPKCE版OAuth Appからファイル構成自体は変更ありません)