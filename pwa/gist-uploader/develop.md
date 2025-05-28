# 開発者向けドキュメント - Gist Uploader

このドキュメントは、Gist Uploader アプリケーションの開発者向けの情報を提供します。

## 必要な設定

このアプリケーションをローカル環境やご自身のサーバーで動作させるためには、事前にGitHub OAuth Appの登録と設定が必要です。

### 1. GitHub OAuth App の登録

1.  GitHubにログインし、[Developer settings](https://github.com/settings/developers) にアクセスします。
2.  「OAuth Apps」セクションで、「New OAuth App」ボタンをクリックします。
3.  以下の情報を入力してアプリケーションを登録します。
    *   **Application name**: 任意のアプリケーション名（例: `My Gist Uploader`）
    *   **Homepage URL**: アプリケーションをホストするURL（例: `http://localhost:8080` や `https://your-username.github.io/your-repo/`）
    *   **Application description**: (任意) アプリケーションの説明
    *   **Authorization callback URL**: **非常に重要です。** アプリケーションの `index.html` が存在するURLを指定します。
        *   例1 (ローカル開発時): `http://localhost:8080/` または `http://localhost:8080/index.html`
        *   例2 (GitHub Pagesデプロイ時): `https://your-username.github.io/your-repo/` (リポジトリ名が `your-repo` の場合)
        *   GitHub Pages のルート (`https://your-username.github.io/`) にデプロイする場合はそのURL。
    *   **Enable Device Flow**: このアプリケーションでは使用しないため、チェックは不要です。

4.  登録後、生成された **Client ID** を控えておきます。Client Secret はこのアプリケーションでは使用しません。

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

## 認証フローについて (Implicit Grant Flow)

このアプリケーションでは、GitHub OAuth の **Implicit Grant Flow** を使用しています。

**選択理由**:
-   **クライアントサイド完結**: GitHub Pagesのような静的ホスティング環境では、サーバーサイドのコードを実行できず、OAuth App の `Client Secret` を安全に保持できません。Implicit Grant Flow は `Client Secret` を必要とせず、アクセストークンが直接ブラウザに返されるため、クライアントサイドのJavaScriptのみで認証を完結できます。
-   **CORS制約の回避**: PKCE (Proof Key for Code Exchange) を利用した Authorization Code Flow は、アクセストークン取得時にトークンエンドポイントへのPOSTリクエストが必要ですが、GitHubのトークンエンドポイント (`https://github.com/login/oauth/access_token`) は、ブラウザからの直接の `fetch` リクエストに対してCORSポリシーによりブロックされる場合があります。Implicit Grant Flowではこのエンドポイント呼び出しが不要です。

**セキュリティ上の注意点**:
-   Implicit Grant Flow は、アクセストークンがURLのフラグメント（例: `http://example.com/callback#access_token=XXXX&...`）に含まれてクライアントに渡されます。これにより、アクセストークンがブラウザの履歴に残ったり、リファラヘッダーを通じて外部に漏洩するリスクがあります。
-   このため、OAuth 2.0 のベストプラクティスでは、Authorization Code Flow と PKCE の組み合わせが推奨されています。
-   本アプリケーションでは、静的サイトでの手軽な実現を優先し、アクセストークンを永続化せずセッション中のみ利用することでリスクを低減しようとしていますが、このトレードオフを理解した上で使用してください。

**代替案**:
よりセキュアな認証をクライアントサイドのみのアプリケーションで実現したい場合、以下のような中間サーバー/プロキシを導入し、Authorization Code Flow + PKCE を利用することを検討できます。
-   Netlify Functions / Vercel Serverless Functions / Cloudflare Workers などのサーバーレス関数を利用して、トークンエンドポイントへのリクエストを中継し `Client Secret` を安全に管理する。

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

## ファイル構成

-   `index.html`: メインHTMLファイル。
-   `README.md`: ユーザー向け説明書。
-   `develop.md`: 開発者向け説明書（このファイル）。
-   `src/`
    -   `app.js`: Preactアプリケーションのメインコンポーネント。UIとロジック。
    -   `auth.js`: GitHub OAuth (Implicit Grant Flow) 関連の処理。
    -   `gist.js`: Gist API 関連の処理。
    -   `config.js`: GitHub Client ID などの設定ファイル。**このファイルはGit管理に含めず、各自で設定することを推奨します (例: `.gitignore` に `src/config.js` を追加)。** ただし、このサンプルでは簡単のため含めています。
    -   `utils.js`: 汎用ユーティリティ関数。