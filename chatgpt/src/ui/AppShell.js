import { html } from 'lit-html';
import { render } from './render.js';

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
                            : html`<a href="${crumb.path}">${crumb.name}</a>`
                        }
                    </li>
                `)}
            </ul>
        </nav>
    `;
    render(breadcrumbLinks, breadcrumbsContainer);

    // クリックイベントをコンテナに委任 (PicoCSSのbreadcrumbは<a>タグになる)
    breadcrumbsContainer.querySelectorAll('a[href^="/"]').forEach(link => {
        link.onclick = (event) => {
            event.preventDefault();
            // main.js の router インスタンスにアクセスする方法が必要。
            // ここでは単純化のため window.history を直接使うか、
            // もしくは router インスタンスを渡す必要がある。
            // 今回は main.js で router を初期化しているので、グローバルな router インスタンスに依存するか、
            // イベントを発行して main.js で処理するなどの方法がある。
            // ここでは簡易的に history API を直接叩くが、実際のアプリでは router.navigateTo を呼び出すべき。
            window.history.pushState({}, '', link.getAttribute('href'));
            window.dispatchEvent(new PopStateEvent('popstate')); // routerに通知
        };
    });
}