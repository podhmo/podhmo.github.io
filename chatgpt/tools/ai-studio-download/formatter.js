/**
 * チャット履歴をMarkdown形式にフォーマットする関数
 * @param {object} chatHistory - チャット履歴オブジェクト
 * @param {object} options - Markdown変換オプション
 * @returns {string} - フォーマットされたMarkdown文字列
 */
export function formatChatHistoryToMarkdown(
    chatHistory,
    options = {}
) {
    const {
        userName = 'ユーザー',
        aiName = 'AI',
    } = options;

    const outputParts = [];
    outputParts.push("## 対話履歴\n\n");

    const displayBlocks = [];
    let currentAiBlockContent = [];

    for (const chunk of chatHistory.chunkedPrompt.chunks) {
        if (chunk.role === "user") {
            if (currentAiBlockContent.length > 0) {
                displayBlocks.push({ type: "model", content: currentAiBlockContent });
                currentAiBlockContent = [];
            }
            if(chunk.text && chunk.text.trim() !== "") {
                displayBlocks.push({
                    type: "user",
                    content: [`${userName}:\n${chunk.text.trim()}`],
                });
            }
        } else if (chunk.role === "model" && chunk.text) {
             let processedText = '';
             let inCodeBlock = false;
             let i = 0;
             while (i < chunk.text.length) {
                 const remaining = chunk.text.substring(i);
                 const match = remaining.match(/^`{3,}/);
                 if (match) {
                     const backticks = match[0];
                     processedText += backticks;
                     i += backticks.length;
                     inCodeBlock = !inCodeBlock;
                     if (!inCodeBlock && i < chunk.text.length && chunk.text[i] !== '\n') {
                         processedText += '\n';
                     }
                 } else {
                     processedText += chunk.text[i];
                     i++;
                 }
             }
             currentAiBlockContent.push(
                 `${aiName}:\n${processedText}`,
             );
        }
    }
    if (currentAiBlockContent.length > 0) {
        displayBlocks.push({ type: "model", content: currentAiBlockContent });
    }

    displayBlocks.forEach((block, index) => {
        outputParts.push(block.content.join("\n"));
        if (index < displayBlocks.length - 1) {
            outputParts.push("\n\n---\n\n");
        } else {
            outputParts.push("\n\n");
        }
    });

    return outputParts.join("");
}
