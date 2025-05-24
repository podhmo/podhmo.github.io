# tools

- ai-studio-to-markdown -- google driveに保存されてるJSONをmarkdownに変換
- llm-scaffold -- llmの生成結果をそのままディレクトリに転写したい

## install

```bash
deno install -f --global --allow-read ./ai-studio-to-markdown.ts
deno install -f --global --allow-read --allow-write -n llm-scaffold ./llm-scaffold.ts
```