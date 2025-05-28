// src/config.js

// TODO: GitHub Appを作成し、以下の値を設定してください。
// 詳細は develop.md を参照してください。

// あなたのGitHub AppのClient ID (通常 "iv1." で始まる)
export const GITHUB_CLIENT_ID = 'Iv23lim16B3zSRXIyb9I';

// あなたのGitHub Appに登録したUser authorization callback URL
// このアプリケーションがホストされているURLと一致させる必要があります。
export const REDIRECT_URI = 'http://localhost:3333';

// Gist APIのスコープ (GitHub AppのUser Permissionsで設定したものと一致させる)
// User-to-Serverトークンリクエスト時に scope パラメータとして使用
export const GITHUB_OAUTH_SCOPES = 'gist';