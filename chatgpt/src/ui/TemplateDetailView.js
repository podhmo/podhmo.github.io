import { html, nothing } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { render } from './render.js';

/**
 * 選択されたテンプレートの詳細（説明、プロンプト本体、変数入力欄）を表示します。
 * @param {import('../markdownParser.js').ParsedTemplate} template - 表示するテンプレートのデータ
 * @param {HTMLElement} container - 表示するコンテナ要素
 */
export function renderTemplateDetail(template, container) {
    let placeholderValues = {};

    const extractPlaceholders = (text) => {
        const regex = /\{\{([^}]+)\}\}/g;
        let match;
        const placeholders = new Set();
        while ((match = regex.exec(text)) !== null) {
            placeholders.add(match[1].trim());
        }
        return Array.from(placeholders);
    };

    // 全プロンプトボディからプレースホルダーを収集
    const allPlaceholders = new Set();
    template.prompts.forEach(prompt => {
        extractPlaceholders(prompt.body).forEach(ph => allPlaceholders.add(ph));
    });
    const uniquePlaceholders = Array.from(allPlaceholders);

    uniquePlaceholders.forEach(ph => placeholderValues[ph] = '');

    const updatePlaceholderValue = (placeholderName, value) => {
        placeholderValues[placeholderName] = value;
        // Re-render might be too much here, but simplest for now.
        // A more optimized way would be to just update the previewed text.
        render(templateDetailContent(), container);
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
    
    const getProcessedPromptBody = (originalBody) => {
        let processedBody = originalBody;
        for (const ph in placeholderValues) {
            const regex = new RegExp(`\\{\\{${ph}\\}\\}`, 'g');
            processedBody = processedBody.replace(regex, placeholderValues[ph] || `{{${ph}}}`); // Keep placeholder if value is empty
        }
        return processedBody;
    };

    const templateDetailContent = () => html`
        <article>
            <header>
                <h3>${template.templateName}</h3>
            </header>
            ${template.description ? html`<section class="description">${unsafeHTML(template.description.replace(/\n/g, '<br>'))}</section>` : nothing}
            
            ${uniquePlaceholders.length > 0 ? html`
                <section class="placeholders">
                    <h4>Variables:</h4>
                    ${uniquePlaceholders.map(ph => html`
                        <div class="placeholder-input">
                            <label for="ph-${ph}">${ph}:</label>
                            <textarea
                                id="ph-${ph}"
                                name="${ph}"
                                .value=${placeholderValues[ph]}
                                @input=${(e) => updatePlaceholderValue(ph, e.target.value)}
                                placeholder="Enter value for ${ph}"
                                rows="3"
                                style="width:100%"
                            ></textarea>
                        </div>
                    `)}
                </section>
            ` : nothing}

            <h4>Prompt Template(s):</h4>
            ${template.prompts.map((prompt, index) => html`
                <div class="template-body-container">
                    ${prompt.language ? html`<small>Language: ${prompt.language}</small>` : nothing}
                    <button 
                        class="copy-button outline"
                        @click=${(e) => copyToClipboard(getProcessedPromptBody(prompt.body), e.target)}>
                        Copy
                    </button>
                    <pre><code>${getProcessedPromptBody(prompt.body)}</code></pre>
                </div>
                ${index < template.prompts.length - 1 ? html`<hr>` : nothing}
            `)}
            
            <footer>
                <a href="/category/${encodeURIComponent(template.categoryName)}" 
                   @click=${(e) => { 
                       e.preventDefault(); 
                       // This requires access to the router instance from main.js
                       // For now, using history API directly and dispatching event
                       window.history.pushState({}, '', `/category/${encodeURIComponent(template.categoryName)}`);
                       window.dispatchEvent(new PopStateEvent('popstate'));
                   }}>
                   Back to ${template.categoryName}
                </a>
            </footer>
        </article>
    `;
    render(templateDetailContent(), container);
}