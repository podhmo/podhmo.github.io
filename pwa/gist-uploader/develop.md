# 開発者向けドキュメント - Gist Uploader (PKCE)

このドキュメントは、Gist Uploader アプリケーションの開発者向けの情報を提供します。

## 必要な設定

このアプリケーションをローカル環境やご自身のサーバーで動作させるためには、事前にGitHub OAuth Appの登録と設定が必要です。

### 1. GitHub OAuth App の登録

1.  GitHubにログインし、[Developer settings](https://github.com/settings/developers) にアクセスします。
2.  「OAuth Apps」セクションで、「New OAuth App」ボタンをクリックします。
3.  以下の情報を入力してアプリケーションを登録します。
    *   **Application name**: 任意のアプリケーション名（例: `My Gist Uploader (PKCE)`）
    *   **Homepage URL**: アプリケーションをホストするURL（例: `http://localhost:8080` や `https://your-username.github.io/your-repo/`）
    *   **Application description**: (任意) アプリケーションの説明
    *   **Authorization callback URL**: **非常に重要です。** アプリケーションの `index.html` が存在するURLを指定します。
        *   例1 (ローカル開発時): `http://localhost:8080/` または `http://localhost:8080/index.html`
        *   例2 (GitHub Pagesデプロイ時): `https://your-username.github.io/your-repo/` (リポジトリ名が `your-repo` の場合)
    *   **Enable Device Flow**: このアプリケーションでは使用しないため、チェックは不要です。

4.  登録後、生成された **Client ID** を控えておきます。Client Secret はPKCEフローではクライアントサイドでは使用しません。

### 2. `src/config.js` の設定

プロジェクトの `src/config.js` ファイルを開き、控えておいた **Client ID** と、OAuth Appに登録した **Authorization callback URL** を設定します。

```javascript
// src/config.js
export const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID'; // ここにClient IDを記入
export const REDIRECT_URI = 'YOUR_AUTHORIZATION_CALLBACK_URL'; // ここにAuthorization callback URLを記入
```

例:
```javascript
export const GITHUB_CLIENT_ID = 'iv1.xxxxxxxxxxxxxxxx';
export const REDIRECT_URI = 'http://localhost:8080/';
```

## 認証フローについて (Authorization Code Flow with PKCE)

このアプリケーションでは、GitHub OAuth の **Authorization Code Flow with PKCE (Proof Key for Code Exchange)** を使用しています。
PKCEは、OAuth 2.0 のよりセキュアな認証フローであり、特にモバイルアプリやシングルページアプリケーション (SPA) のような `Client Secret` を安全に保持できないクライアントに適しています。

### トークン取得時の注意 (CORS とプロキシの必要性)

PKCEフローでは、認証コード (`code`) を取得した後、その `code` と `code_verifier` を使ってGitHubのトークンエンドポイント (`https://github.com/login/oauth/access_token`) にPOSTリクエストを送信し、アクセストークンを取得します。

**重要:** ブラウザからこのトークンエンドポイントへ直接 `fetch` API などでPOSTリクエストを送信しようとすると、**CORS (Cross-Origin Resource Sharing) ポリシーによりリクエストがブロックされる可能性が非常に高いです。** GitHubのトークンエンドポイントは、通常、任意のオリジンからのクロスドメインAJAXリクエストを許可していません。

**このサンプルコード (`src/auth.js`) は、概念実証としてトークンエンドポイントへの直接リクエストを試みますが、実際の運用環境ではCORSエラーにより失敗します。**

**必要な対応:**
この問題を解決し、アクセストークンを安全に取得するためには、**ご自身でCORSを回避するためのプロキシサーバーを別途用意する必要があります。**
このプロキシサーバーは、クライアント（ブラウザ）からのリクエストを受け取り、GitHubのトークンエンドポイントに必要なパラメータ（`client_id`, `code`, `code_verifier`, `redirect_uri`, `grant_type`）を付加してサーバーサイドからリクエストを送信し、取得したアクセストークンをクライアントに返す役割を担います。`Client Secret` が必要な場合は、このプロキシサーバー内で安全に管理できます（ただしPKCEの場合、`Client Secret` は必須ではありません）。

プロキシサーバーの実装例:
-   Netlify Functions
-   Vercel Serverless Functions
-   Cloudflare Workers
-   AWS Lambda + API Gateway
-   Nginx や Apache などのリバースプロキシ設定
-   その他、任意のサーバーサイド言語（Node.js, Python, Ruby, Goなど）で構築した軽量なAPIエンドポイント

プロキシサーバーを設置後、`src/auth.js` 内の `fetchToken` 関数の `tokenUrl` を、GitHubの直接のエンドポイントではなく、ご自身で用意したプロキシサーバーのエンドポイントURLに書き換える必要があります。

## 技術スタック

-   **UI**: [Pico.css v2](https://picocss.com/)
-   **JavaScript**: [Preact](https://preactjs.com/) (UIライブラリ), [htm](https://github.com/developit/htm) (JSX-like syntax in template strings)
-   **モジュール**: ES Modules (ESM)
-   **ビルド**: 不要 (ESMとimportmapにより、ブラウザで直接動作)

## ローカルでの開発・実行

1.  上記の「必要な設定」を完了してください。
2.  ローカルサーバーを起動して `index.html` にアクセスします。
    -   例: Python http.server を使う場合 (プロジェクトのルートディレクトリで実行):
        ```bash
        python -m http.server 8080
        ```
    -   ブラウザで `http://localhost:8080` を開きます。
3.  **注意:** 上記の通り、ローカルで試す場合でも、トークン取得部分はCORSエラーになるため、プロキシを別途用意しない限りログインは完了しません。

## ファイル構成

-   `index.html`: メインHTMLファイル。
-   `README.md`: ユーザー向け説明書。
-   `develop.md`: 開発者向け説明書（このファイル）。
-   `src/`
    -   `app.js`: Preactアプリケーションのメインコンポーネント。UIとロジック。
    -   `auth.js`: GitHub OAuth (PKCE) 関連の処理。**トークン取得部分は要修正。**
    -   `gist.js`: Gist API 関連の処理。
    -   `config.js`: GitHub Client ID などの設定ファイル。
    -   `utils.js`: PKCEヘルパーなどの汎用ユーティリティ関数。