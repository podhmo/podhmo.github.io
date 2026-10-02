# tofile

スマホの「共有（送る）」機能で選択したテキストを **.txt ファイルとしてダウンロード**する PWA。  
Cloudflare Workers + Web Share Target API を使う。

## 使い方

1. このページをスマホのホーム画面に追加（PWA としてインストール）
2. アプリや Web でテキストを選択 → 「共有」
3. 共有先に **tofile** を選ぶ
4. `.txt` ファイルが自動でダウンロードされる

## セットアップ

### 必要なもの

- [Node.js](https://nodejs.org/) (v24 推奨)
- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)

### インストール

```bash
npm install
```

## デプロイ

```bash
# Cloudflare にログイン（初回のみ）
npx wrangler login

# Workers へデプロイ
npm run deploy
```

デプロイ後、以下のような URL が発行されます:

```
https://tofile.<your-subdomain>.workers.dev
```

その URL をスマホで開き、**ホーム画面に追加**するとOS の共有シートに tofile が表示されるようになります。

## ローカル開発

```bash
npm run dev
# → http://localhost:8787 で起動
```

## 仕組み

```
スマホ「共有」
  └─ POST /share (multipart/form-data)
       └─ Service Worker が横取り
            └─ テキストを Blob に変換 → <a download> でダウンロード
                 └─ / にリダイレクト
```

- `public/manifest.json` — Web App Manifest (`share_target` 定義)
- `public/sw.js` — Service Worker (Share Target 処理)
- `public/index.html` — PWA シェル (SW 登録・ダウンロード処理)

