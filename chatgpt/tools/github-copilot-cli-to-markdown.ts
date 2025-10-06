// deno run --allow-read --allow-env <your_script_name>.ts <path_to_your_json_file.json> [--with-tool-calls] [--user-name <name>] [--assistant-name <name>] [--only-user-inputs]
import { parseArgs } from "jsr:@std/cli@1.0.17/parse-args";

interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

interface ChatMessage {
    id?: string;
    timestamp?: string;
    type?: string;
    content?: string;
    text?: string;
    role: "user" | "assistant" | "copilot";
    tool_calls?: ToolCall[];
    mentions?: unknown[];
    expandedText?: string;
    imageAttachments?: unknown[];
}

interface CopilotChatHistory {
    sessionId: string;
    startTime: string;
    chatMessages: ChatMessage[];
}

interface DisplayBlock {
    type: "user" | "assistant";
    content: string[]; // 各行の文字列の配列
}

function formatChatHistoryToMarkdown(
    jsonDataString: string,
    withToolCalls: boolean,
    userName: string,
    assistantName: string,
    onlyUserInputs: boolean,
): string {
    const chatHistory: CopilotChatHistory = JSON.parse(jsonDataString);
    const outputParts: string[] = [];

    if (onlyUserInputs) {
        outputParts.push("## ユーザー入力履歴\n\n");
        const userMessages = chatHistory.chatMessages.filter((msg) =>
            msg.role === "user"
        );
        userMessages.forEach((msg, index) => {
            const text = msg.text || msg.content || "";
            if (text.trim() === "") {
                // ユーザーの入力が空の場合はスキップ
                return;
            }
            outputParts.push(`${userName}:\n${text.trim()}`);
            if (index < userMessages.length - 1) {
                outputParts.push("\n\n---\n\n");
            } else {
                outputParts.push("\n\n"); // 最後の入力の後
            }
        });
        if (userMessages.length === 0) {
            outputParts.push("\n"); // 履歴がない場合、ヘッダーの後に改行
        }
    } else {
        outputParts.push("## 対話履歴\n\n");

        const displayBlocks: DisplayBlock[] = [];

        for (const msg of chatHistory.chatMessages) {
            const role = msg.role === "copilot" ? "assistant" : msg.role;
            const text = msg.text || msg.content || "";

            if (role === "user") {
                if (text.trim() === "") {
                    // ユーザーの入力が空の場合はスキップ
                    continue;
                }

                // Userブロックを追加
                displayBlocks.push({
                    type: "user",
                    content: [`${userName}:\n${text.trim()}`],
                });
            } else if (role === "assistant") {
                const assistantContent: string[] = [];

                // アシスタントのテキスト
                if (text.trim() !== "") {
                    assistantContent.push(`${assistantName}:\n${text.trim()}`);
                }

                // ツール呼び出しがある場合
                if (msg.tool_calls && msg.tool_calls.length > 0 && withToolCalls) {
                    if (assistantContent.length > 0) {
                        assistantContent.push("");
                    }
                    assistantContent.push("<details>");
                    assistantContent.push("<summary>ツール呼び出し</summary>");
                    assistantContent.push("");

                    msg.tool_calls.forEach((toolCall, index) => {
                        assistantContent.push(`### Tool Call ${index + 1}`);
                        assistantContent.push(`**ID**: \`${toolCall.id}\``);
                        assistantContent.push(`**Type**: \`${toolCall.type}\``);
                        assistantContent.push(
                            `**Function**: \`${toolCall.function.name}\``,
                        );
                        assistantContent.push("**Arguments**:");
                        assistantContent.push("```json");
                        try {
                            const args = JSON.parse(toolCall.function.arguments);
                            assistantContent.push(
                                JSON.stringify(args, null, 2),
                            );
                        } catch {
                            assistantContent.push(toolCall.function.arguments);
                        }
                        assistantContent.push("```");
                        if (index < msg.tool_calls.length - 1) {
                            assistantContent.push("");
                        }
                    });

                    assistantContent.push("</details>");
                }

                if (assistantContent.length > 0) {
                    displayBlocks.push({
                        type: "assistant",
                        content: assistantContent,
                    });
                }
            }
        }

        // displayBlocksを結合して出力
        displayBlocks.forEach((block, index) => {
            outputParts.push(block.content.join("\n"));
            if (index < displayBlocks.length - 1) {
                outputParts.push("\n\n---\n\n");
            } else {
                outputParts.push("\n\n"); // 最後のブロックの後
            }
        });
        if (displayBlocks.length === 0) {
            outputParts.push("\n");
        }
    }

    // メタデータの追加
    outputParts.push("## メタデータ\n\n");
    outputParts.push("```json\n");
    outputParts.push(JSON.stringify({
        sessionId: chatHistory.sessionId,
        startTime: chatHistory.startTime,
        messageCount: chatHistory.chatMessages.length,
    }, null, 2));
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
        console.error(
            "エラー: JSONファイルへのパスを引数として指定してください。",
        );
        console.error(
            "使用法: deno run --allow-read --allow-env <script.ts> <file.json> [options]",
        );
        console.error("オプション:");
        console.error(
            "  -t, --with-tool-calls       ツール呼び出しを表示します",
        );
        console.error(
            "      --user-name <name>      ユーザー名を指定します (デフォルト: User)",
        );
        console.error(
            "      --assistant-name <name>  アシスタント名を指定します (デフォルト: Assistant)",
        );
        console.error(
            "      --ou, --only-user-inputs ユーザー入力のみを表示します",
        );
        Deno.exit(1);
    }

    const filePath = flags._[0] as string;
    const withToolCalls = flags["with-tool-calls"];
    const userName = flags["user-name"];
    const assistantName = flags["assistant-name"];
    const onlyUserInputs = flags["only-user-inputs"];

    let jsonString: string;

    try {
        jsonString = await Deno.readTextFile(filePath);
    } catch (error) {
        console.error(`ファイル読み込みエラー ${filePath}:`, error);
        Deno.exit(1);
    }

    try {
        const markdownResult = formatChatHistoryToMarkdown(
            jsonString,
            withToolCalls && !onlyUserInputs, // onlyUserInputs が true なら withToolCalls は無効
            userName,
            assistantName,
            onlyUserInputs,
        );
        console.log(markdownResult);
    } catch (error) {
        console.error("JSONデータの処理中にエラーが発生しました:", error);
        Deno.exit(1);
    }
}

if (import.meta.main) {
    main();
}
