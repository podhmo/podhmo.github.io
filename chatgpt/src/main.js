import { h } from 'preact';
import { default as htm } from 'htm';
import { Router } from './router.js';
import { parseMarkdown } from './markdownParser.js';
// getSourceUrlFromQuery removed
import { fetchData } from './dataProvider.js';
import { AppState } from './appState.js';
import { AppShell } from './ui/AppShell.js';
import { CategoryListView } from './ui/CategoryListView.js';
import { TemplateListView } from './ui/TemplateListView.js';
import { TemplateDetailView } from './ui/TemplateDetailView.js';
import { render } from './ui/render.js';
import { AppRootComponent } from './ui/AppRootComponent.js';

const html = htm.bind(h);

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
        this.currentMainContentVNode = html`<p>Initializing...</p>`;
        this.setupRoutes();
    }

    async handleLoadSourceUrl(newUrl) {
        if (newUrl && typeof newUrl === 'string' && newUrl.trim() !== '') {
            const trimmedUrl = newUrl.trim();
            this.appState.setCurrentSourceUrl(trimmedUrl);
            const newBrowserUrl = new URL(window.location.origin + window.location.pathname);
            newBrowserUrl.searchParams.set('source', trimmedUrl);
            history.pushState({}, '', newBrowserUrl.toString());

            this.currentMainContentVNode = html`<p>Loading from new source: ${trimmedUrl}...</p>`;
            this.renderUI();

            await this.loadData(trimmedUrl);
            await this.router.handleLocationChange();
        } else {
            console.warn("handleLoadSourceUrl called with invalid URL:", newUrl);
        }
    }

    renderUI() {
        const currentSourceUrl = this.appState.getCurrentSourceUrl();
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
            this.renderUI();

            if (!this.appState.data || !this.appState.data.sourceUrl || this.appState.data.sourceUrl !== this.appState.getCurrentSourceUrl()) {
                await this.loadData();
            }

            if (this.appState.data && this.appState.data.length > 0) {
                this.currentMainContentVNode = CategoryListView(this.appState.data, this.router);
            } else if (this.appState.data && this.appState.data.length === 0) { // Check after data load
                 this.currentMainContentVNode = html`<p>No templates found in the loaded source: ${this.appState.getCurrentSourceUrl()}.</p>`;
            }
            // Error messages from loadData take precedence and are set in this.currentMainContentVNode by loadData itself.
            this.renderUI();
        });

        // Route for category view - matches /category/anything (including slashes)
        // but not if it's followed by /template/
        this.router.addRoute(/^\/category\/((?:(?!\/template\/).)+)$/, async (params) => {
            const categoryName = params[0];
            this.appState.setCurrentPath(decodeURIComponent(location.pathname));
            this.currentBreadcrumbsVNode = AppShell(this.appState, this.router);
            this.currentMainContentVNode = html`<p>Loading templates for ${categoryName}...</p>`;
            this.renderUI();

            if (!this.appState.data || !this.appState.data.sourceUrl || this.appState.data.sourceUrl !== this.appState.getCurrentSourceUrl()) {
                await this.loadData();
            }

            if (this.appState.data) { // Check if data is available
                const category = this.appState.getCategoryByName(categoryName);
                if (category) {
                    this.currentMainContentVNode = TemplateListView(category, this.router);
                } else {
                    // Only set category not found if data was successfully loaded (i.e., not an error message already)
                    if (this.appState.data.sourceUrl === this.appState.getCurrentSourceUrl() && this.appState.data.length > 0) {
                         this.currentMainContentVNode = html`<p>Category not found: ${categoryName}</p>`;
                    } else if (this.appState.data.length === 0 && this.appState.data.sourceUrl === this.appState.getCurrentSourceUrl()){
                        this.currentMainContentVNode = html`<p>No data loaded from ${this.appState.getCurrentSourceUrl()}, so cannot find category ${categoryName}.</p>`;
                    }
                    // If loadData set an error, that message will persist.
                }
            }
            this.renderUI();
        });

        // Route for template view - matches /category/anything/template/anything
        // Both category and template names can contain slashes
        // We match the last occurrence of /template/ to handle cases where category or template names contain "template"
        this.router.addRoute(/^\/category\/(.+?)\/template\/(.+)$/, async (params) => {
            const categoryName = params[0];
            const templateName = params[1];

            this.appState.setCurrentPath(decodeURIComponent(location.pathname));
            this.appState.clearVariableValues();

            this.currentBreadcrumbsVNode = AppShell(this.appState, this.router);
            this.currentMainContentVNode = html`<p>Loading template ${templateName}...</p>`;
            this.renderUI();

            if (!this.appState.data || !this.appState.data.sourceUrl || this.appState.data.sourceUrl !== this.appState.getCurrentSourceUrl()) {
                await this.loadData();
            }

            const renderTemplateView = () => {
                if (!this.appState.data) {
                    this.currentMainContentVNode = html`<p>Data not loaded. Cannot render template.</p>`;
                    this.renderUI();
                    return;
                }
                const template = this.appState.getTemplateByName(categoryName, templateName);
                if (template) {
                    this.currentMainContentVNode = TemplateDetailView(template, this.router, this.appState, renderTemplateView);
                } else {
                    if (this.appState.data.sourceUrl === this.appState.getCurrentSourceUrl() && this.appState.data.length > 0) {
                        this.currentMainContentVNode = html`<p>Template not found: ${templateName}</p>`;
                    } else if (this.appState.data.length === 0 && this.appState.data.sourceUrl === this.appState.getCurrentSourceUrl()){
                        this.currentMainContentVNode = html`<p>No data loaded from ${this.appState.getCurrentSourceUrl()}, so cannot find template ${templateName}.</p>`;
                    }
                }
                this.renderUI();
            };

            renderTemplateView();
        });
    }

    async loadData(urlToLoad = null) {
        const currentLoadingUrl = urlToLoad || this.appState.getCurrentSourceUrl();

        if (this.appState.data && this.appState.data.sourceUrl !== currentLoadingUrl) {
            this.appState.setData(null);
        }

        this.currentMainContentVNode = html`<p>Fetching data from ${currentLoadingUrl}...</p>`;
        // The caller (route handler or handleLoadSourceUrl) is responsible for calling renderUI to show this.

        try {
            const markdownText = await fetchData(currentLoadingUrl);
            const parsedData = parseMarkdown(markdownText);
            parsedData.sourceUrl = currentLoadingUrl;
            this.appState.setData(parsedData);

            // Let route handlers determine content for empty data, do not set currentMainContentVNode here for that case.
        } catch (error) {
            console.error('Error loading or parsing data from ${currentLoadingUrl}:', error);
            this.currentMainContentVNode = html`<p>Error loading data from ${currentLoadingUrl}: ${error.message}. Please check the console and the Markdown source.</p>`;
            const errorData = [];
            errorData.sourceUrl = currentLoadingUrl;
            this.appState.setData(errorData);
        }
    }

    async start() {
        this.currentMainContentVNode = html`<p>Application starting...</p>`;
        this.renderUI();
        await this.router.handleLocationChange();
    }
}

// アプリケーションインスタンスを作成して開始
// Detect the application base path intelligently
function detectBasePath() {
    const pathname = globalThis.location.pathname;
    
    // Check if we're in the /chatgpt/ application directory (production on GitHub Pages)
    if (pathname.startsWith('/chatgpt/') || pathname === '/chatgpt') {
        return '/chatgpt';
    }
    
    // For local development or other deployments, use the directory of the current page
    // But only if we're at a route like /index.html or just /
    const lastSegment = pathname.split('/').pop();
    if (lastSegment === '' || lastSegment.endsWith('.html')) {
        return pathname.replace(/\/[^/]*$/, '');
    }
    
    // If we're at a deep route (e.g., /category/foo/template/bar),
    // we can't reliably detect basePath from URL alone.
    // Default to empty string for local development.
    return '';
}

const currentBasePath = detectBasePath();
console.log(`Current base path: ${currentBasePath}`);
const app = new App(document.getElementById('app'), currentBasePath);
app.start();
