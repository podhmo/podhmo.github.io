# ai-studio-download

このウェブアプリケーションは、Google Drive内の特定のフォルダ（デフォルトでは "Google AI Studio"）にあるJSONファイルをリスト表示し、ファイル名を正規化（空白をハイフンに置換）した上でダウンロードする機能を提供します。また、同じファイル内容（JSON）を元に、空のMarkdownファイルとしてダウンロードする機能も備えています（将来的にJSONからMarkdownへの変換機能追加を想定）。

このアプリケーションは、GitHub Pagesのような静的ホスティング環境での動作を想定しており、すべての処理はクライアントサイドのJavaScriptで行われます。

## TypeScript CLI ツール

TypeScript版のCLIツールも提供されており、コマンドラインから対話履歴をダウンロードできます。

### 使い方

**対話形式でダウンロード（デフォルト）:**
```bash
ai-studio-download
```

**URL を指定して直接ダウンロード:**
```bash
ai-studio-download --url https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5
```

**出力先ディレクトリを指定:**
```bash
ai-studio-download -o ./output --url https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5
```

### CLI オプション
- `-u, --url <URL>`: AI Studio の URL を指定して直接ダウンロード
- `-o, --output <パス>`: ダウンロード先のディレクトリを指定
- `--keyFile <パス>`: サービスアカウントキーファイルへのパスを指定
- `-h, --help`: ヘルプメッセージを表示

## 機能

### ウェブアプリケーション

-   Google OAuth 2.0 を使用した安全なログイン
-   **URLから直接ダウンロード** - AI Studio の URL を入力して、対話履歴を直接ダウンロード
-   Google Drive内の "Google AI Studio" フォルダ内のJSONファイルを時系列（降順）で一覧表示
-   ファイル名の空白をハイフン (`-`) に置換する正規化処理
-   正規化されたファイル名でJSONファイルをダウンロード (`<normalized-name>.json`)
-   正規化されたファイル名でMarkdownファイルをダウンロード (`<normalized-name>.md`)
-   Pico.css v2 を使用したシンプルなレスポンシブデザイン
-   JavaScriptはES Modules (ESM) 形式で記述

## 必要なもの・準備

1.  **Googleアカウント**
2.  **Google Cloud Platform (GCP) プロジェクト**
    -   もし既存のプロジェクトがなければ、[GCP Console](https://console.cloud.google.com/) で新しいプロジェクトを作成してください。
3.  **OAuth 2.0 クライアント ID**
    -   GCP Console でプロジェクトを選択します。
    -   ナビゲーションメニューから「APIとサービス」 > 「認証情報」を選択します。
    -   「+ 認証情報を作成」をクリックし、「OAuth クライアント ID」を選択します。
    -   「アプリケーションの種類」で「ウェブアプリケーション」を選択します。
    -   「名前」に任意の名前（例: `Google Drive File Downloader`）を入力します。
    -   「承認済みの JavaScript 生成元」に、このアプリケーションをホストするURLを追加します。
        -   GitHub Pages の場合: `https://YOUR_USERNAME.github.io` (YOUR_USERNAME はご自身のGitHubユーザー名に置き換えてください)
        -   ローカル開発環境の場合: `http://localhost:PORT` (PORT は使用するポート番号、例: `http://localhost:8000`)
    -   「承認済みのリダイレクト URI」は、このアプリケーションの現在の実装では直接使用しませんが、設定が必要な場合があります。JavaScript生成元と同じドメインで何かダミーのパス（例: `https://YOUR_USERNAME.github.io/oauth2callback`）などを設定しておくか、空のまま作成を試みてください。GISライブラリの`initTokenClient`では通常不要です。
    -   「作成」をクリックすると、クライアントIDが表示されます。この値を控えておいてください。
4.  **Google Drive API の有効化**
    -   GCP Console でプロジェクトを選択します。
    -   ナビゲーションメニューから「APIとサービス」 > 「ライブラリ」を選択します。
    -   「Google Drive API」を検索し、選択して「有効にする」をクリックします。

## 設定方法

1.  このリポジトリをクローンまたはダウンロードします。
2.  `script.js` ファイルを開きます。
3.  ファイルの先頭近くにある以下の行を見つけます。
    ```javascript
    const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'; // TODO: 取得したクライアントIDに置き換えてください
    ```
4.  `'YOUR_CLIENT_ID.apps.googleusercontent.com'` の部分を、上記「必要なもの・準備」で取得したご自身の **OAuth 2.0 クライアント ID** に置き換えてください。
5.  （オプション）検索対象のフォルダ名を変更したい場合は、`script.js` 内の `GOOGLE_AI_STUDIO_FOLDER_NAME` の値を変更してください。

## 使い方

1.  設定済みのファイルを、GitHub Pages やその他の静的ホスティングサービスにデプロイします。
    -   GitHub Pages にデプロイする場合:
        1.  このプロジェクトをGitHubリポジトリにプッシュします。
        2.  リポジトリの「Settings」 > 「Pages」に移動します。
        3.  「Branch」で `main` (または適切なブランチ) を選択し、「/ (root)」フォルダを選択して「Save」します。
        4.  公開されたURL（例: `https://YOUR_USERNAME.github.io/REPOSITORY_NAME/`）にアクセスします。
        5.  **注意:** もし `https://YOUR_USERNAME.github.io/REPOSITORY_NAME/` のようにサブディレクトリでホストする場合、GCPの「承認済みの JavaScript 生成元」にも `https://YOUR_USERNAME.github.io` を設定する必要があります（サブディレクトリなしのルートドメイン）。
2.  アプリケーションを開くと、Google APIライブラリのロード後に「Googleアカウントでログイン」ボタンが表示されます。
3.  ボタンをクリックし、Googleアカウントでログインし、要求される権限（Google Driveのファイルの読み取り）を承認します。
4.  ログインに成功すると、2つのダウンロード方法が利用できます：
    - **方法1: URLから直接ダウンロード**
        - AI Studio で対話履歴を開き、ブラウザのアドレスバーから URL をコピーします（例: `https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5`）
        - 「URLから直接ダウンロード」セクションに URL を貼り付けます
        - 「JSON形式でダウンロード」または「MD形式でダウンロード」ボタンをクリックします
    - **方法2: ファイル一覧から選択してダウンロード**
        - "Google AI Studio" フォルダ（または設定したフォルダ）内のJSONファイルが一覧表示されます
        - 各ファイルの横にある「JSON形式でDL」ボタンをクリックすると、正規化されたファイル名でJSONファイルがダウンロードされます
        - 「MD形式でDL」ボタンをクリックすると、正規化されたファイル名でMarkdownファイルがダウンロードされます
5.  作業が終わったら「ログアウト」ボタンでログアウトできます。

## 注意点

-   このアプリケーションはクライアントサイドで動作するため、Googleから取得したアクセストークンはブラウザのメモリ内に一時的に保持されます。ブラウザを閉じるかログアウトするとトークンは破棄（または無効化）されます。
-   OAuthクライアントIDはJavaScriptコード内に含まれるため、ブラウザの開発者ツールなどで確認可能です。これはクライアントサイドウェブアプリケーションの一般的な特性です。セキュリティを確保するため、「承認済みの JavaScript 生成元」を正しく設定し、意図しないドメインからの利用を防ぐことが重要です。
-   Google Drive APIの利用には、Googleの利用規約およびAPIの割り当て制限が適用されます。

## 今後の拡張予定

-   ダウンロードするMarkdownファイルに、JSONファイルの内容をMarkdown形式に変換して含める機能。
-   エラーハンドリングの改善。
-   ページネーション（ファイル数が多い場合）。
-   フォルダ選択機能。