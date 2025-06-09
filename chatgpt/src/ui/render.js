import { render as litRender } from 'https://cdn.jsdelivr.net/npm/lit-html@3.1.3/lit-html.js';

/**
 * lit-htmlのrender関数をラップし、指定されたコンテナにUIを描画します。
 * @param {import('https://cdn.jsdelivr.net/npm/lit-html@3.1.3/lit-html.js').TemplateResult | undefined} templateResult - レンダリングするlit-htmlテンプレート
 * @param {HTMLElement} container - 描画先のコンテナ要素
 */
export function render(templateResult, container) {
    litRender(templateResult, container);
}