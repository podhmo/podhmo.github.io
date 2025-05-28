// src/app.js
import { h, render, Component } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import htm from 'htm';

import { redirectToGitHubAuth, handleAuthCallback } from './auth.js';
import { createGist } from './gist.js';
import { GITHUB_CLIENT_ID } from './config.js'; // configの存在確認のため

const html = htm.bind(h);

function App() {
    const [accessToken, setAccessToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [fileName, setFileName] = useState('');
    const [fileContent, setFileContent] = useState(null);
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true); // デフォルトは公開

    // 初期化処理: URLに認証コードがあればトークン取得を試みる
    useEffect(() => {
        // config.jsが未設定の場合に警告
        if (GITHUB_CLIENT_ID === 'YOUR_GITHUB_CLIENT_ID') {
            setError("開発者向け設定が完了していません。develop.mdに従ってsrc/config.jsを設定してください。");
            setIsLoading(false);
            return;
        }

        const processAuth = async () => {
            if (window.location.hash.includes('access_token=')) {
                try {
                    const token = await handleAuthCallback();
                    if (token) {
                        setAccessToken(token);
                        setSuccessMessage('GitHubにログインしました。');
                        setTimeout(() => setSuccessMessage(null), 3000);
                    } else {
                        setError('GitHub認証に失敗しました。');
                    }
                } catch (err) {
                    console.error(err);
                    setError(`認証処理エラー: ${err.message}`);
                }
            }
            setIsLoading(false);
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
        // 必要であれば localStorage や sessionStorage からトークンを削除
        // 今回は毎回ログインなので、状態をリセットするだけで良い
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
            // フォームをリセット
            setFileName('');
            setFileContent(null);
            document.getElementById('file-input').value = ''; // ファイル選択をクリア
            setDescription('');
            // isPublic は維持してもよいし、デフォルトに戻してもよい
        } catch (err) {
            console.error(err);
            setError(`Gist作成エラー: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && GITHUB_CLIENT_ID !== 'YOUR_GITHUB_CLIENT_ID' && !window.location.hash.includes('access_token=')) {
        // 初期ロード時で、認証コールバックでない場合（configが設定済みの場合）
        // ユーザーがページを開いた直後の状態
        // ここでsetIsLoading(false)を呼ばないと何も表示されない
        // useEffectのprocessAuth内で最後にsetIsLoading(false)しているので、この分岐は不要かもしれない
        // しかし、認証コールバックではない初回表示のisLoadingを早期にfalseにするために明示的に記述
        // useEffectの依存配列が空なので初回のみ実行されるが、その非同期処理完了を待つよりは...
        // → useEffect内のsetIsLoading(false)に任せる方がシンプルで良い。この分岐は削除。
    }


    return html`
        <nav>
            <ul><li><strong>Gist Uploader</strong></li></ul>
            <ul>
                ${accessToken ? html`
                    <li><button onClick=${handleLogout} class="secondary outline">ログアウト</button></li>
                ` : html`
                    <li><button onClick=${handleLogin} disabled=${isLoading || GITHUB_CLIENT_ID === 'YOUR_GITHUB_CLIENT_ID'}>GitHubでログイン</button></li>
                `}
            </ul>
        </nav>

        ${error && html`<article class="error-message" aria-live="assertive">${error}</article>`}
        ${successMessage && html`<article class="success-message" aria-live="assertive">${successMessage}</article>`}

        ${isLoading && GITHUB_CLIENT_ID !== 'YOUR_GITHUB_CLIENT_ID' && html`<div aria-busy="true">処理中...</div>`}

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
                    
                    <button type="submit" disabled=${isLoading || !fileContent}>
                        ${isLoading ? html`<span aria-busy="true">作成中...</span>` : 'Gistを作成'}
                    </button>
                </fieldset>
            </form>
        ` : !isLoading && GITHUB_CLIENT_ID !== 'YOUR_GITHUB_CLIENT_ID' && html`
            <p>GitHubアカウントでログインして、Gistの作成を開始してください。</p>
        `}
    `;
}

render(html`<${App} />`, document.getElementById('app'));