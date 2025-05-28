// src/auth.js
import { GITHUB_CLIENT_ID, REDIRECT_URI, GITHUB_OAUTH_SCOPES } from './config.js';
import { generateState, parseHashParams } from './utils.js';

const OAUTH_STATE_KEY = 'github_oauth_state';

/**
 * GitHub認証ページにリダイレクトします。
 */
export function redirectToGitHubAuth() {
    const state = generateState();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.append('client_id', GITHUB_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', GITHUB_OAUTH_SCOPES);
    authUrl.searchParams.append('state', state);
    // Implicit Grant Flowでは response_type=token は不要 (GitHubが自動で判断するケースが多い)
    // 明示的に指定する場合もあるが、GitHubのドキュメントでは必須とはされていない。
    // authUrl.searchParams.append('response_type', 'token');

    window.location.href = authUrl.toString();
}

/**
 * 認証コールバックを処理し、アクセストークンを取得します。
 * URLのハッシュフラグメントからアクセストークンとstateを検証します。
 * @returns {Promise<string | null>} アクセストークン。エラー時はnull。
 */
export async function handleAuthCallback() {
    const params = parseHashParams(window.location.hash);
    const accessToken = params.access_token;
    const receivedState = params.state;
    const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);

    // コールバック後はURLからハッシュを削除してクリーンにする
    if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } else {
        window.location.hash = ''; // 旧ブラウザ向けフォールバック
    }
    sessionStorage.removeItem(OAUTH_STATE_KEY);


    if (!accessToken) {
        if (params.error) {
            console.error('GitHub OAuth Error:', params.error, params.error_description);
        }
        return null;
    }

    if (receivedState !== storedState) {
        console.error('OAuth state mismatch. Possible CSRF attack.');
        return null;
    }

    return accessToken;
}