/**
 * @typedef {import('./markdownParser.js').ParsedCategory} ParsedCategory
 * @typedef {import('./markdownParser.js').ParsedTemplate} ParsedTemplate
 */

/**
 * アプリケーションの状態を管理します。
 */
export class AppState {
    constructor() {
        /** @type {ParsedCategory[] | null} */
        this.data = null;
        /** @type {string} */
        this.currentPath = '/'; // 例: '/', '/category/ChatGPT', '/category/ChatGPT/template/Prompt1'
    }

    /**
     * パースされたMarkdownデータをセットします。
     * @param {ParsedCategory[]} data
     */
    setData(data) {
        this.data = data;
    }

    /**
     * 現在のパスをセットします。
     * @param {string} path
     */
    setCurrentPath(path) {
        this.currentPath = path;
    }

    /**
     * カテゴリ名でカテゴリを取得します。
     * @param {string} categoryName
     * @returns {ParsedCategory | undefined}
     */
    getCategoryByName(categoryName) {
        if (!this.data) return undefined;
        return this.data.find(cat => cat.categoryName === categoryName);
    }

    /**
     * カテゴリ名とテンプレート名でテンプレートを取得します。
     * @param {string} categoryName
     * @param {string} templateName
     * @returns {ParsedTemplate | undefined}
     */
    getTemplateByName(categoryName, templateName) {
        const category = this.getCategoryByName(categoryName);
        if (!category) return undefined;
        return category.templates.find(tmpl => tmpl.templateName === templateName);
    }

    /**
     * 現在のパスからパンくずリスト用の情報を生成します。
     * @returns {{name: string, path: string}[]}
     */
    getBreadcrumbs() {
        if (!this.currentPath || this.currentPath === '/') {
            return [{ name: 'Home', path: '/' }];
        }

        const parts = this.currentPath.split('/').filter(p => p); // ['', 'category', 'CatName', 'template', 'TmplName'] -> ['category', 'CatName', 'template', 'TmplName']
        const breadcrumbs = [{ name: 'Home', path: '/' }];

        if (parts.length >= 2 && parts[0] === 'category') {
            const categoryName = decodeURIComponent(parts[1]);
            breadcrumbs.push({ name: categoryName, path: `/category/${parts[1]}` });

            if (parts.length >= 4 && parts[2] === 'template') {
                const templateName = decodeURIComponent(parts[3]);
                breadcrumbs.push({ name: templateName, path: `/category/${parts[1]}/template/${parts[3]}` });
            }
        }
        return breadcrumbs;
    }
}