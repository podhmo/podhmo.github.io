import { formatChatHistoryToMarkdown } from "./converter.js";
import { assertEquals } from "jsr:@std/assert@0.226.0";

Deno.test("formatChatHistoryToMarkdown - 基本的な会話", () => {
    const chatHistory = {
        "runSettings": {
            "temperature": 1,
            "model": "gemini-1.5-flash-001",
            "topP": 0.95,
            "topK": 64,
            "maxOutputTokens": 8192,
            "safetySettings": [],
            "responseMimeType": "text/plain",
        },
        "chunkedPrompt": {
            "chunks": [
                { "text": "こんにちは", "role": "user" },
                { "text": "こんにちは！何かお手伝いできることはありますか？", "role": "model" }
            ]
        }
    };
    const expectedMarkdown = `## 対話履歴

ユーザー:
こんにちは

---

AI:
こんにちは！何かお手伝いできることはありますか？

## メタデータ

\`\`\`json
{
  "runSettings": {
    "temperature": 1,
    "model": "gemini-1.5-flash-001",
    "topP": 0.95,
    "topK": 64,
    "maxOutputTokens": 8192,
    "safetySettings": [],
    "responseMimeType": "text/plain"
  },
  "systemInstruction": null
}
\`\`\`
`;
    const result = formatChatHistoryToMarkdown(chatHistory);
    assertEquals(result.trim(), expectedMarkdown.trim());
});

Deno.test("formatChatHistoryToMarkdown - コードブロックが改行なしで終わるケース", () => {
    const chatHistory = {
        "runSettings": { "model": "test" },
        "chunkedPrompt": {
            "chunks": [
                { "text": "コードを書いて", "role": "user" },
                { "text": "はい、どうぞ。\n\`\`\`javascript\nconsole.log(\"Hello, World!\");\n\`\`\`", "role": "model" }
            ]
        }
    };
    const expectedMarkdown = `## 対話履歴

ユーザー:
コードを書いて

---

AI:
はい、どうぞ。
\`\`\`javascript
console.log("Hello, World!");
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

Deno.test("formatChatHistoryToMarkdown - withThoughts オプション", () => {
    const chatHistory = {
        "runSettings": { "model": "test" },
        "chunkedPrompt": {
            "chunks": [
                { "text": "考えて", "role": "user" },
                { "text": "うーん、そうですね...", "role": "model", "isThought": true },
                { "text": "わかりました！", "role": "model" }
            ]
        }
    };
    const expectedMarkdown = `## 対話履歴

ユーザー:
考えて

---

<details>
<summary>AIの思考プロセス</summary>

うーん、そうですね...
</details>
AI:
わかりました！

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


Deno.test("formatChatHistoryToMarkdown - onlyUserInputs オプション", () => {
    const chatHistory = {
        "runSettings": { "model": "test" },
        "chunkedPrompt": {
            "chunks": [
                { "text": "ユーザー1", "role": "user" },
                { "text": "AI1", "role": "model" },
                { "text": "ユーザー2", "role": "user" }
            ]
        }
    };
    const expectedMarkdown = `## ユーザー入力履歴

ユーザー:
ユーザー1

---

ユーザー:
ユーザー2

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
