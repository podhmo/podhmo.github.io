const DEFAULT_SOURCE_URL = './Template.md';

/**
 * 指定されたURLからテキストデータを非同期で取得します。
 * @param {string} url - データを取得するURL
 * @returns {Promise<string>} 取得したテキストデータ
 * @throws {Error} Fetchに失敗した場合
 */
export async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        throw error; // Re-throw to be caught by caller
    }
}

/**
 * デフォルトのMarkdownソースURLを返します。
 * @returns {string}
 */
export function getDefaultSourceUrl() {
    return DEFAULT_SOURCE_URL;
}

/**
 * URLのクエリパラメータ 'source' からMarkdownソースURLを取得します。
 * @returns {string | null} 'source' パラメータの値、または存在しない場合はnull
 */
export function getSourceUrlFromQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('source');
}