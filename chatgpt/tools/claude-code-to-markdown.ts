// deno run --allow-read <your_script_name>.ts <path_to_file.json|.jsonl> [--with-tool-calls] [--user-name <name>] [--assistant-name <name>] [--only-user-inputs]
import { parseArgs } from "jsr:@std/cli@1.0.17/parse-args";

// Claude Code JSONL エントリの型定義
//
// Claude Code の会話ログは JSONL 形式（1行1JSONオブジェクト）で、以下の type が存在する。
//
// 【出力対象】
//   - "user"      : ユーザーメッセージ。ただし message.content が文字列の場合のみ実際の入力として出力する。
//   - "assistant" : アシスタントメッセージ。content[].type === "text" のブロックを出力する。
//
// 【スキップされるもの】
//   - "user" で message.content が配列の場合: ツール実行結果のフィードバック（tool_result）であり会話本文ではない
//   - "assistant" の重複エントリ: 同一 message.id を持つ複数行はストリーミング断片。最後の1つだけ採用する
//   - "file-history-snapshot" : ファイル変更履歴のスナップショット
//   - "permission-mode"       : acceptEdits などの権限設定の記録
//   - "last-prompt"           : セッション内の最後のプロンプトのメタ情報
//   - "attachment"            : スキルリスト・タスクリマインダー・ツール一覧など
//   - "system"                : ターン所要時間（turn_duration）などのシステム統計情報
//   - "queue-operation"       : キューへの enqueue/dequeue 操作記録
//
// 【assistant content ブロックのうちスキップされるもの】
//   - "thinking" : モデルの思考過程（extended thinking）
//   - "tool_use" : ツール呼び出し。--with-tool-calls 指定時のみ表示する

interface UserEntry {
    type: "user";
    uuid: string;
    parentUuid: string | null;
    timestamp?: string;
    promptId?: string;
    message: {
        role: "user";
        content: string | ContentBlock[];
    };
}

interface AssistantEntry {
    type: "assistant";
    uuid: string;
    parentUuid: string | null;
    timestamp?: string;
    message: {
        id: string; // Anthropic message ID (e.g. msg_01XXX) - may be duplicated across streaming chunks
        role: "assistant";
        content: ContentBlock[];
    };
}

type ContentBlock =
    | { type: "text"; text: string }
    | { type: "thinking"; thinking: string; signature: string }
    | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
    | { type: "tool_result"; tool_use_id: string; content: string | ContentBlock[]; is_error?: boolean };

type ClaudeCodeEntry =
    | UserEntry
    | AssistantEntry
    | { type: string; [key: string]: unknown }; // その他のエントリ

interface DisplayBlock {
    type: "user" | "assistant";
    content: string[];
}

interface ToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
}

interface Message {
    role: "user" | "assistant";
    text: string;
    toolCalls?: ToolCall[];
    timestamp?: string;
}

function extractTextFromContent(content: ContentBlock[]): string {
    return content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("");
}

function extractToolCalls(content: ContentBlock[]): ToolCall[] {
    return content
        .filter((b): b is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
            b.type === "tool_use"
        )
        .map((b) => ({ id: b.id, name: b.name, input: b.input }));
}

function parseJSONL(fileContent: string): Message[] {
    const lines = fileContent.trim().split("\n").filter((l) => l.trim() !== "");
    const entries: ClaudeCodeEntry[] = lines.map((line) => JSON.parse(line));

    // assistant エントリを message.id で重複排除（最後のものを採用）
    const assistantByMsgId = new Map<string, AssistantEntry>();
    for (const entry of entries) {
        if (entry.type === "assistant") {
            const a = entry as AssistantEntry;
            if (a.message?.id) {
                assistantByMsgId.set(a.message.id, a);
            }
        }
    }

    // uuid → entry のマップを構築（重複排除後の assistant で上書き）
    const byUuid = new Map<string, ClaudeCodeEntry>();
    for (const entry of entries) {
        if (entry.type === "assistant") {
            const a = entry as AssistantEntry;
            if (a.message?.id) {
                const deduped = assistantByMsgId.get(a.message.id)!;
                byUuid.set(deduped.uuid, deduped);
            }
        } else {
            const e = entry as { uuid?: string; type: string };
            if (e.uuid) {
                byUuid.set(e.uuid, entry);
            }
        }
    }

    // 出力順を保持するために元の登場順でメッセージを収集
    // user エントリと重複排除済み assistant エントリのみ対象
    const seenMsgIds = new Set<string>();
    const messages: Message[] = [];

    for (const entry of entries) {
        if (entry.type === "user") {
            const u = entry as UserEntry;
            // tool_result を含む配列は表示しない（ツール実行結果）
            if (typeof u.message.content === "string") {
                messages.push({
                    role: "user",
                    text: u.message.content,
                    timestamp: u.timestamp,
                });
            }
        } else if (entry.type === "assistant") {
            const a = entry as AssistantEntry;
            if (!a.message?.id || seenMsgIds.has(a.message.id)) continue;

            // 重複排除後の最終バージョンを取得
            const final = assistantByMsgId.get(a.message.id)!;
            seenMsgIds.add(a.message.id);

            const text = extractTextFromContent(final.message.content);
            const toolCalls = extractToolCalls(final.message.content);

            if (text.trim() !== "" || toolCalls.length > 0) {
                messages.push({
                    role: "assistant",
                    text,
                    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                    timestamp: final.timestamp,
                });
            }
        }
    }

    return messages;
}

function formatToMarkdown(
    messages: Message[],
    withToolCalls: boolean,
    userName: string,
    assistantName: string,
    onlyUserInputs: boolean,
): string {
    const outputParts: string[] = [];

    if (onlyUserInputs) {
        outputParts.push("## ユーザー入力履歴\n\n");
        const userMessages = messages.filter((m) => m.role === "user");
        userMessages.forEach((msg, index) => {
            if (msg.text.trim() === "") return;
            outputParts.push(`${userName}:\n${msg.text.trim()}`);
            if (index < userMessages.length - 1) {
                outputParts.push("\n\n---\n\n");
            } else {
                outputParts.push("\n\n");
            }
        });
        if (userMessages.length === 0) {
            outputParts.push("\n");
        }
    } else {
        outputParts.push("## 対話履歴\n\n");

        const displayBlocks: DisplayBlock[] = [];

        for (const msg of messages) {
            if (msg.role === "user") {
                if (msg.text.trim() === "") continue;
                displayBlocks.push({
                    type: "user",
                    content: [`${userName}:\n${msg.text.trim()}`],
                });
            } else {
                const assistantContent: string[] = [];

                if (msg.text.trim() !== "") {
                    assistantContent.push(`${assistantName}:\n${msg.text.trim()}`);
                }

                if (msg.toolCalls && msg.toolCalls.length > 0 && withToolCalls) {
                    if (assistantContent.length > 0) {
                        assistantContent.push("");
                    }
                    assistantContent.push("<details>");
                    assistantContent.push("<summary>ツール呼び出し</summary>");
                    assistantContent.push("");

                    msg.toolCalls.forEach((toolCall, index) => {
                        assistantContent.push(`### Tool Call ${index + 1}`);
                        assistantContent.push(`**ID**: \`${toolCall.id}\``);
                        assistantContent.push(`**Function**: \`${toolCall.name}\``);
                        assistantContent.push("**Arguments**:");
                        assistantContent.push("```json");
                        assistantContent.push(JSON.stringify(toolCall.input, null, 2));
                        assistantContent.push("```");
                        if (index < (msg.toolCalls?.length ?? 0) - 1) {
                            assistantContent.push("");
                        }
                    });

                    assistantContent.push("</details>");
                }

                if (assistantContent.length > 0) {
                    displayBlocks.push({ type: "assistant", content: assistantContent });
                }
            }
        }

        displayBlocks.forEach((block, index) => {
            outputParts.push(block.content.join("\n"));
            if (index < displayBlocks.length - 1) {
                outputParts.push("\n\n---\n\n");
            } else {
                outputParts.push("\n\n");
            }
        });
        if (displayBlocks.length === 0) {
            outputParts.push("\n");
        }
    }

    // メタデータ
    const userCount = messages.filter((m) => m.role === "user").length;
    const assistantCount = messages.filter((m) => m.role === "assistant").length;
    outputParts.push("## メタデータ\n\n");
    outputParts.push("```json\n");
    outputParts.push(
        JSON.stringify({ userMessageCount: userCount, assistantMessageCount: assistantCount }, null, 2),
    );
    outputParts.push("\n```\n");

    return outputParts.join("");
}

async function main() {
    const flags = parseArgs(Deno.args, {
        boolean: ["with-tool-calls", "only-user-inputs"],
        string: ["user-name", "assistant-name"],
        default: {
            "with-tool-calls": false,
            "only-user-inputs": false,
            "user-name": "User",
            "assistant-name": "Assistant",
        },
        alias: {
            "t": "with-tool-calls",
            "ou": "only-user-inputs",
        },
    });

    if (flags._.length === 0 || typeof flags._[0] !== "string") {
        console.error("エラー: ファイルへのパスを引数として指定してください。");
        console.error(
            "使用法: deno run --allow-read <script.ts> <file.json|file.jsonl> [options]",
        );
        console.error("オプション:");
        console.error("  -t, --with-tool-calls       ツール呼び出しを表示します");
        console.error(
            "      --user-name <name>       ユーザー名を指定します (デフォルト: User)",
        );
        console.error(
            "      --assistant-name <name>  アシスタント名を指定します (デフォルト: Assistant)",
        );
        console.error(
            "      --ou, --only-user-inputs  ユーザー入力のみを表示します",
        );
        Deno.exit(1);
    }

    const filePath = flags._[0] as string;
    const withToolCalls = flags["with-tool-calls"];
    const userName = flags["user-name"];
    const assistantName = flags["assistant-name"];
    const onlyUserInputs = flags["only-user-inputs"];

    let fileContent: string;
    try {
        fileContent = await Deno.readTextFile(filePath);
    } catch (error) {
        console.error(`ファイル読み込みエラー ${filePath}:`, error);
        Deno.exit(1);
    }

    try {
        const messages = parseJSONL(fileContent);
        const markdown = formatToMarkdown(
            messages,
            withToolCalls && !onlyUserInputs,
            userName,
            assistantName,
            onlyUserInputs,
        );
        console.log(markdown);
    } catch (error) {
        console.error("ファイルの処理中にエラーが発生しました:", error);
        Deno.exit(1);
    }
}

if (import.meta.main) {
    main();
}
