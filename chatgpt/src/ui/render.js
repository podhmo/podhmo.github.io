import { render as preactRender, h } from 'preact';

/**
 * Preactのrender関数をラップし、指定されたコンテナにUIを描画します。
 * @param {import('preact').VNode | undefined} vnode - レンダリングするPreact VNode
 * @param {HTMLElement} container - 描画先のコンテナ要素
 */
export function render(vnode, container) {
    preactRender(vnode, container);
}