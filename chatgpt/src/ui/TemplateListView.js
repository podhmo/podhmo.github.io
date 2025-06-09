import { h } from 'preact';
import { default as htm } from 'htm';
import { render } from './render.js';

const html = htm.bind(h);

/**
 * 特定のカテゴリに属するテンプレートの一覧を表示します。
 * @param {import('../markdownParser.js').ParsedCategory} category - 表示するカテゴリのデータ
 * @param {HTMLElement} container - 表示するコンテナ要素
 * @param {import('../router.js').Router} router - ルーターインスタンス
 */
export function renderTemplateList(category, container, router) {
    if (!category || !category.templates || category.templates.length === 0) {
        render(html`<p>No templates found in this category.</p><a href="/" onClick=${(e) => { e.preventDefault(); router.navigateTo('/'); }}>Back to Categories</a>`, container);
        return;
    }

    const templateList = html`
        <h2>Templates in ${category.categoryName}</h2>
        ${category.templates.map(template => html`
            <article>
                <header>
                    <a href="/category/${encodeURIComponent(category.categoryName)}/template/${encodeURIComponent(template.templateName)}" 
                       onClick=${(e) => { e.preventDefault(); router.navigateTo(`/category/${encodeURIComponent(category.categoryName)}/template/${encodeURIComponent(template.templateName)}`); }}>
                        <h4>${template.templateName}</h4>
                    </a>
                </header>
                ${template.description ? html`<p dangerouslySetInnerHTML=${{ __html: template.description.replace(/\n/g, '<br>') }}></p>` : null}
            </article>
        `)}
        <p><a href="/" onClick=${(e) => { e.preventDefault(); router.navigateTo('/'); }}>Back to Categories</a></p>
    `;
    render(templateList, container);
}