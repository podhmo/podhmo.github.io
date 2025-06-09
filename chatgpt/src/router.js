/**
 * シンプルなSPAルーター
 * History APIを利用します。
 */
export class Router {
    constructor() {
        this.routes = [];
        window.addEventListener('popstate', () => this.handleLocationChange());
    }

    /**
     * ルートを追加します。
     * @param {string | RegExp} path - パスパターン（例: '/', '/category/:id'）または正規表現
     * @param {Function} handler - パスにマッチしたときに実行される関数
     */
    addRoute(path, handler) {
        let regex;
        const paramNames = [];
        if (typeof path === 'string') {
            // パラメータ名を抽出
            const paramRegex = /:(\w+)/g;
            let match;
            while ((match = paramRegex.exec(path)) !== null) {
                paramNames.push(match[1]);
            }
            regex = new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`);
        } else {
            regex = path;
        }
        this.routes.push({ regex, handler, paramNames });
    }

    /**
     * 現在のURLに基づいて適切なハンドラを実行します。
     */
    async handleLocationChange() {
        const currentPath = window.location.pathname;
        for (const route of this.routes) {
            const match = currentPath.match(route.regex);
            if (match) {
                const params = this.extractParams(route.regex, currentPath, route.paramNames || []);
                try {
                    await route.handler(params);
                } catch (error) {
                    console.error("Error in route handler:", error);
                    // Optionally render an error view
                }
                return;
            }
        }
        // No route matched, handle 404 or redirect
        console.warn(`No route found for ${currentPath}`);
        // this.navigateTo('/'); // Example: redirect to home
    }

    /**
     * URLパスからパラメータを抽出します。
     * @param {RegExp} regex - ルートの正規表現
     * @param {string} path - 現在のURLパス
     * @returns {object} - パラメータのキーと値のオブジェクト
     */
    extractParams(regex, path, paramNames = []) {
        const values = path.match(regex).slice(1);
        const params = {};
        paramNames.forEach((name, index) => {
            params[name] = values[index];
        });
        return params;
    }


    /**
     * 指定されたパスにナビゲートします。
     * @param {string} path - ナビゲート先のパス
     */
    navigateTo(path) {
        window.history.pushState({}, '', path);
        this.handleLocationChange();
    }
}