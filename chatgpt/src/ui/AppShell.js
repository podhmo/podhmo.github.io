import { h } from 'preact';
import { default as htm } from 'htm';
// import { render } from './render.js'; // No longer needed here

const html = htm.bind(h);

/**
 * アプリケーションシェルのパンくずリスト部分のVNodeを返します。
 * @param {import('../appState.js').AppState} appState - アプリケーションの状態
 * @param {import('../router.js').Router} router - ルーターインスタンス (for navigation)
 */
export function AppShell(appState, router) { // Renamed for clarity, pass router if needed or use global/event
    const breadcrumbs = appState.getBreadcrumbs();
    const handleNav = (event, path) => {
        event.preventDefault();
        // If router is not passed, this relies on global router or dispatches event for main.js
        if (router) {
            router.navigateTo(path);
        } else {
            window.location.hash = path;
        }
    };

    return html`
        <nav aria-label="breadcrumb">
            <ul>
                ${breadcrumbs.map((crumb, index) => html`
                    <li>
                        ${index === breadcrumbs.length - 1
                            ? html`<span aria-current="page">${crumb.name}</span>`
                            : html`<a href="#${crumb.path}" onClick=${(e) => handleNav(e, crumb.path)}>${crumb.name}</a>`
                        }
                    </li>
                `)}
            </ul>
        </nav>
    `;
}
// Original handleNav is now part of the component or passed, or global.
// For this refactor, assuming it's fine as is if router is not passed,
// or it will be adapted in main.js by passing the router.
// For now, the internal handleNav uses window.history and dispatches event.