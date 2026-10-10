# tools

- ai-studio-to-markdown -- Google AI Studioの対話履歴(JSON形式)をmarkdownに変換
- ai-studio-download    -- Google AI Studioの対話履歴をダウンロードするツール(JSON形式)
- llm-scaffold          -- llmの生成結果をそのままディレクトリに転写したい
- normalize-text        -- テキストのエスケープシーケンス変換とホームディレクトリの正規化
- sync-writing-skills   -- 文章推敲系 Agent Skill (github/gist) の markdown を取り寄せて ../WritingSkills.md を生成

## install

```bash
mbtx-install ./ai-studio-to-markdown.mbtx
mbtx-install ./claude-code-to-markdown.mbtx
mbtx-install ./llm-scaffold.mbtx
mbtx-install ./ai-studio-download.mbtx
alias ai-studio-download="GOOGLE_APPLICATION_CREDENTIALS=~/.config/google/service-account-key.json ai-studio-download"
mbtx-install ./normalize-text.mbtx
mbtx-install ./github-copilot-cli-to-markdown.mbtx
mbtx-install ./sync-writing-skills.mbtx
```
