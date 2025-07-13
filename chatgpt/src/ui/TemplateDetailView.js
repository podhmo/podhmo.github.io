import { h } from 'preact';
import { default as htm } from 'htm';
// import { render } from './render.js'; // No longer needed here

const html = htm.bind(h);

/**
 * 選択されたテンプレートの詳細（説明、プロンプト本体、変数入力欄）のVNodeを返します。
 * @param {import('../markdownParser.js').ParsedTemplate} template - 表示するテンプレートのデータ
 * @param {import('../router.js').Router} router - ルーターインスタンス (for back navigation)
 * @param {function} requestRender - Callback to request a re-render from parent (main.js)
 */
export function TemplateDetailView(template, router, requestRender) {
    let placeholderValues = {};

    const extractPlaceholders = (text) => {
        const regex = /\{\{([^:}]+)(?::([^}]+))?\}\}/g; // Updated regex
        let match;
        const placeholders = [];
        // Use a Map to ensure uniqueness by name, storing the first encountered defaultValue
        const seenPlaceholders = new Map();
        while ((match = regex.exec(text)) !== null) {
            const name = match[1].trim();
            const defaultValue = match[2] ? match[2].trim() : null;
            if (!seenPlaceholders.has(name)) {
                seenPlaceholders.set(name, { name, defaultValue });
            }
        }
        // Convert Map values to an array
        return Array.from(seenPlaceholders.values());
    };

    // 全プロンプトボディからプレースホルダーを収集
    // Store placeholder objects (name, defaultValue)
    const allPlaceholderObjects = [];
    const seenPlaceholderNames = new Set(); // To ensure unique placeholder names across all prompts

    template.prompts.forEach(prompt => {
        extractPlaceholders(prompt.body).forEach(phObj => {
            if (!seenPlaceholderNames.has(phObj.name)) {
                allPlaceholderObjects.push(phObj);
                seenPlaceholderNames.add(phObj.name);
            }
        });
    });
    const uniquePlaceholders = allPlaceholderObjects; // This now holds objects

    // Initialize placeholderValues using defaultValues if present
    uniquePlaceholders.forEach(phObj => {
        placeholderValues[phObj.name] = phObj.defaultValue !== null ? phObj.defaultValue : '';
    });

    const updatePlaceholderValue = (placeholderName, value) => {
        placeholderValues[placeholderName] = value;
        // Request a re-render from the main application logic
        // This is a common pattern when state is managed outside the component
        if (requestRender) requestRender();
    };

    const copyToClipboard = async (instruction, buttonElement) => {
        const title = document.getElementById('prompt-title').value;
        const targetText = document.getElementById('prompt-target-text').value;

        // Base prompt structure
        let finalPrompt = `${title ? `# ${title}\n\n` : ''}<details>
<summary>プロンプト詳細（クリックで展開）</summary>

**【指示】**
${instruction}

</details>`;

        // Append the target document section using the helper function
        finalPrompt += createTargetDocumentSection(targetText);

        // Copy to clipboard
        try {
            await navigator.clipboard.writeText(finalPrompt);
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
    
    // Testable version of getProcessedPromptBody
    // Note: This function is being exported for testing purposes.
    const processPromptBodyForTesting = (originalBody, uniquePlaceholders, placeholderValues) => {
        let processedBody = originalBody;
        uniquePlaceholders.forEach(phObj => {
            const placeholderRegex = new RegExp(`\\{\\{${phObj.name}(?::[^}]+)?\\}\\}`, 'g');
            let valueToReplace = placeholderValues[phObj.name];
            if (valueToReplace === undefined) { // Should not happen if initialized correctly
                valueToReplace = phObj.defaultValue !== null ? phObj.defaultValue : `{{${phObj.name}}}`;
            } else if (valueToReplace === '' && phObj.defaultValue !== null) {
                valueToReplace = phObj.defaultValue;
            } else if (valueToReplace === '' && phObj.defaultValue === null) {
                // Task: "Keep placeholder if value is empty" - this was in old code.
                // For new logic: if value is empty and no default, it means user wants it empty, or it was empty initially.
                // The prompt asks for {{name}} to be output if value is empty and no default.
                 valueToReplace = `{{${phObj.name}}}`;
            }
            processedBody = processedBody.replace(placeholderRegex, valueToReplace);
        });
        return processedBody;
    };

    const getProcessedPromptBody = (originalBody) => {
        // Calls the testable function with component's current state
        return processPromptBodyForTesting(originalBody, uniquePlaceholders, placeholderValues);
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
        if (targetText.trim() === '') {
            return `\n\n---\n\n今までの会話を元に、上記のプロンプトを実行してください。`;
        }

        const urlPattern = /^https?:\/\//;
        let documentHeader = '';
        let documentContent = '';

        if (urlPattern.test(targetText)) {
            documentHeader = '入力テキストは以下のURLです。';
            documentContent = targetText;
        } else {
            documentHeader = '入力テキストは以下です。';
            documentContent = targetText;
        }

        const safe_document_container = createSafeDocumentContainer(documentContent);
        return `\n\n---\n\n${documentHeader}\n${safe_document_container}`;
    };

    const templateDetailContent = () => html`
        <article>
            <header>
                <h3>${template.templateName}</h3>
            </header>
            ${template.description ? html`<section class="description" dangerouslySetInnerHTML=${{ __html: template.description.replace(/\n/g, '<br>') }}></section>` : null}

            <section class="generation-controls">
                <div class="form-group">
                    <label for="prompt-title">Optional Title</label>
                    <input type="text" id="prompt-title" name="prompt-title" placeholder="Enter a title for the final prompt..." />
                </div>
                <div class="form-group">
                    <label for="prompt-target-text">Target Document</label>
                    <input
                        id="prompt-target-text"
                        name="prompt-target-text"
                        type="text"
                        placeholder="Enter target text, a URL, or leave blank for chat history..."
                    ></input>
                </div>
            </section>
            
            ${uniquePlaceholders.length > 0 ? html`
                <section class="placeholders">
                    <h4>Variables:</h4>
                    ${uniquePlaceholders.map(phObj => html`
                        <div class="placeholder-input">
                            <label for="ph-${phObj.name}">${phObj.name}:</label>
                            <textarea
                                id="ph-${phObj.name}"
                                name="${phObj.name}"
                                value=${placeholderValues[phObj.name]}
                                onInput=${(e) => updatePlaceholderValue(phObj.name, e.target.value)}
                                placeholder=${phObj.defaultValue ? `Default: ${phObj.defaultValue}` : `Enter value for ${phObj.name}`}
                                rows="2"
                            ></textarea>
                        </div>
                    `)}
                </section>
            ` : null}

            <h4>Prompt Template(s):</h4>
            ${template.prompts.map((prompt, index) => html`
                <div class="template-body-container">
                    ${prompt.language ? html`<small>Language: ${prompt.language}</small>` : null}
                    <button
                        class="copy-button outline"
                        onClick=${(e) => copyToClipboard(getProcessedPromptBody(prompt.body), e.target)}>
                        Copy
                    </button>
                    <pre><code>${getProcessedPromptBody(prompt.body)}</code></pre>
                </div>
                ${index < template.prompts.length - 1 ? html`<hr />` : null}
            `)}
            
            <footer>
                <a href="/category/${encodeURIComponent(template.categoryName)}" 
                   onClick=${(e) => {
                       e.preventDefault();
                       if (router) {
                           router.navigateTo(`/category/${encodeURIComponent(template.categoryName)}`);
                       } else {
                           window.history.pushState({}, '', `/category/${encodeURIComponent(template.categoryName)}`);
                           window.dispatchEvent(new PopStateEvent('popstate'));
                       }
                   }}>
                   Back to ${template.categoryName}
                </a>
            </footer>
        </article>
    `;
    return templateDetailContent(); // Return the VNode
}
