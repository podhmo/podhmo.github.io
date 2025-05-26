// script.js - ESM (ECMAScript Modules)

// --- 定数定義 ---
const CLIENT_ID = '1069760790971-k5fl0p0qkmedqvpqun9k6atnmc5pl4mh.apps.googleusercontent.com'; // TODO: 取得したクライアントIDに置き換えてください
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
            q: `'${aiStudioFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
            orderBy: 'modifiedTime desc',
            fields: 'files(id, name, createdTime, modifiedTime)',
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
        fileNameSpan.textContent = `${file.name} (${file.createdTime})`; // 時刻を右寄せにしたい        
        
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('file-actions');

        const normalizedBaseName = normalizeFileName(file.name);

        const downloadJsonButton = document.createElement('button');
        downloadJsonButton.textContent = 'JSON形式でDL';
        downloadJsonButton.onclick = () => handleDownloadFile(file.id, `${normalizedBaseName}.json`, 'application/json');
        
        const downloadMdButton = document.createElement('button');
        downloadMdButton.textContent = 'MD形式でDL';
        downloadMdButton.onclick = () => handleDownloadFile(file.id, `${normalizedBaseName}.md`, 'text/markdown', (jsonText => {
            const withThouts = true; // AIの思考プロセスを表示するかどうか
            const userName = 'ユーザー';
            const aiName = 'AI';
            const onlyUserInputs = false; // ユーザーの入力のみを表示するかどうか
            return formatChatHistoryToMarkdown(JSON.parse(jsonText), withThouts, userName, aiName, onlyUserInputs);
        }));

        actionsDiv.appendChild(downloadJsonButton);
        actionsDiv.appendChild(downloadMdButton);
        
        listItem.appendChild(fileNameSpan);
        listItem.appendChild(actionsDiv);
        fileListElement.appendChild(listItem);
    });
}

/**
 * ファイルをダウンロードする処理 (Fetch API + TextDecoder版)
 * @param {string} fileId
 * @param {string} downloadFileName
 * @param {string} mimeType
 * @param {function} transformFunction - オプション: ファイル内容を変換する関数 (例: JSONをMarkdownに変換)
 */
async function handleDownloadFile(fileId, downloadFileName, mimeType, transformFunction = null) {
    const token = gapi.client.getToken();
    if (!token) {
        showError('認証されていません。ログインしてください。');
        updateSigninStatus(false);
        return;
    }
    
    try {
        let fileContent = "";

        // --- Fetch API を使用してファイル内容を ArrayBuffer で取得 ---
        // NOTE: gapi.client.drive.files.get ではなく、Fetch APIを使用 (勝手にjsの文字列(UTF-16)に変換されるのを防ぐため。しかもencodingを無視する)
        // 似たようなissue: https://github.com/googleapis/google-api-nodejs-client/issues/1151 
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const fetchResponse = await fetch(url, {
            method: 'GET',
            headers: {
                // 取得したアクセストークンをAuthorizationヘッダーに含める
                'Authorization': `Bearer ${token.access_token}`
            }
        });

        // HTTPステータスコードがエラーを示す場合は例外をスロー
        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text(); // エラーレスポンスのボディを取得
            // エラーメッセージにステータスコードとボディを含める
            throw new Error(`ファイルダウンロードHTTPエラー！ ステータス: ${fetchResponse.status}, レスポンスボディ: ${errorText.substring(0, 200)}...`); // ボディが長い場合を考慮
        }

        // レスポンスボディを ArrayBuffer (生のバイトデータ) として取得
        const arrayBuffer = await fetchResponse.arrayBuffer();

        // 取得した ArrayBuffer を TextDecoder を使って明示的に UTF-8 としてデコード
        const decoder = new TextDecoder('utf-8');
        fileContent = decoder.decode(arrayBuffer);
        // ------------------------------------------------------
        
        // downloadHelper にデコード済みの UTF-8 文字列と適切な MIME タイプを渡す
        const finalMimeType = mimeType.includes('charset') ? mimeType : `${mimeType};charset=utf-8`;

        // transformFunctionが指定されている場合は変換を適用
        if (transformFunction && typeof transformFunction === 'function') {
            fileContent = transformFunction(fileContent);
        }
        downloadHelper(downloadFileName, fileContent, finalMimeType);

    } catch (error) {
        console.error('Error downloading file:', error);
        // エラーメッセージを組み立てて表示
        const errorMessage = error.message || '不明なファイルダウンロードエラー';
        showError(`ファイルダウンロードエラー: ${errorMessage}`);
        
        // 認証関連のエラー（401 Unauthorized, 403 Forbidden）の場合、サインアウト処理を行う
        // Fetchエラーメッセージにステータスコードが含まれるか確認
        if (errorMessage.includes('ステータス: 401') || errorMessage.includes('ステータス: 403')) {
             handleSignoutClick();
             alert("認証エラーが発生しました。再度ログインしてください。");
        } else if (error.status === 401 || error.status === 403) { // gapiエラーオブジェクトの可能性も考慮 (念のため)
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

 
// interface SafetySetting {
//     category: string;
//     threshold: string;
// }

// interface RunSettings {
//     temperature: number;
//     model: string;
//     topP: number;
//     topK: number;
//     maxOutputTokens: number;
//     safetySettings: SafetySetting[];
//     responseMimeType: string;
//     enableCodeExecution: boolean;
//     enableSearchAsATool: boolean;
//     enableBrowseAsATool: boolean;
//     enableAutoFunctionResponse: boolean;
// }

// interface Chunk {
//     text?: string;
//     role: "user" | "model";
//     tokenCount?: number;
//     isThought?: boolean;
//     finishReason?: string;
// }

// interface ChunkedPrompt {
//     chunks: Chunk[];
//     pendingInputs?: unknown[];
// }

// interface ChatHistory {
//     runSettings: RunSettings;
//     systemInstruction?: Record<string, unknown>;
//     chunkedPrompt: ChunkedPrompt;
// }


/**
 * チャット履歴をMarkdown形式にフォーマットする関数
 * @param {object} chatHistory - チャット履歴オブジェクト
 * @param {boolean} withThoughts - 思考プロセスを含めるかどうか
 * @param {string} userName - ユーザー名
 * @param {string} aiName - AI名
 * @param {boolean} onlyUserInputs - ユーザーの入力のみを表示するかどうか
 * @returns {string} - フォーマットされたMarkdown文字列
 */
function formatChatHistoryToMarkdown(
    chatHistory,
    withThoughts,
    userName,
    aiName,
    onlyUserInputs,
) {
    const outputParts = [];

    if (onlyUserInputs) {
        outputParts.push("## ユーザー入力履歴\n\n");
        const userChunks = chatHistory.chunkedPrompt.chunks.filter((chunk) =>
            chunk.role === "user"
        );
        userChunks.forEach((chunk, index) => {
            if (chunk.text === undefined || chunk.text.trim() === "") {
                // ユーザーの入力が空の場合はスキップ
                return;
            }
            outputParts.push(`${userName}:\n${chunk.text.trim()}`);
            if (index < userChunks.length - 1) {
                outputParts.push("\n\n---\n\n");
            } else {
                outputParts.push("\n\n"); // 最後の入力の後
            }
        });
        if (userChunks.length === 0) {
            outputParts.push("\n"); // 履歴がない場合、ヘッダーの後に改行
        }
    } else {
        outputParts.push("## 対話履歴\n\n");

        const displayBlocks = [];
        let currentAiBlockContent = [];
        let currentAiBlockHasThought = false;

        for (const chunk of chatHistory.chunkedPrompt.chunks) {
            if (chunk.role === "user") {
                // 現在処理中のAIブロックがあれば確定
                if (currentAiBlockContent.length > 0) {
                    displayBlocks.push({
                        type: "ai",
                        content: currentAiBlockContent,
                    });
                    currentAiBlockContent = [];
                    currentAiBlockHasThought = false;
                }

                if(chunk.text === undefined || chunk.text.trim() === "") {
                    // ユーザーの入力が空の場合はスキップ
                    continue;
                }

                // Userブロックを追加
                displayBlocks.push({
                    type: "user",
                    content: [`${userName}:\n${chunk.text.trim()}`],
                });
            } else if (chunk.role === "model") {
                if (chunk.isThought) {
                    if (withThoughts) {
                        currentAiBlockHasThought = true;
                        // 思考プロセスの開始前に改行が必要な場合 (例: AIの返答が先に来ていた場合)
                        if (
                            currentAiBlockContent.length > 0 &&
                            !currentAiBlockContent.at(-1)?.includes(
                                "</summary>",
                            )
                        ) {
                            currentAiBlockContent.push("");
                        }
                        currentAiBlockContent.push("<details>");
                        currentAiBlockContent.push(
                            "<summary>AIの思考プロセス</summary>",
                        );
                        currentAiBlockContent.push(""); // summaryと内容の間に空行
                        chunk.text.trim().split("\n").forEach((line) =>
                            currentAiBlockContent.push(line)
                        );
                        currentAiBlockContent.push("</details>");
                    }
                } else { // AIの実際の返答
                    // AIの返答前に改行が必要な場合 (例: 思考プロセスが先に来ていた場合)
                    if (
                        currentAiBlockContent.length > 0 &&
                        !currentAiBlockContent.at(-1)?.startsWith(aiName + ":")
                    ) {
                        currentAiBlockContent.push("");
                    }
                    currentAiBlockContent.push(
                        `${aiName}:\n${chunk.text.trim()}`,
                    );
                }
            }
        }
        // 最後のAIブロックが残っていれば追加
        if (currentAiBlockContent.length > 0) {
            displayBlocks.push({ type: "ai", content: currentAiBlockContent });
        }

        // displayBlocksを結合して出力
        displayBlocks.forEach((block, index) => {
            outputParts.push(block.content.join("\n"));
            if (index < displayBlocks.length - 1) {
                outputParts.push("\n\n---\n\n");
            } else {
                outputParts.push("\n\n"); // 最後のブロックの後
            }
        });
        if (displayBlocks.length === 0) {
            outputParts.push("\n");
        }
    }

    // メタデータの追加
    outputParts.push("## メタデータ\n\n");
    outputParts.push("```json\n");
    outputParts.push(JSON.stringify(chatHistory.runSettings, null, 2));
    outputParts.push("\n```\n");

    return outputParts.join("");
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
