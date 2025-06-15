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

    const copyToClipboard = async (text, buttonElement) => {
        try {
            await navigator.clipboard.writeText(text);
            buttonElement.textContent = 'Copied!';
            buttonElement.classList.add('secondary'); // PicoCSS success style
            setTimeout(() => {
                buttonElement.textContent = 'Copy';
                buttonElement.classList.remove('secondary');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            buttonElement.textContent = 'Failed!';
            buttonElement.classList.add('contrast'); // PicoCSS error style
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

    const templateDetailContent = () => html`
        <article>
            <header>
                <h3>${template.templateName}</h3>
            </header>
            ${template.description ? html`<section class="description" dangerouslySetInnerHTML=${{ __html: template.description.replace(/\n/g, '<br>') }}></section>` : null}
            
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
                                placeholder=${phObj.defaultValue ? `Enter value for ${phObj.name} (default: ${phObj.defaultValue})` : `Enter value for ${phObj.name}`}
                                rows="3"
                                style="width:100%"
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
