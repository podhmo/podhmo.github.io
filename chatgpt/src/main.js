import { html } from 'lit-html';
import { Router } from './router.js';
import { parseMarkdown } from './markdownParser.js';
import { fetchData, getSourceUrlFromQuery } from './dataProvider.js';
import { AppState } from './appState.js';
import { renderAppShell } from './ui/AppShell.js';
import { renderCategoryList } from './ui/CategoryListView.js';
import { renderTemplateList } from './ui/TemplateListView.js';
import { renderTemplateDetail } from './ui/TemplateDetailView.js';
import { render } from './ui/render.js';

const contentArea = document.getElementById('content-area');
const breadcrumbsArea = document.getElementById('breadcrumbs');
const sourceUrlInput = document.getElementById('sourceUrlInput');
const loadSourceUrlButton = document.getElementById('loadSourceUrlButton');

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
     * @param {HTMLElement} contentEl - メインコンテンツを描画する要素
     * @param {HTMLElement} breadcrumbsEl - パンくずリストを描画する要素
     * @param {string} basePath - ルーティングのベースパス
     */
    constructor(contentEl, breadcrumbsEl, basePath = '') {
        this.contentEl = contentEl;
        this.breadcrumbsEl = breadcrumbsEl;
        this.appState = new AppState();
        this.router = new Router(basePath);
        this.setupRoutes();
        this.setupEventListeners();
    }

    setupEventListeners() {
        loadSourceUrlButton.addEventListener('click', () => {
            const url = sourceUrlInput.value.trim();
            if (url) {
                // URLをクエリパラメータに設定してリロード
                const newUrl = new URL(globalThis.location.href);
                newUrl.searchParams.set('source', url);
                globalThis.location.href = newUrl.toString();
            }
        });
    }

    /**
     * ルートを定義します。
     */
    setupRoutes() {
        this.router.addRoute('/', async () => {
            this.appState.setCurrentPath('/');
            renderAppShell(this.appState, this.breadcrumbsEl); // パンくずを更新
            render(html`<p>Loading categories...</p>`, this.contentEl);
            if (!this.appState.data) await this.loadData();
            if (this.appState.data) {
                renderCategoryList(this.appState.data, this.contentEl, this.router);
            }
        });

        this.router.addRoute('/category/:categoryName', async (params) => {
            this.appState.setCurrentPath(decodeURIComponent(location.pathname));
            renderAppShell(this.appState, this.breadcrumbsEl);
            render(html`<p>Loading templates for ${decodeURIComponent(params.categoryName)}...</p>`, this.contentEl);
            if (!this.appState.data) await this.loadData();
            const category = this.appState.getCategoryByName(decodeURIComponent(params.categoryName));
            if (category) {
                renderTemplateList(category, this.contentEl, this.router);
            } else {
                render(html`<p>Category not found.</p>`, this.contentEl);
                this.router.navigateTo('/');
            }
        });

        this.router.addRoute('/category/:categoryName/template/:templateName', async (params) => {
            this.appState.setCurrentPath(decodeURIComponent(location.pathname));
            renderAppShell(this.appState, this.breadcrumbsEl);
            render(html`<p>Loading template ${decodeURIComponent(params.templateName)}...</p>`, this.contentEl);
            if (!this.appState.data) await this.loadData();
            const template = this.appState.getTemplateByName(decodeURIComponent(params.categoryName), decodeURIComponent(params.templateName));
            if (template) {
                renderTemplateDetail(template, this.contentEl);
            } else {
                render(html`<p>Template not found.</p>`, this.contentEl);
                this.router.navigateTo('/');
            }
        });
    }

    /**
     * Markdownデータをロードし、パースして状態に保存します。
     */
    async loadData() {
        try {
            const defaultUrl = "https://raw.githubusercontent.com/podhmo/podhmo.github.io/refs/heads/master/chatgpt/Template.md"
            const currentSourceUrl = getSourceUrlFromQuery() || defaultUrl;
            sourceUrlInput.value = currentSourceUrl; // 現在のソースURLを入力欄に表示
            const markdownText = await fetchData(currentSourceUrl);
            const parsedData = parseMarkdown(markdownText);
            this.appState.setData(parsedData);
        } catch (error) {
            console.error('Error loading or parsing data:', error);
            render(html`<p>Error loading data: ${error.message}. Please check the console and the Markdown source.</p>`, this.contentEl);
            this.appState.setData([]); // エラー時は空データ
        }
    }

    /**
     * アプリケーションを開始します。
     */
    async start() {
        await this.router.handleLocationChange(); // 初期ルート処理
    }
}

// アプリケーションインスタンスを作成して開始
const currentBasePath = globalThis.location.pathname.replace(/\/[^/]*$/, ''); // ベースパスを現在のパスから取得
console.log(`Current base path: ${currentBasePath}`); // デバッグ用ログ
const app = new App(contentArea, breadcrumbsArea, currentBasePath);
app.start();