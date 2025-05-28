// src/app.js (タイトル変更、セッションストレージキー変更以外はほぼ同じ)
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';

import { redirectToGitHubAuth, handleAuthCallback } from './auth.js';
import { createGist } from './gist.js';
import { GITHUB_CLIENT_ID } from './config.js';

const html = htm.bind(h);
const SESSION_STORAGE_TOKEN_KEY = 'github_app_access_token_pkce';

function App() {
    const [accessToken, setAccessToken] = useState(sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [fileName, setFileName] = useState('');
    const [fileContent, setFileContent] = useState(null);
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    useEffect(() => {
        if (GITHUB_CLIENT_ID === 'YOUR_GITHUB_APP_CLIENT_ID' || GITHUB_CLIENT_ID === '') {
            setError("開発者向け設定が完了していません。develop.mdに従ってsrc/config.jsを設定してください。");
            setIsLoading(false);
            return;
        }

        const processAuth = async () => {
            if (window.location.search.includes('code=')) {
                setIsLoading(true);
                try {
                    const token = await handleAuthCallback();
                    if (token) {
                        setAccessToken(token);
                        sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, token);
                        setSuccessMessage('GitHubにログインしました。');
                        setTimeout(() => setSuccessMessage(null), 3000);
                    } else {
                        setError('GitHub認証に失敗しました。トークンを取得できませんでした。CORS設定やプロキシ設定を確認してください。');
                    }
                } catch (err) {
                    console.error(err);
                    setError(`認証処理エラー: ${err.message}`);
                } finally {
                    setIsLoading(false);
                }
            } else {
                const existingToken = sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY);
                if (existingToken) {
                    setAccessToken(existingToken);
                }
                setIsLoading(false);
            }
        };
        processAuth();
    }, []);

    const handleLogin = () => {
        setError(null);
        setSuccessMessage(null);
        redirectToGitHubAuth();
    };

    const handleLogout = () => {
        setAccessToken(null);
        sessionStorage.removeItem(SESSION_STORAGE_TOKEN_KEY);
        setFileName('');
        setFileContent(null);
        setDescription('');
        setIsPublic(true);
        setSuccessMessage('ログアウトしました。');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                setFileContent(e.target.result);
            };
            reader.onerror = (e) => {
                console.error("File reading error:", e);
                setError("ファイルの読み込みに失敗しました。");
                setFileContent(null);
            }
            reader.readAsText(file);
        } else {
            setFileName('');
            setFileContent(null);
        }
    };

    const handleSubmitGist = async (event) => {
        event.preventDefault();
        if (!fileContent || !fileName) {
            setError('ファイルを選択し、ファイル名を入力してください。');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const files = {
                [fileName]: {
                    content: fileContent
                }
            };
            const gistData = { description, public: isPublic, files };
            const result = await createGist(accessToken, gistData);
            setSuccessMessage(html`Gistが作成されました！ <a href="${result.html_url}" target="_blank" rel="noopener noreferrer">Gistを見る</a>`);
            setFileName('');
            setFileContent(null);
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = '';
            setDescription('');
        } catch (err) {
            console.error(err);
            setError(`Gist作成エラー: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    return html`
        <nav>
            <ul><li><strong>Gist Uploader (GitHub App)</strong></li></ul>
            <ul>
                ${accessToken ? html`
                    <li><button onClick=${handleLogout} class="secondary outline">ログアウト</button></li>
                ` : html`
                    <li><button onClick=${handleLogin} disabled=${isLoading || GITHUB_CLIENT_ID === 'YOUR_GITHUB_APP_CLIENT_ID' || GITHUB_CLIENT_ID === ''}>GitHubでログイン</button></li>
                `}
            </ul>
        </nav>

        ${error && html`<article class="error-message" aria-live="assertive">${error}</article>`}
        ${successMessage && html`<article class="success-message" aria-live="assertive">${successMessage}</article>`}

        ${isLoading && (GITHUB_CLIENT_ID !== 'YOUR_GITHUB_APP_CLIENT_ID' && GITHUB_CLIENT_ID !== '') && html`<div aria-busy="true">読み込み中 / 認証処理中...</div>`}

        ${accessToken && !isLoading ? html`
            <form onSubmit=${handleSubmitGist}>
                <fieldset>
                    <label for="file-input">
                        ファイルを選択
                        <input type="file" id="file-input" name="file-input" onChange=${handleFileChange} accept=".md,.txt,.json,.js,.ts,.py,.rb,.java,.c,.cpp,.h,.cs,.php,.html,.css,.xml,text/*" required />
                    </label>

                    <label for="fileName">
                        Gistファイル名
                        <input type="text" id="fileName" name="fileName" value=${fileName} onChange=${e => setFileName(e.target.value)} placeholder="e.g., my-script.js" required />
                    </label>

                    <label for="description">
                        Description (説明)
                        <textarea id="description" name="description" value=${description} onChange=${e => setDescription(e.target.value)} placeholder="このGistについての簡単な説明"></textarea>
                    </label>

                    <fieldset>
                        <label for="isPublicSwitch">
                            <input type="checkbox" id="isPublicSwitch" name="isPublicSwitch" role="switch" checked=${!isPublic} onChange=${() => setIsPublic(prev => !prev)} />
                            非公開Gistにする (Secret)
                        </label>
                    </fieldset>
                    
                    <button type="submit" disabled=${isLoading || !fileContent || !accessToken}>
                        ${isLoading ? html`<span aria-busy="true">作成中...</span>` : 'Gistを作成'}
                    </button>
                </fieldset>
            </form>
        ` : !isLoading && !(GITHUB_CLIENT_ID === 'YOUR_GITHUB_APP_CLIENT_ID' || GITHUB_CLIENT_ID === '') && html`
            <p>GitHubアカウントでログインして、Gistの作成を開始してください。</p>
        `}
    `;
}

render(html`<${App} />`, document.getElementById('app'));