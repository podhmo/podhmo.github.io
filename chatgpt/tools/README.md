# tools

- ai-studio-to-markdown -- Google AI Studioの対話履歴(JSON形式)をmarkdownに変換
- ai-studio-download    -- Google AI Studioの対話履歴をダウンロードするツール(JSON形式)
- llm-scaffold          -- llmの生成結果をそのままディレクトリに転写したい
- normalize-text        -- テキストのエスケープシーケンス変換とホームディレクトリの正規化

## install

Node 24+ が必要 (`.ts` をそのまま実行するため)。`make setup` (= `./install.sh`) で
各スクリプトに実行ビットを付けて `~/.local/bin` にリンクします:

```bash
make setup
# ~/.local/bin/ai-studio-to-markdown -> ./ai-studio-to-markdown.ts など
# ai-studio-download のみ追加で npm install (google-auth-library) も実行される
```

旧来の `deno install -f --global ...` に相当する仕組みです。
`ai-studio-download` 利用時は引き続き `GOOGLE_APPLICATION_CREDENTIALS` 環境変数を設定してください:

```bash
alias ai-studio-download="GOOGLE_APPLICATION_CREDENTIALS=~/.config/google/service-account-key.json ai-studio-download"
```
