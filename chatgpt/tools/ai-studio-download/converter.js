/**
 * Markdown変換オプションの型定義 (JSDoc用)
 * @typedef {Object} MarkdownConversionOptions
 * @property {boolean} [withThoughts=false] - 思考プロセスを含めるかどうか
 * @property {string} [userName='ユーザー'] - ユーザーとして表示する名前
 * @property {string} [aiName='AI'] - AIとして表示する名前
 * @property {boolean} [onlyUserInputs=false] - ユーザーの入力のみを表示するかどうか
 */


/**
 * チャット履歴をMarkdown形式にフォーマットする関数
 * @param {object} chatHistory - チャット履歴オブジェクト
 * @param {MarkdownConversionOptions} options - Markdown変換オプション
 * @returns {string} - フォーマットされたMarkdown文字列
 */
export function formatChatHistoryToMarkdown(
    chatHistory,
    options = {} // デフォルト値として空オブジェクトを指定
) {
    // オプションのデフォルト値を設定
    const {
        withThoughts = false,
        userName = 'ユーザー',
        aiName = 'AI',
        onlyUserInputs = false,
    } = options;

    let mainContent = "";

    if (onlyUserInputs) {
        const userChunks = chatHistory.chunkedPrompt.chunks
            .filter(chunk => chunk.role === "user" && chunk.text && chunk.text.trim() !== "")
            .map(chunk => `${userName}:\n${chunk.text.trim()}`);

        mainContent = "## ユーザー入力履歴\n\n" + userChunks.join("\n\n---\n\n");
        if (userChunks.length > 0) {
            mainContent += "\n\n";
        } else {
            mainContent += "\n";
        }

    } else {
        const displayBlocks = [];
        let currentAiBlockContent = [];

        for (const chunk of chatHistory.chunkedPrompt.chunks) {
            if (chunk.role === "user") {
                if (currentAiBlockContent.length > 0) {
                    displayBlocks.push(currentAiBlockContent.join("\n"));
                    currentAiBlockContent = [];
                }
                if (chunk.text && chunk.text.trim() !== "") {
                    displayBlocks.push(`${userName}:\n${chunk.text.trim()}`);
                }
            } else if (chunk.role === "model") {
                if (chunk.isThought) {
                    if (withThoughts) {
                        let thoughtContent = "<details>\n<summary>AIの思考プロセス</summary>\n\n";
                        thoughtContent += chunk.text.trim();
                        thoughtContent += "\n</details>";
                        if (chunk.finishReason) {
                            thoughtContent += `\n(思考終了理由: ${chunk.finishReason})`;
                        }
                        currentAiBlockContent.push(thoughtContent);
                    }
                } else {
                    let content = chunk.text.trimEnd();
                    if (content.endsWith('```') && !content.endsWith('\n```')) {
                        content += '\n';
                    }
                    if (currentAiBlockContent.length === 0 || !currentAiBlockContent.at(-1)?.startsWith(`${aiName}:`)) {
                        currentAiBlockContent.push(`${aiName}:`);
                    }
                    currentAiBlockContent.push(content);

                    if (chunk.finishReason) {
                        currentAiBlockContent.push(`\n(返答終了理由: ${chunk.finishReason})`);
                    }
                }
            }
        }

        if (currentAiBlockContent.length > 0) {
            displayBlocks.push(currentAiBlockContent.join("\n"));
        }

        mainContent = "## 対話履歴\n\n" + displayBlocks.join("\n\n---\n\n");
        if (displayBlocks.length > 0) {
            mainContent += "\n\n";
        } else {
            mainContent += "\n";
        }
    }

    // メタデータの追加
    const metadata = {
        runSettings: chatHistory.runSettings,
        systemInstruction: chatHistory.systemInstruction || null,
    };
    const metadataString = "## メタデータ\n\n```json\n" + JSON.stringify(metadata, null, 2) + "\n```\n";

    return mainContent + metadataString;
}
