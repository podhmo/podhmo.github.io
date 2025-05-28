// src/utils.js

/**
 * ランダムな文字列を生成してOAuthのstateパラメータとして使用します。
 * CSRF対策のために利用します。
 * @param {number} length - 生成する文字列の長さ
 * @returns {string} ランダムな文字列
 */
export function generateState(length = 32) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * URLのハッシュフラグメントからパラメータをパースします。
 * @param {string} hash - window.location.hash の値
 * @returns {object} パースされたキーと値のオブジェクト
 */
export function parseHashParams(hash) {
    const params = {};
    if (hash.startsWith('#')) {
        hash = hash.substring(1);
    }
    hash.split('&').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
            params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
    });
    return params;
}