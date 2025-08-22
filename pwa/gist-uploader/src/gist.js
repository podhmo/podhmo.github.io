// src/gist.js (変更なし)

const GITHUB_API_BASE_URL = 'https://api.github.com';

/**
 * GitHub Gistを作成します。
 * @param {string} accessToken - GitHubアクセストークン (User-to-Server)
 * @param {object} gistData - Gistデータ
 * @param {string} gistData.description - Gistの説明
 * @param {boolean} gistData.public - 公開フラグ (true: public, false: secret)
 * @param {object} gistData.files - ファイルオブジェクト e.g., { "filename.txt": { "content": "File content" } }
 * @returns {Promise<object>} 作成されたGistのレスポンスデータ
 * @throws {Error} APIリクエストが失敗した場合
 */
export async function createGist(accessToken, { description, public: isPublic, files }) {
    if (!Object.keys(files).length) {
        throw new Error('ファイルが指定されていません。');
    }

    const response = await fetch(`${GITHUB_API_BASE_URL}/gists`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            description,
            public: isPublic,
            files,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error creating Gist' }));
        console.error('Gist creation failed:', errorData);
        throw new Error(`Gistの作成に失敗しました: ${errorData.message || response.statusText}`);
    }

    return response.json();
}