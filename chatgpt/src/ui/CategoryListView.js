import { html } from 'lit-html';
import { render } from './render.js';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

/**
 * カテゴリ一覧を表示します。
 * @param {import('../markdownParser.js').ParsedCategory[]} categories - カテゴリの配列
 * @param {HTMLElement} container - 表示するコンテナ要素
 * @param {import('../router.js').Router} router - ルーターインスタンス
 */
export function renderCategoryList(categories, container, router) {
    if (!categories || categories.length === 0) {
        render(html`<p>No categories found. Try loading a different Markdown source.</p>`, container);
        return;
    }

    const categoryList = html`
        <h2>Categories</h2>
        ${categories.map(category => html`
            <article>
                <header>
                    <a href="/category/${encodeURIComponent(category.categoryName)}" @click=${(e) => { e.preventDefault(); router.navigateTo(`/category/${encodeURIComponent(category.categoryName)}`); }}>
                        <h3>${category.categoryName}</h3>
                    </a>
                </header>
                ${category.description ? html`<p>${unsafeHTML(category.description.replace(/\n/g, '<br>'))}</p>` : ''}
                 <small>${category.templates.length} template(s)</small>
            </article>
        `)}
    `;
    render(categoryList, container);
}