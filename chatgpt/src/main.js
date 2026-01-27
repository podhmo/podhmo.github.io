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
     */
    constructor(appRootEl) {
        this.appRootEl = appRootEl;
        this.appState = new AppState();
        this.router = new Router();
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
        // Route patterns that support slashes in category and template names
        // 
        // CATEGORY_ROUTE_PATTERN: Matches /category/<anything> where <anything> can contain slashes
        // - (?:...) is a non-capturing group
        // - (?!\/template\/) is negative lookahead - fails if the next part is /template/
        // - (?:(?!\/template\/).)+ matches one or more characters that are not followed by /template/
        const CATEGORY_ROUTE_PATTERN = /^\/category\/((?:(?!\/template\/).)+)$/;
        
        // TEMPLATE_ROUTE_PATTERN: Matches /category/<cat>/template/<tmpl> where both can contain slashes
        // - (.+?) is non-greedy - matches minimum characters needed up to first /template/
        // - (.+) is greedy - matches all remaining characters (the template name)
        const TEMPLATE_ROUTE_PATTERN = /^\/category\/(.+?)\/template\/(.+)$/;

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

        // Route for category view - uses CATEGORY_ROUTE_PATTERN defined above
        this.router.addRoute(CATEGORY_ROUTE_PATTERN, async (params) => {
            // Params is an array when using regex patterns
            // Hash fragments are already decoded by the browser
            const categoryName = decodeURIComponent(params[0]);
            this.appState.setCurrentPath(location.hash.slice(1));
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

        // Route for template view - uses TEMPLATE_ROUTE_PATTERN defined above
        this.router.addRoute(TEMPLATE_ROUTE_PATTERN, async (params) => {
            // Params is an array when using regex patterns
            // Hash fragments are already decoded by the browser
            const categoryName = decodeURIComponent(params[0]);
            const templateName = decodeURIComponent(params[1]);

            this.appState.setCurrentPath(location.hash.slice(1));
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
const app = new App(document.getElementById('app'));
app.start();
