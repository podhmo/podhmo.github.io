// src/config.js

// TODO: GitHub OAuth Appを作成し、以下の値を設定してください。
// 詳細は develop.md を参照してください。

// あなたのGitHub OAuth AppのClient ID
export const GITHUB_CLIENT_ID = 'Ov23limGGzT5fSnmXTPw';
    
// あなたのGitHub OAuth Appに登録したAuthorization callback URL
// このアプリケーションがホストされているURLと一致させる必要があります。
export const REDIRECT_URI = 'http://localhost:3333/index.html';
// export const REDIRECT_URI = 'https//podhmo.github.io/pwa/gist-uploader/';

// Gist APIのスコープ
export const GITHUB_OAUTH_SCOPES = 'gist';