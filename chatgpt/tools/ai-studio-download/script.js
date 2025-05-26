// script.js - ESM (ECMAScript Modules)

// --- 定数定義 ---
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'; // TODO: 取得したクライアントIDに置き換えてください
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const GOOGLE_AI_STUDIO_FOLDER_NAME = "Google AI Studio";

// --- グローバル変数 (モジュールスコープ) ---
let tokenClient;
let gapiInited = false;
let gisInited = false;

// --- DOM要素の取得 ---
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const contentSection = document.getElementById('content');
const fileListElement = document.getElementById('file-list');
const loadingMessage = document.getElementById('loading-message');
const noFilesMessage = document.getElementById('no-files-message');

// --- Google API ライブラリロード完了時のコールバック ---
// これらはグローバルスコープに公開する必要があるため、windowオブジェクトにアタッチします。
window.gapiLoaded = () => {
    gapi.load('client', initializeGapiClient);
};

window.gisLoaded = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // トークンレスポンスはrequestAccessTokenのPromiseで処理
    });
    gisInited = true;
    maybeEnableAuthUI();
};

// --- 関数定義 ---

/**
 * GAPIクライアントの初期化
 */
async function initializeGapiClient() {
    try {
        await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        maybeEnableAuthUI();
    } catch (error) {
        console.error('Error initializing GAPI client:', error);
        showError('GAPIクライアントの初期化に失敗しました。');
    }
}

/**
 * GAPIとGISの準備ができたら認証UIを有効化
 */
function maybeEnableAuthUI() {
    if (gapiInited && gisInited && authorizeButton) {
        authorizeButton.style.display = 'block';
    }
}

/**
 * 認証ボタンクリック時の処理
 */
async function handleAuthClick() {
    if (!tokenClient) {
        showError('Google認証クライアントが初期化されていません。');
        return;
    }
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'})
            .then(async (response) => {
                if (response.error) {
                    throw response;
                }
                gapi.client.setToken(response);
                updateSigninStatus(true);
                await listFilesInAiStudioFolder();
            })
            .catch((err) => {
                console.error('Access token error:', err);
                showError('認証に失敗しました。');
                updateSigninStatus(false);
            });
    } else {
        updateSigninStatus(true);
        await listFilesInAiStudioFolder();
    }
}

/**
 * サインアウト処理
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
            updateSigninStatus(false);
            if (fileListElement) fileListElement.innerHTML = '';
            if (noFilesMessage) noFilesMessage.style.display = 'none';
        });
    }
}

/**
 * サインイン状態を更新し、UIを切り替え
 * @param {boolean} isSignedIn
 */
function updateSigninStatus(isSignedIn) {
    if (authorizeButton) authorizeButton.style.display = isSignedIn ? 'none' : 'block';
    if (signoutButton) signoutButton.style.display = isSignedIn ? 'block' : 'none';
    if (contentSection) contentSection.style.display = isSignedIn ? 'block' : 'none';
    if (!isSignedIn && loadingMessage) loadingMessage.style.display = 'none';
}

/**
 * "Google AI Studio" フォルダ内のファイルを取得して表示
 */
async function listFilesInAiStudioFolder() {
    if (fileListElement) fileListElement.innerHTML = '';
    if (loadingMessage) loadingMessage.style.display = 'block';
    if (noFilesMessage) noFilesMessage.style.display = 'none';

    if (!gapi.client.getToken()) {
        showError('認証されていません。ログインしてください。');
        if (loadingMessage) loadingMessage.style.display = 'none';
        updateSigninStatus(false);
        return;
    }
    
    try {
        const folderSearchResponse = await gapi.client.drive.files.list({
            q: `name='${GOOGLE_AI_STUDIO_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (!folderSearchResponse.result.files || folderSearchResponse.result.files.length === 0) {
            showError(`フォルダ "${GOOGLE_AI_STUDIO_FOLDER_NAME}" が見つかりません。`);
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (noFilesMessage) {
                noFilesMessage.textContent = `フォルダ "${GOOGLE_AI_STUDIO_FOLDER_NAME}" が見つかりません。`;
                noFilesMessage.style.display = 'block';
            }
            return;
        }
        const aiStudioFolderId = folderSearchResponse.result.files[0].id;

        const fileListResponse = await gapi.client.drive.files.list({
            q: `'${aiStudioFolderId}' in parents and mimeType='application/json' and trashed=false`,
            orderBy: 'createdTime desc',
            fields: 'files(id, name, createdTime)',
            pageSize: 100,
            spaces: 'drive'
        });

        if (loadingMessage) loadingMessage.style.display = 'none';
        const files = fileListResponse.result.files;
        if (files && files.length > 0) {
            displayFiles(files);
        } else {
            if (noFilesMessage) {
                noFilesMessage.textContent = `"${GOOGLE_AI_STUDIO_FOLDER_NAME}" フォルダ内にJSONファイルが見つかりませんでした。`;
                noFilesMessage.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error listing files:', error);
        showError(`ファイルの取得に失敗しました: ${error.result ? error.result.error.message : error.message}`);
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (error.status === 401 || error.status === 403) {
            handleSignoutClick();
            alert("認証エラーが発生しました。再度ログインしてください。");
        }
    }
}

/**
 * ファイル名の正規化 (空白をハイフンに)
 * @param {string} originalName
 * @returns {string}
 */
function normalizeFileName(originalName) {
    const nameWithoutExtension = originalName.replace(/\.json$/i, '');
    return nameWithoutExtension.replace(/\s+/g, '-');
}

/**
 * 取得したファイルリストをHTMLに描画
 * @param {Array<Object>} files
 */
function displayFiles(files) {
    if (!fileListElement) return;
    fileListElement.innerHTML = ''; 
    files.forEach(file => {
        const listItem = document.createElement('li');
        
        const fileNameSpan = document.createElement('span');
        fileNameSpan.textContent = file.name;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('file-actions');

        const normalizedBaseName = normalizeFileName(file.name);

        const downloadJsonButton = document.createElement('button');
        downloadJsonButton.textContent = 'JSON形式でDL';
        downloadJsonButton.onclick = () => handleDownloadFile(file.id, `${normalizedBaseName}.json`, 'application/json');
        
        const downloadMdButton = document.createElement('button');
        downloadMdButton.textContent = 'MD形式でDL';
        downloadMdButton.onclick = () => handleDownloadFile(file.id, `${normalizedBaseName}.md`, 'text/markdown', true);

        actionsDiv.appendChild(downloadJsonButton);
        actionsDiv.appendChild(downloadMdButton);
        
        listItem.appendChild(fileNameSpan);
        listItem.appendChild(actionsDiv);
        fileListElement.appendChild(listItem);
    });
}

/**
 * ファイルをダウンロードする処理
 * @param {string} fileId
 * @param {string} downloadFileName
 * @param {string} mimeType
 * @param {boolean} [isEmptyMarkdown=false]
 */
async function handleDownloadFile(fileId, downloadFileName, mimeType, isEmptyMarkdown = false) {
    if (!gapi.client.getToken()) {
        showError('認証されていません。ログインしてください。');
        updateSigninStatus(false);
        return;
    }
    try {
        let fileContent;
        if (isEmptyMarkdown) {
            fileContent = ""; 
        } else {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            fileContent = response.body;
        }
        
        downloadHelper(downloadFileName, fileContent, mimeType);

    } catch (error) {
        console.error('Error downloading file:', error);
        showError(`ファイルダウンロードエラー: ${error.result ? error.result.error.message : error.message}`);
        if (error.status === 401 || error.status === 403) {
            handleSignoutClick();
            alert("認証エラーが発生しました。再度ログインしてください。");
        }
    }
}

/**
 * ダウンロードヘルパー関数
 * @param {string} filename
 * @param {string} content
 * @param {string} mimeType
 */
function downloadHelper(filename, content, mimeType) {
    const element = document.createElement('a');
    const blob = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
}

/**
 * エラーメッセージ表示 (簡易)
 * @param {string} message
 */
function showError(message) {
    console.error(message);
    alert(message);
}

// --- 初期化処理 ---
// DOMContentLoadedはtype="module"では通常不要ですが、念のため。
// scriptの実行はDOM解析後なので、要素は利用可能です。
if (authorizeButton) {
    authorizeButton.onclick = handleAuthClick;
}
if (signoutButton) {
    signoutButton.onclick = handleSignoutClick;
}
// 初期状態ではログインボタンのみ表示（maybeEnableAuthUIで制御されるが、CSSで非表示のものが多いため）
if (authorizeButton) authorizeButton.style.display = 'none'; // maybeEnableAuthUIで表示に切り替わる
if (signoutButton) signoutButton.style.display = 'none';
if (contentSection) contentSection.style.display = 'none';

// 初期状態ではログインボタンが表示されるべきなので、maybeEnableAuthUIの呼び出し後に表示されることを期待。
// もしgisLoaded/gapiLoadedが先に呼ばれると、maybeEnableAuthUIが実行され、
// authorizeButton.style.display = 'block'がセットされる。
// 安全のため、初期状態をCSSで制御するか、明示的にここで設定する。
// Pico.cssはデフォルトでボタンを表示するため、JavaScript側で初期非表示を制御する。
document.addEventListener('DOMContentLoaded', () => {
    // ここで初期UI状態を確定させる（例：ログインボタン以外非表示）
    if (authorizeButton) authorizeButton.style.display = 'none'; // GIS/GAPIロード後に表示される
    if (signoutButton) signoutButton.style.display = 'none';
    if (contentSection) contentSection.style.display = 'none';
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (noFilesMessage) noFilesMessage.style.display = 'none';
});
