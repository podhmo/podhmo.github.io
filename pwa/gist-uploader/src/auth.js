// src/auth.js
import { GITHUB_CLIENT_ID, REDIRECT_URI, GITHUB_OAUTH_SCOPES } from './config.js';
import { generateRandomString, generateCodeVerifier, generateCodeChallenge, parseQueryParams } from './utils.js';

const OAUTH_STATE_KEY = 'github_oauth_state_pkce';
const PKCE_CODE_VERIFIER_KEY = 'github_pkce_code_verifier';

/**
 * GitHub認証ページにリダイレクトします (PKCEフロー)。
 */
export async function redirectToGitHubAuth() {
    const state = generateRandomString();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);

    const codeVerifier = generateCodeVerifier();
    sessionStorage.setItem(PKCE_CODE_VERIFIER_KEY, codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.append('client_id', GITHUB_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', GITHUB_OAUTH_SCOPES);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
}

/**
 * GitHubのトークンエンドポイントからアクセストークンを取得します。
 * @param {string} code - 認証コード
 * @param {string} codeVerifier - PKCE Code Verifier
 * @returns {Promise<string>} アクセストークン
 * @throws {Error} トークン取得に失敗した場合
 */
async function fetchToken(code, codeVerifier) {
    // !!! 重要 !!!
    // 以下のURLはGitHubの実際のトークンエンドポイントです。
    // ブラウザから直接このエンドポイントにPOSTリクエストを送信すると、
    // CORSポリシーによりブロックされる可能性が非常に高いです。
    // 実際の運用では、このリクエストを中継するプロキシサーバーのエンドポイントを指定してください。
    // 詳細は develop.md の「トークン取得時の注意 (CORS とプロキシの必要性)」セクションを参照してください。
    const tokenUrl = 'https://github.com/login/oauth/access_token'; // <--- プロキシサーバーのURLに置き換えること！

    const params = new URLSearchParams();
    params.append('client_id', GITHUB_CLIENT_ID);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('code_verifier', codeVerifier);
    // PKCEの場合、Client Secretはサーバーサイドプロキシが扱う場合に付与（クライアントサイドでは含めない）

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Accept': 'application/json', // GitHubはJSON形式のレスポンスを返すように要求
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error fetching token' }));
        console.error('Token fetch error:', response.status, errorData);
        throw new Error(`アクセストークンの取得に失敗しました: ${errorData.error_description || errorData.message || response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
        console.error('Token API error:', data.error, data.error_description);
        throw new Error(`アクセストークン取得エラー: ${data.error_description || data.error}`);
    }
    return data.access_token;
}


/**
 * 認証コールバックを処理し、アクセストークンを取得します (PKCEフロー)。
 * URLのクエリパラメータからcodeとstateを検証し、トークンエンドポイントにリクエストします。
 * @returns {Promise<string | null>} アクセストークン。エラー時はnull。
 */
export async function handleAuthCallback() {
    const params = parseQueryParams(window.location.search);
    const code = params.code;
    const receivedState = params.state;
    const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    const codeVerifier = sessionStorage.getItem(PKCE_CODE_VERIFIER_KEY);

    // コールバック後はURLからクエリパラメータを削除してクリーンにする
    if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
    }
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(PKCE_CODE_VERIFIER_KEY);

    if (!code) {
        if (params.error) {
            console.error('GitHub OAuth Error:', params.error, params.error_description);
        }
        return null;
    }

    if (receivedState !== storedState) {
        console.error('OAuth state mismatch. Possible CSRF attack.');
        return null;
    }

    if (!codeVerifier) {
        console.error('PKCE code_verifier not found in session storage.');
        return null;
    }

    try {
        const accessToken = await fetchToken(code, codeVerifier);
        // アクセストークンをセッションストレージに保存する
        // 今回は毎回ログインのため、`app.js`のstateで管理し、保存はしない方針だが、
        // 必要ならここで sessionStorage.setItem('github_access_token', accessToken);
        return accessToken;
    } catch (error) {
        console.error('Failed to obtain access token:', error);
        return null;
    }
}