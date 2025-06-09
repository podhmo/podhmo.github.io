import { html } from 'lit-html';
import { render } from './render.js';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

/**
 * 特定のカテゴリに属するテンプレートの一覧を表示します。
 * @param {import('../markdownParser.js').ParsedCategory} category - 表示するカテゴリのデータ
 * @param {HTMLElement} container - 表示するコンテナ要素
 * @param {import('../router.js').Router} router - ルーターインスタンス
 */
export function renderTemplateList(category, container, router) {
    if (!category || !category.templates || category.templates.length === 0) {
        render(html`<p>No templates found in this category.</p><a href="/">Back to Categories</a>`, container);
        return;
    }

    const templateList = html`
        <h2>Templates in ${category.categoryName}</h2>
        ${category.templates.map(template => html`
            <article>
                <header>
                    <a href="/category/${encodeURIComponent(category.categoryName)}/template/${encodeURIComponent(template.templateName)}" 
                       @click=${(e) => { e.preventDefault(); router.navigateTo(`/category/${encodeURIComponent(category.categoryName)}/template/${encodeURIComponent(template.templateName)}`); }}>
                        <h4>${template.templateName}</h4>
                    </a>
                </header>
                ${template.description ? html`<p>${unsafeHTML(template.description.replace(/\n/g, '<br>'))}</p>` : ''}
            </article>
        `)}
        <p><a href="/" @click=${(e) => { e.preventDefault(); router.navigateTo('/'); }}>Back to Categories</a></p>
    `;
    render(templateList, container);
}