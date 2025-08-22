import { formatChatHistoryToMarkdown } from "./converter.js";
import { assertEquals } from "jsr:@std/assert@0.226.0";

Deno.test("formatChatHistoryToMarkdown - 基本的な会話", () => {
    const chatHistory = {
        "runSettings": {
            "temperature": 1,
            "model": "gemini-1.5-flash-001",
        },
        "chunkedPrompt": {
            "chunks": [
                { "text": "こんにちは", "role": "user" },
                { "text": "こんにちは！", "role": "model" }
            ]
        }
    };
    const expectedMarkdown = `## 対話履歴

ユーザー: こんにちは

---

AI:
こんにちは！

## メタデータ

\`\`\`json
{
  "runSettings": {
    "temperature": 1,
    "model": "gemini-1.5-flash-001"
  },
  "systemInstruction": null
}
\`\`\`
`;
    const result = formatChatHistoryToMarkdown(chatHistory);
    assertEquals(result.trim(), expectedMarkdown.trim());
});

Deno.test("formatChatHistoryToMarkdown - コードブロック", () => {
    const chatHistory = {
        "runSettings": { "model": "test" },
        "chunkedPrompt": {
            "chunks": [
                { "text": "コードを", "role": "user" },
                { "text": "どうぞ\n\`\`\`js\nconsole.log(1)\n\`\`\`", "role": "model" }
            ]
        }
    };
    const expectedMarkdown = `## 対話履歴

ユーザー: コードを

---

AI:
どうぞ
\`\`\`js
console.log(1)
\`\`\`
## メタデータ

\`\`\`json
{
  "runSettings": {
    "model": "test"
  },
  "systemInstruction": null
}
\`\`\`
`;
    const result = formatChatHistoryToMarkdown(chatHistory);
    assertEquals(result.trim(), expectedMarkdown.trim());
});

Deno.test("formatChatHistoryToMarkdown - 思考を含む", () => {
    const chatHistory = {
        "runSettings": { "model": "test" },
        "chunkedPrompt": {
            "chunks": [
                { "text": "考えて", "role": "user" },
                { "text": "うーん", "role": "model", "isThought": true },
                { "text": "わかった", "role": "model" }
            ]
        }
    };
    const expectedMarkdown = `## 対話履歴

ユーザー: 考えて

---

AI:
<details>
<summary>AIの思考プロセス</summary>

うーん
</details>
わかった

## メタデータ

\`\`\`json
{
  "runSettings": {
    "model": "test"
  },
  "systemInstruction": null
}
\`\`\`
`;
    const result = formatChatHistoryToMarkdown(chatHistory, { withThoughts: true });
    assertEquals(result.trim(), expectedMarkdown.trim());
});

Deno.test("formatChatHistoryToMarkdown - ユーザー入力のみ", () => {
    const chatHistory = {
        "runSettings": { "model": "test" },
        "chunkedPrompt": {
            "chunks": [
                { "text": "u1", "role": "user" },
                { "text": "a1", "role": "model" },
                { "text": "u2", "role": "user" }
            ]
        }
    };
    const expectedMarkdown = `## ユーザー入力履歴

ユーザー: u1

---

ユーザー: u2

## メタデータ

\`\`\`json
{
  "runSettings": {
    "model": "test"
  },
  "systemInstruction": null
}
\`\`\`
`;
    const result = formatChatHistoryToMarkdown(chatHistory, { onlyUserInputs: true });
    assertEquals(result.trim(), expectedMarkdown.trim());
});

Deno.test("formatChatHistoryToMarkdown - 複数のバッククォート", () => {
    const chatHistory = {
        "runSettings": { "model": "test" },
        "chunkedPrompt": {
            "chunks": [
                { "text": "コード", "role": "user" },
                { "text": "\`\`\`\`\ncode\n\`\`\`\`", "role": "model" }
            ]
        }
    };
    const expectedMarkdown = `## 対話履歴

ユーザー: コード

---

AI:
\`\`\`\`
code
\`\`\`\`
## メタデータ

\`\`\`json
{
  "runSettings": {
    "model": "test"
  },
  "systemInstruction": null
}
\`\`\`
`;
    const result = formatChatHistoryToMarkdown(chatHistory);
    assertEquals(result.trim(), expectedMarkdown.trim());
});
