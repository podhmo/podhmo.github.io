#!/usr/bin/env node
// Agent Skill リポジトリ/gist から markdown 群を取り寄せ、
// Prompt Template Clipper 形式 (chatgpt/Template.md と同じ) の WritingSkills.md を生成する。
//
// 使い方 (Node 24+ 必須: .ts を直接実行する):
//   node sync-writing-skills.ts [output.md]
//   # またはリポジトリルートから: node chatgpt/tools/sync-writing-skills.ts chatgpt/WritingSkills.md
//

// 各スキルの構成ファイルは ` ```md:<path> ` 形式のタイトル付きコードブロックとして
// 書き出す。クリッパー側ではブロック単位のコピペ、または「Download (.md)」で
// <file name="path"> 形式に合成された1つのプロンプトとして取り出せる。
//
// スキルの追加・更新は SKILLS 定数を編集して再実行する。

import { writeFile } from "node:fs/promises";

interface SkillSource {
  /** `## <templateName>` として出力される */
  templateName: string;
  /** テンプレートの説明文 (markdown)。出典・ライセンス・注意事項を書く */
  description: string;
  /** 取り込むファイル一覧。title は出力される code fence のタイトル */
  files: { url: string; title: string }[];
}

const YOMIYASU_BASE =
  "https://raw.githubusercontent.com/nanaism/yomiyasu/main/skills/yomiyasu";
const NATURAL_JAPANESE_BASE =
  "https://raw.githubusercontent.com/coji/natural-japanese/main/skills/natural-japanese";
const JAPANESE_TECH_WRITING_GIST =
  "https://gist.githubusercontent.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d/raw";

const SKILLS: SkillSource[] = [
  {
    templateName: "yomiyasu",
    description: `AIが生成した不自然な日本語を読みやすく直す writing skill。文の骨格(誰が・何を・どうした)や比喩動詞を具体化するタイプ。

- 出典: https://github.com/nanaism/yomiyasu (MIT)
- 参考: https://qiita.com/inoyu-qiita/items/0ffe6e74ecaf3aaa8b14
- scripts/ は python3 (標準ライブラリのみ) で実行可能。チャットで使う分には不要`,
    files: [
      { url: `${YOMIYASU_BASE}/SKILL.md`, title: "SKILL.md" },
      { url: `${YOMIYASU_BASE}/references/gemini-syntax.md`, title: "references/gemini-syntax.md" },
      { url: `${YOMIYASU_BASE}/references/slop-catalog.md`, title: "references/slop-catalog.md" },
      { url: `${YOMIYASU_BASE}/references/domains/tech.md`, title: "references/domains/tech.md" },
      { url: `${YOMIYASU_BASE}/references/domains/business.md`, title: "references/domains/business.md" },
      { url: `${YOMIYASU_BASE}/references/domains/essay.md`, title: "references/domains/essay.md" },
      { url: `${YOMIYASU_BASE}/scripts/yomiyasu_lint.py`, title: "scripts/yomiyasu_lint.py" },
      { url: `${YOMIYASU_BASE}/scripts/yomiyasu_diff.py`, title: "scripts/yomiyasu_diff.py" },
    ],
  },
  {
    templateName: "natural-japanese",
    description: `仕事の日本語文書を読みやすく書く・直す writing skill。「設計 → 執筆 → 検査 → 収束」の工程を持ち、文書タイプ別の型 (references/doctypes/) を含む。

- 出典: https://github.com/coji/natural-japanese (MIT)
- 参考: https://qiita.com/inoyu-qiita/items/0ffe6e74ecaf3aaa8b14
- scripts/ は uv run scripts/lint.py 等で実行 (PEP 723)。uv がない環境では references/manual-checklist.md を使う`,
    files: [
      { url: `${NATURAL_JAPANESE_BASE}/SKILL.md`, title: "SKILL.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/writing-constitution.md`, title: "references/writing-constitution.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/forbidden-patterns.md`, title: "references/forbidden-patterns.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/translationese.md`, title: "references/translationese.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/readability-principles.md`, title: "references/readability-principles.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/readability-antipatterns.md`, title: "references/readability-antipatterns.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/revision-guide.md`, title: "references/revision-guide.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/genre-notes.md`, title: "references/genre-notes.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/diagnose.md`, title: "references/diagnose.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/eval-rubric.md`, title: "references/eval-rubric.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/manual-checklist.md`, title: "references/manual-checklist.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/examples.md`, title: "references/examples.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/doctypes/minutes.md`, title: "references/doctypes/minutes.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/doctypes/report.md`, title: "references/doctypes/report.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/doctypes/guide.md`, title: "references/doctypes/guide.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/doctypes/memo.md`, title: "references/doctypes/memo.md" },
      { url: `${NATURAL_JAPANESE_BASE}/references/doctypes/slide.md`, title: "references/doctypes/slide.md" },
      { url: `${NATURAL_JAPANESE_BASE}/assets/style-profile-template.md`, title: "assets/style-profile-template.md" },
      { url: `${NATURAL_JAPANESE_BASE}/scripts/lint.py`, title: "scripts/lint.py" },
      { url: `${NATURAL_JAPANESE_BASE}/scripts/outline.py`, title: "scripts/outline.py" },
      { url: `${NATURAL_JAPANESE_BASE}/scripts/semantic.py`, title: "scripts/semantic.py" },
      { url: `${NATURAL_JAPANESE_BASE}/scripts/terms.py`, title: "scripts/terms.py" },
      { url: `${NATURAL_JAPANESE_BASE}/scripts/textcore.py`, title: "scripts/textcore.py" },
      { url: `${NATURAL_JAPANESE_BASE}/scripts/calibrate.py`, title: "scripts/calibrate.py" },
    ],
  },
  {
    templateName: "japanese-tech-writing",
    description: `日本語の技術文書・書籍原稿の文章規範。パラグラフライティング、論証の厳密さ、読み手の負荷、LLM っぽい空句の禁止などを定める。

- 出典: https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d (Unlicense)
- 参考: https://qiita.com/inoyu-qiita/items/0ffe6e74ecaf3aaa8b14`,
    files: [
      { url: `${JAPANESE_TECH_WRITING_GIST}/SKILL.md`, title: "SKILL.md" },
    ],
  },
];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  return await res.text();
}

/** 本文中の最長バッククォート列より長い fence を返す (最小3) */
function fenceFor(body: string): string {
  const seqs = body.match(/`{3,}/g) ?? [];
  const max = seqs.reduce((m, s) => Math.max(m, s.length), 0);
  return "`".repeat(Math.max(3, max + 1));
}

async function main(): Promise<void> {
  const output = process.argv[2] ?? "../WritingSkills.md";
  const chunks: string[] = [];

  chunks.push(`# 日本語推敲スキル

https://qiita.com/inoyu-qiita/items/0ffe6e74ecaf3aaa8b14 で取り上げられた writing skill をプロンプトテンプレートにしたもの。

ℹ️ このファイルは tools/sync-writing-skills.ts で生成している
`);

  for (const skill of SKILLS) {
    chunks.push(`## ${skill.templateName}\n\n${skill.description}\n`);
    for (const file of skill.files) {
      const body = (await fetchText(file.url)).trim();
      const fence = fenceFor(body);
      const lang = file.title.endsWith(".py") ? "py" : "md";
      chunks.push(`${fence}${lang}:${file.title}\n${body}\n${fence}`);
    }
  }

  const content = chunks.join("\n\n") + "\n";
  await writeFile(output, content, "utf-8");
  console.log(`wrote ${output} (${content.length} chars)`);
}

await main();
