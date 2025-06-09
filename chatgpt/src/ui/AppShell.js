import { h } from 'preact';
import { default as htm } from 'htm';
import { render } from './render.js';

const html = htm.bind(h);

/**
 * アプリケーションシェルのパンくずリスト部分をレンダリングします。
 * @param {import('../appState.js').AppState} appState - アプリケーションの状態
 * @param {HTMLElement} breadcrumbsContainer - パンくずリストを描画するコンテナ要素
 */
export function renderAppShell(appState, breadcrumbsContainer) {
    const breadcrumbs = appState.getBreadcrumbs();
    const breadcrumbLinks = html`
        <nav aria-label="breadcrumb">
            <ul>
                ${breadcrumbs.map((crumb, index) => html`
                    <li>
                        ${index === breadcrumbs.length - 1
                            ? html`<span aria-current="page">${crumb.name}</span>`
                            : html`<a href="${crumb.path}" onClick=${(e) => handleNav(e, crumb.path)}>${crumb.name}</a>`
                        }
                    </li>
                `)}
            </ul>
        </nav>
    `;
    render(breadcrumbLinks, breadcrumbsContainer);
}

// Separate navigation handling function to keep the template cleaner
function handleNav(event, path) {
    event.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate')); // routerに通知
}