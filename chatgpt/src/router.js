/**
 * シンプルなSPAルーター
 * Hash-based routingを利用します。
 */
export class Router {
    /**
     * ルーターを初期化します。
     */
    constructor() {
        this.routes = [];
        globalThis.addEventListener('hashchange', () => this.handleLocationChange());
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
        // Get the hash, removing the leading '#'
        let currentPath = globalThis.location.hash.slice(1) || '/';
        
        for (const route of this.routes) {
            const match = currentPath.match(route.regex);
            if (match) {
                const params = this.extractParams(route.regex, currentPath, route.paramNames || []);
                try {
                    await route.handler(params);
                } catch (error) {
                    console.error("Error in route handler:", error);
                }
                return;
            }
        }
        console.warn(`No route found for ${currentPath}`);
    }

    /**
     * URLパスからパラメータを抽出します。
     * @param {RegExp} regex - ルートの正規表現
     * @param {string} path - 現在のURLパス
     * @param {string[]} paramNames - パラメータ名の配列（空の場合は配列を返す）
     * @returns {object|array} - paramNamesが空でない場合はパラメータのキーと値のオブジェクト、空の場合は値の配列
     */
    extractParams(regex, path, paramNames = []) {
        const match = path.match(regex);
        if (!match) {
            // Defensive: should not happen if route matched
            return paramNames.length === 0 ? [] : {};
        }
        
        const values = match.slice(1);
        
        // If no parameter names are provided, return the values as an array
        if (paramNames.length === 0) {
            return values;
        }
        
        // Otherwise, return an object with named parameters
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
        // Set the hash
        globalThis.location.hash = path.startsWith('/') ? path : '/' + path;
    }
}