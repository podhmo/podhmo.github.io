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
            ${template.description ? html`<section class="description" dangerouslySetInnerHTML=${{ __html: template.description.replace(/\n/g, '<br>') }}></section>` : null}
            
            ${uniquePlaceholders.length > 0 ? html`
                <section class="placeholders">
                    <h4>Variables:</h4>
                    ${uniquePlaceholders.map(ph => html`
                        <div class="placeholder-input">
                            <label for="ph-${ph}">${ph}:</label>
                            <textarea
                                id="ph-${ph}"
                                name="${ph}"
                                value=${placeholderValues[ph]}
                                onInput=${(e) => updatePlaceholderValue(ph, e.target.value)}
                                placeholder="Enter value for ${ph}"
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