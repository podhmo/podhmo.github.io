# URL 指定ダウンロード機能の使用例

## 概要

AI Studio の URL を指定して、対話履歴を直接ダウンロードできるようになりました。

## 使用方法

### 基本的な使い方

AI Studio で対話履歴を開いている時のURLをコピーして、`--url` オプションで指定します：

```bash
ai-studio-download --url https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5
```

### 出力先を指定する

```bash
ai-studio-download --url https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5 -o ./output
```

### サービスアカウントキーを指定する

```bash
ai-studio-download --url https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5 --keyFile ./service-account-key.json
```

## URL の形式

AI Studio の URL は以下の形式である必要があります：

```
https://aistudio.google.com/prompts/{fileId}
```

例：
- `https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5`
- `https://aistudio.google.com/prompts/abc123xyz`

## 従来の対話形式との違い

### 従来の方法（対話形式）
1. `ai-studio-download` を実行
2. 対話履歴の一覧が表示される
3. カーソルキーで選択してEnter

### 新しい方法（URL指定）
1. AI Studio で対話履歴を開く
2. ブラウザのアドレスバーからURLをコピー
3. `ai-studio-download --url <URL>` で直接ダウンロード

## エラーハンドリング

### 無効なURL

```bash
$ ai-studio-download --url https://example.com/prompts/123
無効なAI Studio URLです: https://example.com/prompts/123
正しいURL形式: https://aistudio.google.com/prompts/{fileId}
```

### ファイルが見つからない

```bash
$ ai-studio-download --url https://aistudio.google.com/prompts/invalid-id
URL からファイル ID を抽出しました: invalid-id
ファイル情報の取得中にエラーが発生しました (ID: invalid-id): ...
ファイル ID invalid-id の情報を取得できませんでした。
```

## 実装の詳細

URL からファイル ID を抽出する処理：

1. URL をパースして、ホスト名が `aistudio.google.com` であることを確認
2. パスが `/prompts/` で始まることを確認
3. パスの第3セグメント（`/prompts/{fileId}` の `{fileId}` 部分）を抽出
4. Google Drive API を使用してファイル情報を取得
5. ファイルをダウンロード

## テスト

URL 解析機能のテストを実行：

```bash
cd chatgpt/tools/ai-studio-download
deno test ai-studio-download.test.ts
```
