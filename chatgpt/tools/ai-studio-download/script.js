// TODO: 取得したクライアントIDに置き換えてください
const CLIENT_ID = '1069760790971-k5fl0p0qkmedqvpqun9k6atnmc5pl4mh.apps.googleusercontent.com'; 
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

// Markdownダウンロードオプション用のDOM要素を取得
const includeThoughtsCheckbox = document.getElementById('includeThoughtsCheckbox');
const onlyUserInputsCheckbox = document.getElementById('onlyUserInputsCheckbox');


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
        // その後の処理はコールバックで行う
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
            // UIの状態を読み取り、オプションオブジェクトを作成して渡す
            const options = {
                withThoughts: includeThoughtsCheckbox ? includeThoughtsCheckbox.checked : false,
                onlyUserInputs: onlyUserInputsCheckbox ? onlyUserInputsCheckbox.checked : false,
                userName: 'ユーザー', // 固定値として保持
                aiName: 'AI',       // 固定値として保持
            };
            return formatChatHistoryToMarkdown(JSON.parse(jsonText), options);
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
 * Markdown変換オプションの型定義 (JSDoc用)
 * @typedef {Object} MarkdownConversionOptions
 * @property {boolean} [withThoughts=false] - 思考プロセスを含めるかどうか
 * @property {string} [userName='ユーザー'] - ユーザーとして表示する名前
 * @property {string} [aiName='AI'] - AIとして表示する名前
 * @property {boolean} [onlyUserInputs=false] - ユーザーの入力のみを表示するかどうか
 */


/**
 * チャット履歴をMarkdown形式にフォーマットする関数
 * @param {object} chatHistory - チャット履歴オブジェクト
 * @param {MarkdownConversionOptions} options - Markdown変換オプション
 * @returns {string} - フォーマットされたMarkdown文字列
 */
function formatChatHistoryToMarkdown(
    chatHistory,
    options = {} // デフォルト値として空オブジェクトを指定
) {
    // オプションのデフォルト値を設定
    const {
        withThoughts = false,
        userName = 'ユーザー',
        aiName = 'AI',
        onlyUserInputs = false,
    } = options;

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
            // バッククォートで始まる場合は先頭に改行を追加
            const trimmedUserText = chunk.text.trim();
            const userNeedsLeadingNewline = trimmedUserText.startsWith('`');
            const userTextFormatted = userNeedsLeadingNewline 
                ? `\n${trimmedUserText}` 
                : trimmedUserText;
            outputParts.push(`${userName}:${userTextFormatted}`);
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
        // let currentAiBlockHasThought = false; // このフラグは不要になった

        for (const chunk of chatHistory.chunkedPrompt.chunks) {
            if (chunk.role === "user") {
                // 現在処理中のAIブロックがあれば確定
                if (currentAiBlockContent.length > 0) {
                    displayBlocks.push({
                        type: "model", // AIブロックは'model'ロールとして扱う
                        content: currentAiBlockContent,
                    });
                    currentAiBlockContent = [];
                }

                if(chunk.text === undefined || chunk.text.trim() === "") {
                    // ユーザーの入力が空の場合はスキップ
                    continue;
                }

                // Userブロックを追加
                // バッククォートで始まる場合は先頭に改行を追加
                const trimmedUserText = chunk.text.trim();
                const userNeedsLeadingNewline = trimmedUserText.startsWith('`');
                const userTextFormatted = userNeedsLeadingNewline 
                    ? `\n${trimmedUserText}` 
                    : trimmedUserText;
                displayBlocks.push({
                    type: "user",
                    content: [`${userName}:${userTextFormatted}`],
                });
            } else if (chunk.role === "model") {
                if (chunk.isThought) {
                    if (withThoughts) {
                        // 思考プロセスの開始前に改行が必要な場合 (例: AIの返答が先に来ていた場合)
                         if (
                            currentAiBlockContent.length > 0 &&
                            !currentAiBlockContent.at(-1)?.includes(
                                "</summary>",
                            ) && // 直前が思考プロセスでなければ
                            !currentAiBlockContent.at(-1)?.startsWith(aiName + ":") // 直前がAIの返答でなければ
                        ) {
                           // currentAiBlockContent.push(""); // summaryの前に空行は不要かもしれない
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
                        if (chunk.finishReason) { // 思考プロセスの後にfinishReasonがある場合
                             currentAiBlockContent.push(`\n(思考終了理由: ${chunk.finishReason})`);
                        }
                    }
                } else { // AIの実際の返答
                    // AIの返答前に改行が必要な場合 (例: 思考プロセスが先に来ていた場合)
                    if (
                        currentAiBlockContent.length > 0 &&
                        !currentAiBlockContent.at(-1)?.startsWith(aiName + ":") && // 直前がAIの返答でなければ
                        !currentAiBlockContent.at(-1)?.includes("</details>") // 直前が思考プロセスの閉じタグでなければ
                    ) {
                        // currentAiBlockContent.push(""); // AIの返答の前に空行は不要かもしれない
                    }
                    // バッククォートで始まる場合は先頭に改行を追加
                    const trimmedText = chunk.text.trimEnd();
                    const needsLeadingNewline = trimmedText.startsWith('`');
                    const textWithProperFormatting = needsLeadingNewline 
                        ? `\n${trimmedText}` 
                        : trimmedText;
                    currentAiBlockContent.push(
                        `${aiName}:${textWithProperFormatting}`,
                    );
                     if (chunk.finishReason) { // 返答の後にfinishReasonがある場合
                         currentAiBlockContent.push(`\n(返答終了理由: ${chunk.finishReason})`);
                     }
                }
            }
        }
        // 最後のAIブロックが残っていれば追加
        if (currentAiBlockContent.length > 0) {
            displayBlocks.push({ type: "model", content: currentAiBlockContent });
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
    // runSettings と systemInstruction をメタデータとして追加
    const metadata = {
        runSettings: chatHistory.runSettings,
        systemInstruction: chatHistory.systemInstruction || null, // systemInstruction が存在しない場合を考慮
    };
    outputParts.push(JSON.stringify(metadata, null, 2));
    outputParts.push("\n```\n");

    return outputParts.join("");
}


// --- 初期化処理 ---
// DOMContentLoadedはtype="module"では通常不要ですが、念のため。
// scriptの実行はDOM解析後なので、要素は利用可能です。
// ただし、async defer属性が付いているため、DOMContentLoadedを待つ方が安全。
document.addEventListener('DOMContentLoaded', () => {
    if (authorizeButton) {
        authorizeButton.onclick = handleAuthClick;
    }
    if (signoutButton) {
        signoutButton.onclick = handleSignoutClick;
    }
    // 初期UI状態を設定
    if (authorizeButton) authorizeButton.style.display = 'none'; // GIS/GAPIロード後に表示される
    if (signoutButton) signoutButton.style.display = 'none';
    if (contentSection) contentSection.style.display = 'none';
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (noFilesMessage) noFilesMessage.style.display = 'none';

    // オプションチェックボックスの初期状態を設定（HTMLでcheckedがあればそれが優先される）
    // なければJSでデフォルト値を設定することも可能だが、HTMLに任せる
    // 例：if (includeThoughtsCheckbox && includeThoughtsCheckbox.checked === undefined) includeThoughtsCheckbox.checked = true;
});

/* 歴史的経緯により、以下のスクリプトタグはHTMLに直接書くことが推奨されているが、esmとの呼び出し関係を気にするために動的に生成する
<script async defer src="https://apis.google.com/js/api.js" onload="gapiLoaded()"></script>
<script async defer src="https://accounts.google.com/gsi/client" onload="gisLoaded()"></script>
 */

// --- Google API ライブラリロード完了時のコールバック ---
// これらはグローバルスコープに公開する必要があるため、windowオブジェクトにアタッチします。
window.gapiLoaded = () => {
    gapi.load('client', initializeGapiClient);
};

window.gisLoaded = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        // https://developers.google.com/identity/oauth2/web/reference/js-reference?hl=en
        callback: async (response) => {
            if (response.error) {
                console.error('Access token error:', err);
                showError('認証に失敗しました。');
                updateSigninStatus(false);
                return
            }
            gapi.client.setToken(response);
            updateSigninStatus(true);
            await listFilesInAiStudioFolder();
        },
        error_callback: (error) => {
            console.error('Error during token request:', error);
            showError('認証に失敗しました。');
            updateSigninStatus(false);
        }
    });
    gisInited = true;
    maybeEnableAuthUI();
};

(() => {
    // 動的にスクリプトタグを生成してGoogle APIライブラリを読み込む
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = window.gapiLoaded; // onloadイベントでコールバックを呼び出す
    document.head.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = window.gisLoaded; // onloadイベントでコールバックを呼び出す
    document.head.appendChild(gisScript);
})();
