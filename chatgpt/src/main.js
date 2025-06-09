import { h } from 'preact';
import { default as htm } from 'htm';
import { Router } from './router.js';
import { parseMarkdown } from './markdownParser.js';
import { fetchData, getSourceUrlFromQuery } from './dataProvider.js';
import { AppState } from './appState.js';
import { AppShell } from './ui/AppShell.js';
import { CategoryListView } from './ui/CategoryListView.js';
import { TemplateListView } from './ui/TemplateListView.js';
import { TemplateDetailView } from './ui/TemplateDetailView.js';
import { render } from './ui/render.js';
import { AppRootComponent } from './ui/AppRootComponent.js';

const html = htm.bind(h);
// const contentArea = document.getElementById('content-area'); // Removed
// const breadcrumbsArea = document.getElementById('breadcrumbs'); // Removed
// const sourceUrlInput = document.getElementById('sourceUrlInput'); // Removed
// const loadSourceUrlButton = document.getElementById('loadSourceUrlButton'); // Removed

/**
 * @typedef {import('./markdownParser.js').ParsedCategory} ParsedCategory
 * @typedef {import('./markdownParser.js').ParsedTemplate} ParsedTemplate
 * @typedef {import('./markdownParser.js').ParsedPrompt} ParsedPrompt
 */

/**
 * メインアプリケーションクラス
 */
class App {
    /**
     * @param {HTMLElement} appRootEl - The root element to render the application into.
     * @param {string} basePath - ルーティングのベースパス
     */
    constructor(appRootEl, basePath = '') {
        this.appRootEl = appRootEl;
        this.appState = new AppState();
        this.router = new Router(basePath);
        this.currentBreadcrumbsVNode = null;
        this.currentMainContentVNode = html`<p>Initializing...</p>`; // Initial content
        this.setupRoutes();
        // setupEventListeners is effectively replaced by passing handleLoadSourceUrl to AppRootComponent
    }

    handleLoadSourceUrl(url) {
        if (url) {
            const newUrl = new URL(globalThis.location.href);
            newUrl.searchParams.set('source', url);
            globalThis.location.href = newUrl.toString();
        }
    }

    renderUI() {
        const currentSourceUrl = getSourceUrlFromQuery() || "https://raw.githubusercontent.com/podhmo/podhmo.github.io/refs/heads/master/chatgpt/Template.md";
        render(
            html`
                <${AppRootComponent}
                    breadcrumbsVNode=${this.currentBreadcrumbsVNode}
                    mainContentView=${this.currentMainContentVNode}
                    currentSourceUrl=${currentSourceUrl}
                    onLoadSourceUrl=${this.handleLoadSourceUrl.bind(this)}
                />
            `,
            this.appRootEl
        );
    }

    /**
     * ルートを定義します。
     */
    setupRoutes() {
        this.router.addRoute('/', async () => {
            this.appState.setCurrentPath('/');
            this.currentBreadcrumbsVNode = AppShell(this.appState, this.router);
            this.currentMainContentVNode = html`<p>Loading categories...</p>`;
            this.renderUI(); // Initial render with loading message

            if (!this.appState.data) await this.loadData();

            if (this.appState.data) {
                this.currentMainContentVNode = CategoryListView(this.appState.data, this.router);
            } else {
                 // loadData will set error message if needed, or we can set a default one here
                if (!this.currentMainContentVNode) { // check if loadData set an error
                    this.currentMainContentVNode = html`<p>No categories loaded.</p>`;
                }
            }
            this.renderUI();
        });

        this.router.addRoute('/category/:categoryName', async (params) => {
            const categoryName = decodeURIComponent(params.categoryName);
            this.appState.setCurrentPath(decodeURIComponent(location.pathname));
            this.currentBreadcrumbsVNode = AppShell(this.appState, this.router);
            this.currentMainContentVNode = html`<p>Loading templates for ${categoryName}...</p>`;
            this.renderUI();

            if (!this.appState.data) await this.loadData();

            const category = this.appState.getCategoryByName(categoryName);
            if (category) {
                this.currentMainContentVNode = TemplateListView(category, this.router);
            } else {
                this.currentMainContentVNode = html`<p>Category not found: ${categoryName}</p>`;
                // Optional: this.router.navigateTo('/'); // or let user see the message
            }
            this.renderUI();
        });

        this.router.addRoute('/category/:categoryName/template/:templateName', async (params) => {
            const categoryName = decodeURIComponent(params.categoryName);
            const templateName = decodeURIComponent(params.templateName);
            this.appState.setCurrentPath(decodeURIComponent(location.pathname));
            this.currentBreadcrumbsVNode = AppShell(this.appState, this.router);
            this.currentMainContentVNode = html`<p>Loading template ${templateName}...</p>`;
            this.renderUI();

            if (!this.appState.data) await this.loadData();

            const template = this.appState.getTemplateByName(categoryName, templateName);
            if (template) {
                // TemplateDetailView needs a way to trigger re-render on placeholder input
                // Passing this.renderUI.bind(this) as the requestRender callback
                this.currentMainContentVNode = TemplateDetailView(template, this.router, this.renderUI.bind(this));
            } else {
                this.currentMainContentVNode = html`<p>Template not found: ${templateName}</p>`;
                // Optional: this.router.navigateTo('/');
            }
            this.renderUI();
        });
    }

    /**
     * Markdownデータをロードし、パースして状態に保存します。
     */
    async loadData() {
        try {
            const defaultUrl = "https://raw.githubusercontent.com/podhmo/podhmo.github.io/refs/heads/master/chatgpt/Template.md";
            // currentSourceUrl is now managed by AppRootComponent's prop for display,
            // but getSourceUrlFromQuery is still the source of truth for loading.
            const currentLoadingUrl = getSourceUrlFromQuery() || defaultUrl;
            // sourceUrlInput.value = currentSourceUrl; // Removed: input is in AppRootComponent

            // Set loading state for main content if not already set by router
            if (!this.currentMainContentVNode || this.currentMainContentVNode.type === 'p') { // basic check if it's a loading msg
                 this.currentMainContentVNode = html`<p>Fetching data from ${currentLoadingUrl}...</p>`;
                 this.renderUI();
            }

            const markdownText = await fetchData(currentLoadingUrl);
            const parsedData = parseMarkdown(markdownText);
            this.appState.setData(parsedData);
            if (parsedData.length === 0) {
                 this.currentMainContentVNode = html`<p>No templates found in the loaded source. Try a different URL.</p>`;
                 // this.renderUI() will be called by the route handler after loadData completes
            }
            // Data is set, route handler will call renderUI with new content
        } catch (error) {
            console.error('Error loading or parsing data:', error);
            this.currentMainContentVNode = html`<p>Error loading data: ${error.message}. Please check the console and the Markdown source.</p>`;
            this.appState.setData([]); // エラー時は空データ
            // this.renderUI() will be called by the route handler
        }
    }

    /**
     * アプリケーションを開始します。
     */
    async start() {
        this.currentMainContentVNode = html`<p>Application starting...</p>`; // Initial message
        this.renderUI(); // Render initial state of AppRootComponent
        await this.router.handleLocationChange(); // 初期ルート処理, this will call renderUI again
    }
}

// アプリケーションインスタンスを作成して開始
const currentBasePath = globalThis.location.pathname.replace(/\/[^/]*$/, '');
console.log(`Current base path: ${currentBasePath}`);
const app = new App(document.getElementById('app'), currentBasePath);
app.start();