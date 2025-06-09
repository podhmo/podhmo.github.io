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
        const regex = typeof path === 'string'
            ? new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`)
            : path;
        this.routes.push({ regex, handler });
    }

    /**
     * 現在のURLに基づいて適切なハンドラを実行します。
     */
    async handleLocationChange() {
        const currentPath = window.location.pathname;
        for (const route of this.routes) {
            const match = currentPath.match(route.regex);
            if (match) {
                const params = this.extractParams(route.regex, currentPath);
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
    extractParams(regex, path) {
        const values = path.match(regex).slice(1);
        // We need to find the param names from the original path string if it was a string
        // This is a simplified version. For robust param name extraction,
        // you might need to store original path string and parse it.
        // For now, assuming params are ordered or a more complex regex is used.
        // A common approach is to convert path string like '/user/:id/post/:postId'
        // into a regex and store param names ['id', 'postId']
        const paramNames = [];
        const originalPathString = regex.source.substring(1, regex.source.length -1) // remove ^ and $
                                       .replace(/\\//g, '/'); // unescape slashes

        originalPathString.replace(/:(\w+)/g, (_, name) => {
            paramNames.push(name);
        });
        
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