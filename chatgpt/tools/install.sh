#!/bin/sh
# chatgpt/tools の .ts ツールを ~/.local/bin にリンクしてグローバルコマンド化する。
# Node 24+ が必要 (.ts の直接実行)。~/.local/bin が PATH に含まれていること。
set -eu

dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
bin="$HOME/.local/bin"
mkdir -p "$bin"

link() {
  src="$dir/$1"
  name="$2"
  if [ ! -f "$src" ]; then
    echo "skip (not found): $src"
    return 0
  fi
  chmod +x "$src"
  ln -sf "$src" "$bin/$name"
  echo "installed: $name -> $src"
}

link ./ai-studio-to-markdown.ts           ai-studio-to-markdown
link ./claude-code-to-markdown.ts         claude-code-to-markdown
link ./github-copilot-cli-to-markdown.ts  github-copilot-cli-to-markdown
link ./llm-scaffold.ts                    llm-scaffold
link ./normalize-text.ts                  normalize-text
link ./sync-writing-skills.ts            sync-writing-skills

# ai-studio-download だけ google-auth-library が必要なので npm install する
if [ -d "$dir/ai-studio-download" ]; then
  (cd "$dir/ai-studio-download" && npm install --no-audit --no-fund)
  link ./ai-studio-download/ai-studio-download.ts ai-studio-download
fi

echo "done. make sure $bin is on your PATH"
