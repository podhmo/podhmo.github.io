// deno run --allow-read --allow-env <your_script_name>.ts <path_to_your_json_file.json> [--with-thoughts] [--user-name <name>] [--ai-name <name>] [--only-user-inputs]
import { parseArgs } from "jsr:@std/cli@1.0.17/parse-args";

interface SafetySetting {
    category: string;
    threshold: string;
}

interface RunSettings {
    temperature: number;
    model: string;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    safetySettings: SafetySetting[];
    responseMimeType: string;
    enableCodeExecution: boolean;
    enableSearchAsATool: boolean;
    enableBrowseAsATool: boolean;
    enableAutoFunctionResponse: boolean;
}

interface Chunk {
    text: string;
    role: "user" | "model";
    tokenCount?: number;
    isThought?: boolean;
    finishReason?: string;
}

interface ChunkedPrompt {
    chunks: Chunk[];
    pendingInputs?: unknown[];
}

interface ChatHistory {
    runSettings: RunSettings;
    systemInstruction?: Record<string, unknown>;
    chunkedPrompt: ChunkedPrompt;
}

interface DisplayBlock {
    type: "user" | "ai";
    content: string[]; // 各行の文字列の配列
}

function formatChatHistoryToMarkdown(
    jsonDataString: string,
    withThoughts: boolean,
    userName: string,
    aiName: string,
    onlyUserInputs: boolean,
): string {
    const chatHistory: ChatHistory = JSON.parse(jsonDataString);
    const outputParts: string[] = [];

    if (onlyUserInputs) {
        outputParts.push("## ユーザー入力履歴\n\n");
        const userChunks = chatHistory.chunkedPrompt.chunks.filter((chunk) =>
            chunk.role === "user"
        );
        userChunks.forEach((chunk, index) => {
            outputParts.push(`${userName}:\n${chunk.text.trim()}`);
            if (index < userChunks.length - 1) {
                outputParts.push("\n\n---\n\n");
            } else {
                outputParts.push("\n\n"); // 最後の入力の後
            }
        });
        if (userChunks.length === 0) {
            outputParts.push("\n"); // 履歴がない場合、ヘッダーの後に改行
        }
    } else {
        outputParts.push("## 対話履歴\n\n");

        const displayBlocks: DisplayBlock[] = [];
        let currentAiBlockContent: string[] = [];
        let currentAiBlockHasThought = false;

        for (const chunk of chatHistory.chunkedPrompt.chunks) {
            if (chunk.role === "user") {
                // 現在処理中のAIブロックがあれば確定
                if (currentAiBlockContent.length > 0) {
                    displayBlocks.push({
                        type: "ai",
                        content: currentAiBlockContent,
                    });
                    currentAiBlockContent = [];
                    currentAiBlockHasThought = false;
                }

                if(chunk.text === undefined || chunk.text.trim() === "") {
                    // ユーザーの入力が空の場合はスキップ
                    continue;
                }

                // Userブロックを追加
                displayBlocks.push({
                    type: "user",
                    content: [`${userName}:\n${chunk.text.trim()}`],
                });
            } else if (chunk.role === "model") {
                if (chunk.isThought) {
                    if (withThoughts) {
                        currentAiBlockHasThought = true;
                        // 思考プロセスの開始前に改行が必要な場合 (例: AIの返答が先に来ていた場合)
                        if (
                            currentAiBlockContent.length > 0 &&
                            !currentAiBlockContent.at(-1)?.includes(
                                "</summary>",
                            )
                        ) {
                            currentAiBlockContent.push("");
                        }
                        currentAiBlockContent.push("<details>");
                        currentAiBlockContent.push(
                            "<summary>AIの思考プロセス</summary>",
                        );
                        currentAiBlockContent.push(""); // summaryと内容の間に空行
                        chunk.text.trim().split("\n").forEach((line) =>
                            currentAiBlockContent.push(line)
                        );
                        currentAiBlockContent.push("</details>");
                    }
                } else { // AIの実際の返答
                    // AIの返答前に改行が必要な場合 (例: 思考プロセスが先に来ていた場合)
                    if (
                        currentAiBlockContent.length > 0 &&
                        !currentAiBlockContent.at(-1)?.startsWith(aiName + ":")
                    ) {
                        currentAiBlockContent.push("");
                    }
                    currentAiBlockContent.push(
                        `${aiName}:\n${chunk.text.trim()}`,
                    );
                }
            }
        }
        // 最後のAIブロックが残っていれば追加
        if (currentAiBlockContent.length > 0) {
            displayBlocks.push({ type: "ai", content: currentAiBlockContent });
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
    outputParts.push(JSON.stringify(chatHistory.runSettings, null, 2));
    outputParts.push("\n```\n");

    return outputParts.join("");
}

async function main() {
    const flags = parseArgs(Deno.args, {
        boolean: ["with-thoughts", "only-user-inputs"],
        string: ["user-name", "ai-name"],
        default: {
            "with-thoughts": false,
            "only-user-inputs": false,
            "user-name": "User",
            "ai-name": "AI",
        },
        alias: {
            "t": "with-thoughts",
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
            "  -t, --with-thoughts         AIの思考プロセスを表示します",
        );
        console.error(
            "      --user-name <name>      ユーザー名を指定します (デフォルト: User)",
        );
        console.error(
            "      --ai-name <name>        AI名を指定します (デフォルト: AI)",
        );
        console.error(
            "      --ou, --only-user-inputs ユーザー入力のみを表示します",
        );
        Deno.exit(1);
    }

    const filePath = flags._[0] as string;
    const withThoughts = flags["with-thoughts"];
    const userName = flags["user-name"];
    const aiName = flags["ai-name"];
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
            withThoughts && !onlyUserInputs, // onlyUserInputs が true なら withThoughts は無効
            userName,
            aiName,
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
