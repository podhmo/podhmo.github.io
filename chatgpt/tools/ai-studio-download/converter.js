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
    const chunks = chatHistory.chunkedPrompt.chunks.filter(c => c.text && c.text.trim());

    if (onlyUserInputs) {
        const userChunks = chunks.filter(chunk => chunk.role === "user");
        mainContent = "## ユーザー入力履歴\n\n" + userChunks.map(c => `${userName}: ${c.text.trim()}`).join("\n\n---\n\n");

    } else {
        const conversationParts = [];
        let currentModelParts = [];

        for (const chunk of chunks) {
            if (chunk.role === 'user') {
                if (currentModelParts.length > 0) {
                    conversationParts.push(`${aiName}:\n${currentModelParts.join('\n')}`);
                    currentModelParts = [];
                }
                conversationParts.push(`${userName}: ${chunk.text.trim()}`);
            } else if (chunk.role === 'model') {
                if (chunk.isThought) {
                    if (withThoughts) {
                        currentModelParts.push(`<details>\n<summary>AIの思考プロセス</summary>\n\n${chunk.text.trim()}\n</details>`);
                    }
                } else {
                    let text = chunk.text.trimEnd();
                    currentModelParts.push(text);
                }
            }
        }
        if (currentModelParts.length > 0) {
            conversationParts.push(`${aiName}:\n${currentModelParts.join('\n')}`);
        }
        mainContent = "## 対話履歴\n\n" + conversationParts.join("\n\n---\n\n");
    }

    // メタデータの追加
    const metadata = {
        runSettings: chatHistory.runSettings,
        systemInstruction: chatHistory.systemInstruction || null,
    };
    const metadataString = "\n\n## メタデータ\n\n```json\n" + JSON.stringify(metadata, null, 2) + "\n```\n";

    return mainContent + "\n" + metadataString;
}
