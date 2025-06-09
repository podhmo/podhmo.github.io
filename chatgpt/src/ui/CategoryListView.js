import { h } from 'preact';
import { default as htm } from 'htm';
// import { render } from './render.js'; // No longer needed here

const html = htm.bind(h);

/**
 * カテゴリ一覧のVNodeを返します。
 * @param {import('../markdownParser.js').ParsedCategory[]} categories - カテゴリの配列
 * @param {import('../router.js').Router} router - ルーターインスタンス
 */
export function CategoryListView(categories, router) {
    if (!categories || categories.length === 0) {
        return html`<p>No categories found. Try loading a different Markdown source.</p>`;
    }

    return html`
        <h2>Categories</h2>
        ${categories.map(category => html`
            <article>
                <header>
                    <a href="/category/${encodeURIComponent(category.categoryName)}" onClick=${(e) => { e.preventDefault(); router.navigateTo(`/category/${encodeURIComponent(category.categoryName)}`); }}>
                        <h3>${category.categoryName}</h3>
                    </a>
                </header>
                ${category.description ? html`<p dangerouslySetInnerHTML=${{ __html: category.description.replace(/\n/g, '<br>') }}></p>` : null}
                 <small>${category.templates.length} template(s)</small>
            </article>
        `)}
    `;
}