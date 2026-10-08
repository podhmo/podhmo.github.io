import { h } from 'preact';
import { default as htm } from 'htm';
// import { render } from './render.js'; // No longer needed here

const html = htm.bind(h);

// 連続してファイルを選択した場合に後から選んだ方を優先するための世代番号
let targetFileReadSeq = 0;

/**
 * 選択されたテンプレートの詳細（説明、プロンプト本体、変数入力欄）のVNodeを返します。
 * @param {import('../markdownParser.js').ParsedTemplate} template - 表示するテンプレートのデータ
 * @param {import('../router.js').Router} router - ルーターインスタンス (for back navigation)
 * @param {import('../appState.js').AppState} appState - The application state.
 * @param {function} requestRender - Callback to request a re-render from parent (main.js)
 */
export function TemplateDetailView(template, router, appState, requestRender) {
    const extractPlaceholders = (text) => {
        const regex = /\{\{([^:}]+)(?::([^}]+))?\}\}/g;
        let match;
        const seenPlaceholders = new Map();
        while ((match = regex.exec(text)) !== null) {
            const name = match[1].trim();
            const defaultValue = match[2] ? match[2].trim() : null;
            if (!seenPlaceholders.has(name)) {
                seenPlaceholders.set(name, { name, defaultValue });
            }
        }
        return Array.from(seenPlaceholders.values());
    };

    const allPlaceholderObjects = [];
    const seenPlaceholderNames = new Set();

    template.prompts.forEach(prompt => {
        extractPlaceholders(prompt.body).forEach(phObj => {
            if (!seenPlaceholderNames.has(phObj.name)) {
                allPlaceholderObjects.push(phObj);
                seenPlaceholderNames.add(phObj.name);
            }
        });
    });
    const uniquePlaceholders = allPlaceholderObjects;
    const placeholderValues = appState.getVariableValues();

    uniquePlaceholders.forEach(phObj => {
        if (placeholderValues[phObj.name] === undefined) {
            const initialValue = phObj.defaultValue !== null ? phObj.defaultValue : '';
            appState.setVariableValue(phObj.name, initialValue);
        }
    });

    const updatePlaceholderValue = (placeholderName, value) => {
        appState.setVariableValue(placeholderName, value);
        if (requestRender) requestRender();
    };

    const copyToClipboard = async (text, buttonElement) => {
        try {
            await navigator.clipboard.writeText(text);
            buttonElement.textContent = 'Copied!';
            buttonElement.classList.add('secondary');
            setTimeout(() => {
                buttonElement.textContent = 'Copy';
                buttonElement.classList.remove('secondary');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            buttonElement.textContent = 'Failed!';
            buttonElement.classList.add('contrast');
            setTimeout(() => {
                buttonElement.textContent = 'Copy';
                buttonElement.classList.remove('contrast');
            }, 2000);
        }
    };

    // テンプレートの全ブロックを1つの指示文にまとめる。
    // ブロックが複数 (またはタイトル付き) なら Download と同じ <file name> 統合形式にする。
    const buildMergedInstruction = () => {
        const processedBodies = template.prompts.map(prompt => getProcessedPromptBody(prompt.body));
        if (template.prompts.length === 1 && !template.prompts[0].title) {
            return processedBodies[0];
        }
        const fileBlocks = template.prompts.map((prompt, index) => {
            const name = prompt.title || `part-${index + 1}`;
            return `<file name="${name}">\n${processedBodies[index]}\n</file>`;
        }).join('\n\n');
        return `以下の \`<file name="...">\` ブロックを、スキルのファイル一式（指示・参照資料・スクリプト）として解釈し、その指示に従ってください。\n\n${fileBlocks}`;
    };

    // Copy ボタンは画面に1個だけ: 生成した最終プロンプト全体をコピーする。
    const handleCopy = async (buttonElement) => {
        const title = document.getElementById('prompt-title').value;
        const targetText = document.getElementById('prompt-target-text').value;
        const isRaw = template.prompts.length === 1 && template.prompts[0].language.toLowerCase() === 'raw';
        const instruction = buildMergedInstruction();

        let finalPrompt;
        if (isRaw) {
            finalPrompt = instruction;
            if (targetText.trim() !== '') {
                finalPrompt += createTargetDocumentSection(targetText);
            }
        } else {
            finalPrompt = `${title ? `# ${title}\n\n` : ''}<details>
<summary>${template.templateName} のプロンプト詳細</summary>

**【指示】**
${instruction}

</details>`;
            finalPrompt += createTargetDocumentSection(targetText);
        }
        await copyToClipboard(finalPrompt, buttonElement);
    };

    // スマホのクリップボードサイズ制限を回避するため、ファイルから直接テキストを読み込む。
    // 読み込んだ内容は対象テキストの textarea (prompt-target-text) に流し込む。
    const handleTargetTextFileSelect = async (event) => {
        const fileInput = event.target;
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        const readSeq = ++targetFileReadSeq;
        const statusEl = document.getElementById('prompt-target-file-status');
        try {
            const text = await file.text();
            if (readSeq !== targetFileReadSeq) return; // 後から選択された方を優先
            document.getElementById('prompt-target-text').value = text;
            if (statusEl) statusEl.textContent = `読み込みました: ${file.name} (${text.length}文字)`;
        } catch (err) {
            console.error('Failed to read file:', err);
            // エラーをtextareaに書くとプロンプト本文に混入するため、ステータス表示に留める
            if (readSeq === targetFileReadSeq && statusEl) {
                statusEl.textContent = `読み込みに失敗しました: ${file.name}`;
            }
        } finally {
            // 同じファイルを続けて選択できるよう選択状態をリセットする
            fileInput.value = '';
        }
    };

    const buildDownloadFilename = () => {
        const sanitized = template.templateName.replace(/[\\/:*?"<>|]/g, '-').trim();
        return `${sanitized || 'prompt'}.md`;
    };

    const handleDownload = () => {
        // The downloaded file is a single self-contained prompt to hand to a
        // model: the merged prompt bodies plus the target text (if filled in),
        // without the chat-oriented decorations (title, <details> wrapper)
        // that the copy button adds on top of buildMergedInstruction().
        const targetText = document.getElementById('prompt-target-text').value;
        let content = buildMergedInstruction();

        // The empty-text branch of createTargetDocumentSection refers to the
        // conversation history, which is meaningless in a file — skip it.
        if (targetText.trim() !== '') {
            content += createTargetDocumentSection(targetText);
        }

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = buildDownloadFilename();
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
    };
    
    // Testable version of getProcessedPromptBody
    // Note: This function is being exported for testing purposes.
    const processPromptBodyForTesting = (originalBody, uniquePlaceholders, currentPlaceholderValues) => {
        let processedBody = originalBody;
        uniquePlaceholders.forEach(phObj => {
            const placeholderRegex = new RegExp(`\\{\\{${phObj.name}(?::[^}]+)?\\}\\}`, 'g');
            let valueToReplace = currentPlaceholderValues[phObj.name];
            let replacementText;

            if (valueToReplace === undefined) {
                replacementText = phObj.defaultValue !== null ? phObj.defaultValue : `{{${phObj.name}}}`;
            } else if (valueToReplace === '' && phObj.defaultValue !== null) {
                replacementText = phObj.defaultValue;
            } else if (valueToReplace === '' && phObj.defaultValue === null) {
                replacementText = `{{${phObj.name}}}`;
            } else {
                replacementText = valueToReplace;
            }
            processedBody = processedBody.replace(placeholderRegex, replacementText);
        });
        return processedBody;
    };

    const getProcessedPromptBody = (originalBody) => {
        // Calls the testable function with component's current state from appState
        return processPromptBodyForTesting(originalBody, uniquePlaceholders, appState.getVariableValues());
    };

    /**
     * Creates a Markdown code block that safely contains the given text,
     * preventing it from breaking the parent prompt structure.
     * It dynamically determines the number of backticks needed.
     * @param {string} text The text content to wrap.
     * @returns {string} The safely wrapped Markdown code block.
     */
    const createSafeDocumentContainer = (text) => {
        // Find all occurrences of 3 or more backticks
        const backtickSequences = text.match(/`{3,}/g) || [];

        // Find the length of the longest sequence
        const maxLength = backtickSequences.reduce((max, seq) => Math.max(max, seq.length), 0);

        // The fence needs to be one longer than the longest sequence found, with a minimum of 3 backticks.
        const fenceLength = Math.max(3, maxLength + 1);
        const fence = '`'.repeat(fenceLength);

        // Return the content wrapped in the dynamic fence
        return `${fence}markdown\n${text}\n${fence}`;
    };

    const createTargetDocumentSection = (targetText) => {
        const documentContent = targetText.trim();
        if (documentContent === '') {
            return `\n\n---\n\n今までの会話最初から最後までを元に、上記のプロンプトを実行してください。`;
        }

        const urlPattern = /^https?:\/\//;
        if (urlPattern.test(targetText)) {
            const documentHeader = '入力テキストは以下のURLです。\n';
            return `\n\n---\n\n${documentHeader}\n${documentContent}`;
        } else {
            const documentHeader = '入力テキストは以下です。\n';
            return `\n\n---\n\n${documentHeader}\n${createSafeDocumentContainer(documentContent)}`;
        }
    };

    const templateDetailContent = () => html`
        <article>
            <header>
                <h3>${template.templateName}</h3>
            </header>
            ${template.description ? html`<section dangerouslySetInnerHTML=${{ __html: template.description.replace(/\n/g, '<br>') }}></section>` : null}

            ${uniquePlaceholders.length > 0 ? html`
                <section>
                    <h4>Variables:</h4>
                    ${uniquePlaceholders.map(phObj => html`
                        <label for="ph-${phObj.name}">${phObj.name}:</label>
                        <textarea
                            id="ph-${phObj.name}"
                            name="${phObj.name}"
                            value=${appState.getVariableValues()[phObj.name]}
                            onInput=${(e) => updatePlaceholderValue(phObj.name, e.target.value)}
                            placeholder=${phObj.defaultValue ? `Default: ${phObj.defaultValue}` : `Enter value for ${phObj.name}`}
                            rows="2"
                        ></textarea>
                    `)}
                </section>
            ` : null}

            <section>
                <h4>生成:</h4>
                <label for="prompt-title">タイトル</label>
                <input type="text" id="prompt-title" name="prompt-title" placeholder="Enter a title for the final prompt..." />
                <label for="prompt-target-text">対象テキストまたはURL</label>
                <div class="prompt-block">
                    <textarea
                        id="prompt-target-text"
                        name="prompt-target-text"
                        placeholder="Enter target text, a URL, or leave blank for chat history..."
                    ></textarea>
                    <button
                        type="button"
                        class="copy-button"
                        title="生成した最終プロンプトをコピー"
                        onClick=${async (e) => await handleCopy(e.target)}>
                        Copy
                    </button>
                </div>
                <small>またはファイルから読み込む（大きなテキスト用）</small>
                <input
                    type="file"
                    id="prompt-target-file"
                    name="prompt-target-file"
                    accept="text/*,.md,.txt"
                    onChange=${handleTargetTextFileSelect}
                />
                <small id="prompt-target-file-status" aria-live="polite"></small>
                <button
                    type="button"
                    title=${template.prompts.length > 1
                        ? `${template.prompts.length}個のプロンプトを1つのファイルに合成してダウンロード`
                        : 'プロンプトをファイルとしてダウンロード'}
                    onClick=${handleDownload}>
                    Download (.md)
                </button>
            </section>

            <h4>Prompt Template(s):</h4>
            ${template.prompts.map((prompt, index) => {
                const processedBody = getProcessedPromptBody(prompt.body);
                return html`
                    ${(prompt.language || prompt.title) ? html`<small>${prompt.language}${prompt.title ? ` — ${prompt.title}` : ''}</small>` : null}
                    <pre><code>${processedBody}</code></pre>
                    ${index < template.prompts.length - 1 ? html`<hr />` : null}
                `;
            })}
            
            <footer>
                <a href="#/category/${encodeURIComponent(template.categoryName)}" 
                   onClick=${(e) => {
                       e.preventDefault();
                       if (router) {
                           router.navigateTo(`/category/${encodeURIComponent(template.categoryName)}`);
                       } else {
                           window.location.hash = `/category/${encodeURIComponent(template.categoryName)}`;
                       }
                   }}>
                   Back to ${template.categoryName}
                </a>
            </footer>
        </article>
    `;
    return templateDetailContent(); // Return the VNode
}
