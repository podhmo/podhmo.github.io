// src/utils.js (変更なし)

/**
 * ランダムな文字列を生成してOAuthのstateパラメータやPKCEのcode_verifierとして使用します。
 * @param {number} length - 生成する文字列のバイト長 (生成される文字列長は約2倍)
 * @returns {string} ランダムな文字列 (16進数エンコード)
 */
export function generateRandomString(length = 32) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * PKCE用のCode Verifierを生成します。
 * @returns {string} Code Verifier
 */
export function generateCodeVerifier() {
    return generateRandomString(32); // 43-128文字のASCII文字列が推奨 (RFC7636)
}

/**
 * PKCE用のCode Challengeを生成します (SHA256)。
 * @param {string} verifier - Code Verifier
 * @returns {Promise<string>} Base64 URLエンコードされたCode Challenge
 */
export async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    // Base64 URLエンコード (パディングなし、'+' -> '-'、'/' -> '_')
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * URLのクエリパラメータをパースします。
 * @param {string} search - window.location.search の値
 * @returns {object} パースされたキーと値のオブジェクト
 */
export function parseQueryParams(search) {
    const params = {};
    if (search.startsWith('?')) {
        search = search.substring(1);
    }
    new URLSearchParams(search).forEach((value, key) => {
        params[key] = value;
    });
    return params;
}