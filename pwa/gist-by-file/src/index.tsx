/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { FC, PropsWithChildren } from "hono/jsx";

// Cloudflare Workers では env はリクエスト毎に c.env から読む
type Bindings = {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  BASE_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// BASE_URL 未設定時はリクエストの origin を使う（dev は localhost、本番は Workers の URL）
const baseUrl = (env: Bindings, reqUrl: string): string =>
  env.BASE_URL || new URL(reqUrl).origin;

// 型定義
interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  html_url: string;
}

// --- Components ---

const Layout: FC<PropsWithChildren> = (props) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Gist Uploader</title>
        {/* Pico CSS v2 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
        <style>
          {`
          /* モバイルファースト調整 */
          header {
            padding: 1rem 0;
            border-bottom: 1px solid var(--pico-muted-border-color);
            margin-bottom: 2rem;
          }
          .profile-card {
            text-align: center;
            padding: 2rem;
          }
          .profile-avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            margin-bottom: 1rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        `}
        </style>
        <script dangerouslySetInnerHTML={{
          __html: `
          // モバイルファースト ファイルアップロード機能
          document.addEventListener('DOMContentLoaded', function() {
            const fileInput = document.getElementById('file-input');
            const filePreview = document.getElementById('file-preview');
            const fileList = document.getElementById('file-list');
            const uploadBtn = document.getElementById('upload-btn');
            const clearBtn = document.getElementById('clear-btn');
            const uploadProgress = document.getElementById('upload-progress');
            const uploadResult = document.getElementById('upload-result');

            let selectedFiles = [];

            // Gist URLからIDを抽出する関数
            function extractGistId(url) {
              if (!url || url.trim() === '') return null;

              // URLからGist IDを抽出
              // 例: https://gist.github.com/podhmo/b73d88ae90a35c94db109183a4d22eb7
              // 例: https://gist.github.com/podhmo/b73d88ae90a35c94db109183a4d22eb7#file-c2pa-md
              // 注意: このパターンはサーバー側のバリデーションと一致させる必要があります
              const match = url.match(/gist\\.github\\.com\\/[^\\/]+\\/([a-fA-F0-9]+)/);
              return match ? match[1] : null;
            }

            // Gist URL入力の監視
            const gistUrlInput = document.getElementById('gist-url-input');
            if (gistUrlInput && uploadBtn) {
              gistUrlInput.addEventListener('input', function() {
                const gistId = extractGistId(gistUrlInput.value);
                if (gistId) {
                  uploadBtn.textContent = '🔄 Gistを更新';
                } else {
                  uploadBtn.textContent = '🚀 Gistを作成';
                }
              });
            }

            // ファイル選択イベント
            if (fileInput) {
              fileInput.addEventListener('change', handleFileSelect, false);
            }

            function handleFileSelect(e) {
              const files = e.target.files;
              handleFiles(files);
            }

            async function handleFiles(files) {
              selectedFiles = Array.from(files);
              await displayFiles();
            }

            async function displayFiles() {
              if (selectedFiles.length === 0) {
                filePreview.style.display = 'none';
                return;
              }

              fileList.innerHTML = '';

              for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const fileDiv = document.createElement('div');
                let content = '';

                // テキストファイルの場合は内容を読み取り
                if (file.type.startsWith('text/') || file.name.match(/\\.(js|ts|jsx|tsx|py|md|txt|json|html|css)$/i)) {
                  try {
                    content = await file.text();
                  } catch (e) {
                    content = '[ファイルを読み取れませんでした]';
                  }
                }

                fileDiv.innerHTML = \`
                  <details style="margin-bottom: 0.5rem; padding: 0.5rem; border: 1px solid var(--pico-muted-border-color); border-radius: 0.25rem;">
                    <summary>
                      <input
                        type="text"
                        value="\${file.name}"
                        data-file-index="\${i}"
                        class="filename-input"
                        style="width: 70%; display: inline-block; margin-right: 0.5rem; font-size: 0.9em;"
                        onclick="event.stopPropagation();"
                      />
                      <small>(\${(file.size / 1024).toFixed(1)} KB)</small>
                    </summary>
                    \${content ? '<pre style="font-size: 0.8em; background: var(--pico-card-background-color); padding: 0.5rem; border-radius: 0.25rem; max-height: 200px; overflow: auto;">' + (content.length > 1000 ? content.substring(0, 1000) + '...' : content) + '</pre>' : '<p>バイナリファイル</p>'}
                  </details>
                \`;
                fileList.appendChild(fileDiv);
              }

              filePreview.style.display = 'block';
            }

            // クリアボタン
            if (clearBtn) {
              clearBtn.addEventListener('click', function() {
                selectedFiles = [];
                fileInput.value = '';
                filePreview.style.display = 'none';
                uploadResult.style.display = 'none';
              });
            }

            // アップロードボタン
            if (uploadBtn) {
              uploadBtn.addEventListener('click', async function() {
              if (selectedFiles.length === 0) return;

              // Gistの可視性設定を取得
              const isPublic = document.querySelector('input[name="gist-visibility"]:checked').value === 'public';

              // Gist URLを取得
              const gistUrlInput = document.getElementById('gist-url-input');
              const gistUrl = gistUrlInput ? gistUrlInput.value.trim() : '';
              const gistId = extractGistId(gistUrl);

              // Gist Descriptionを取得
              const gistDescriptionInput = document.getElementById('gist-description-input');
              const gistDescription = gistDescriptionInput ? gistDescriptionInput.value.trim() : '';

              // 各ファイルの変更後のファイル名を取得
              const filenameInputs = document.querySelectorAll('.filename-input');
              const filenameMap = {};
              filenameInputs.forEach((input, index) => {
                filenameMap[index] = input.value.trim() || selectedFiles[index].name;
              });

              const formData = new FormData();
              selectedFiles.forEach((file, index) => {
                formData.append('files', file);
                formData.append('filenames', filenameMap[index]);
              });
              formData.append('public', isPublic.toString());
              if (gistId) {
                formData.append('gist_id', gistId);
              }
              if (gistDescription) {
                formData.append('description', gistDescription);
              }

              try {
                // プログレステキストを更新
                const action = gistId ? '更新' : '作成';
                const progressText = document.getElementById('upload-progress-text');
                if (progressText) {
                  progressText.textContent = \`🚀 Gistを\${action}中...\`;
                }

                uploadProgress.style.display = 'block';
                uploadResult.style.display = 'none';

                const response = await fetch('/api/gist/create', {
                  method: 'POST',
                  body: formData
                });

                const result = await response.json();

                uploadProgress.style.display = 'none';
                uploadResult.style.display = 'block';

                if (result.success) {
                  uploadResult.innerHTML = \`
                    <article style="border-color: var(--pico-ins-color);">
                      <header>✅ Gistの\${action}が完了しました！</header>
                      <p><a href="\${result.gist_url}" target="_blank">\${result.gist_url}</a></p>
                      <footer>
                        <button onclick="if(navigator.clipboard){navigator.clipboard.writeText('\${result.gist_url}')}" class="outline">URLをコピー</button>
                      </footer>
                    </article>
                  \`;
                } else {
                  uploadResult.innerHTML = \`
                    <article style="border-color: var(--pico-del-color);">
                      <header>❌ エラーが発生しました</header>
                      <p>\${result.error || 'Gistの作成に失敗しました'}</p>
                    </article>
                  \`;
                }
              } catch (error) {
                uploadProgress.style.display = 'none';
                uploadResult.style.display = 'block';
                uploadResult.innerHTML = \`
                  <article style="border-color: var(--pico-del-color);">
                    <header>❌ ネットワークエラー</header>
                    <p>\${error.message}</p>
                  </article>
                \`;
              }
              });
            }
          });
          `
        }} />
      </head>
      <body>
        <header class="container">
          <nav>
            <ul>
              <li>
                <strong>GitHub Auth App</strong>
              </li>
            </ul>
          </nav>
        </header>
        <main class="container">
          {props.children}
        </main>
        <footer class="container">
          <small>Built with Hono & Cloudflare Workers</small>
        </footer>
      </body>
    </html>
  );
};

const LoginScreen: FC = () => (
  <Layout>
    <article>
      <header>ようこそ</header>
      <p>GitHubアカウントを使ってログインしてください。</p>
      <footer>
        <a href="/auth/login" role="button" class="contrast">
          GitHubでログイン
        </a>
      </footer>
    </article>
  </Layout>
);

const ProfileScreen: FC<{ user: GitHubUser }> = ({ user }) => (
  <Layout>
    <article class="profile-card">
      <img src={user.avatar_url} alt={user.login} class="profile-avatar" />
      <h2>Hello, {user.name || user.login}!</h2>
      <p>
        <a href={user.html_url} target="_blank">@{user.login}</a>
      </p>
      <div class="grid">
        <a href="/auth/logout" role="button" class="secondary outline">
          ログアウト
        </a>
      </div>
    </article>

    <FileUploadForm />
  </Layout>
);

const FileUploadForm: FC = () => (
  <article>
    <header>📁 Gistにファイルをアップロード</header>

    <div style={{ marginBottom: "1rem" }}>
      <label htmlFor="gist-url-input">
        🔗 Gist URL（更新する場合のみ入力）
        <input
          type="text"
          id="gist-url-input"
          placeholder="https://gist.github.com/username/gist_id"
          style={{ marginTop: "0.25rem" }}
        />
      </label>
      <small>空の場合は新規Gistを作成します</small>
    </div>

    <div style={{ marginBottom: "1rem" }}>
      <label htmlFor="gist-description-input">
        📝 Gist Description
        <input
          type="text"
          id="gist-description-input"
          placeholder="Gistの説明を入力"
          style={{ marginTop: "0.25rem" }}
        />
      </label>
      <small>空の場合は自動生成されます</small>
    </div>

    <div style={{ textAlign: "center", marginBottom: "1rem" }}>
      <input
        type="file"
        id="file-input"
        multiple
        style={{ display: "none" }}
      />
      <button
        type="button"
        onclick="document.getElementById('file-input').click()"
        class="contrast"
        style={{
          minHeight: "44px",
          fontSize: "1.1rem",
          padding: "0.75rem 1.5rem",
        }}
      >
        📎 ファイルを選択（複数可）
      </button>
    </div>

    <div id="file-preview" style={{ display: "none" }}>
      <h3>選択されたファイル</h3>
      <div id="file-list"></div>

      <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        <fieldset>
          <legend>📊 Gistの公開設定</legend>
          <label>
            <input
              type="radio"
              id="gist-public"
              name="gist-visibility"
              value="public"
              checked
            />
            🌍 Public（誰でも閲覧可能）
          </label>
          <label>
            <input
              type="radio"
              id="gist-secret"
              name="gist-visibility"
              value="secret"
            />
            🔒 Secret（URLを知っている人のみ）
          </label>
        </fieldset>
      </div>

      <div class="grid" style={{ marginTop: "1rem" }}>
        <button
          id="upload-btn"
          type="button"
          class="contrast"
          style={{
            minHeight: "44px",
            fontSize: "1.1rem",
          }}
        >
          🚀 Gistを作成
        </button>
        <button
          id="clear-btn"
          type="button"
          class="secondary outline"
          style={{
            minHeight: "44px",
            fontSize: "1rem",
          }}
        >
          🗑️ クリア
        </button>
      </div>
    </div>

    <div id="upload-progress" style={{ display: "none" }}>
      <p id="upload-progress-text">🚀 Gistを処理中...</p>
      <progress></progress>
    </div>

    <div id="upload-result" style={{ display: "none" }}></div>
  </article>
);

const ErrorScreen: FC<{ message: string; detail?: string }> = (
  { message, detail },
) => (
  <Layout>
    <article style={{ borderColor: "var(--pico-del-color)" }}>
      <header>⚠️ エラーが発生しました</header>
      <p>
        <strong>{message}</strong>
      </p>
      {detail && (
        <details>
          <summary>詳細情報</summary>
          <pre
            style={{
              fontSize: "0.8em",
              background: "var(--pico-card-background-color)",
              padding: "1rem",
              borderRadius: "0.25rem",
            }}
          >
            {detail}
          </pre>
        </details>
      )}
      <footer>
        <a href="/" role="button" class="secondary">トップへ戻る</a>
      </footer>
    </article>
  </Layout>
);

// --- Routes ---

app.get("/", (c) => {
  const userCookie = getCookie(c, "user_session");

  if (userCookie) {
    try {
      const user = JSON.parse(userCookie) as GitHubUser;
      return c.html(<ProfileScreen user={user} />);
    } catch {
      // Cookieが不正な場合は削除してログイン画面へ
      deleteCookie(c, "user_session");
    }
  }
  return c.html(<LoginScreen />);
});

app.get("/auth/login", (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return c.html(<ErrorScreen message="GITHUB_CLIENT_ID is not set" />, 500);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "read:user,gist",
    redirect_uri: `${baseUrl(c.env, c.req.url)}/auth/callback`,
  });

  return c.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
});

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  if (error) {
    return c.html(
      <ErrorScreen
        message={`GitHub認証エラー: ${error}`}
        detail={errorDescription || "詳細なエラー情報は提供されていません"}
      />,
    );
  }

  if (!code) {
    return c.html(<ErrorScreen message="認証コードが見つかりませんでした" />);
  }

  const clientId = c.env.GITHUB_CLIENT_ID;
  const clientSecret = c.env.GITHUB_CLIENT_SECRET;
  const url = baseUrl(c.env, c.req.url);

  if (!clientId || !clientSecret) {
    return c.html(
      <ErrorScreen message="Server configuration error: GitHub OAuth credentials not set" />,
      500,
    );
  }

  try {
    // 1. Access Tokenの取得
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      },
    );

    const tokenData = await tokenRes.json() as TokenResponse;
    if (tokenData.error) throw new Error(tokenData.error_description);

    const accessToken = tokenData.access_token;

    // 2. ユーザー情報の取得
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "Gist-Uploader",
      },
    });

    if (!userRes.ok) throw new Error("Failed to fetch user data");

    const userData = await userRes.json() as GitHubUser;

    // 必要な情報だけ抽出（アクセストークンも含める）
    const user: GitHubUser & { access_token?: string } = {
      login: userData.login,
      avatar_url: userData.avatar_url,
      name: userData.name,
      html_url: userData.html_url,
      access_token: accessToken,
    };

    // 3. Cookieに保存 (本番ではセッションIDのみを保存し、データはDB/KVに入れることを推奨)
    setCookie(c, "user_session", JSON.stringify(user), {
      httpOnly: true,
      secure: url.startsWith("https:"), // https のときだけ Secure を付ける (localhostでの動作確認用)
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1日
    });

    return c.redirect("/");
  } catch (e) {
    console.error("OAuth callback error:", e);
    const err = e instanceof Error ? e : new Error(String(e));
    return c.html(
      <ErrorScreen
        message="GitHub認証中にエラーが発生しました"
        detail={`Error: ${err.message}\nStack: ${
          err.stack || "No stack trace available"
        }`}
      />,
    );
  }
});

app.get("/auth/logout", (c) => {
  deleteCookie(c, "user_session");
  return c.redirect("/");
});

// Gist作成/更新API
app.post("/api/gist/create", async (c) => {
  // ユーザー認証確認
  const userCookie = getCookie(c, "user_session");
  if (!userCookie) {
    return c.json({ success: false, error: "認証が必要です" }, 401);
  }

  let user: GitHubUser & { access_token?: string };
  try {
    user = JSON.parse(userCookie);
  } catch {
    return c.json({ success: false, error: "認証情報が不正です" }, 401);
  }

  try {
    // multipart/form-dataからファイルを取得
    // all: true オプションで同じキーの複数の値を配列として取得
    const body = await c.req.parseBody({ all: true });
    const files = body.files;
    const publicParam = body.public;
    const gistId = body.gist_id as string | undefined;
    const customDescription = body.description as string | undefined;
    const customFilenames = body.filenames;

    if (!files) {
      return c.json({ success: false, error: "ファイルが見つかりません" }, 400);
    }

    // 可視性設定（デフォルト: public）
    // all: true の場合、単一の値でも配列になる可能性があるため配列から取得
    const publicValue = Array.isArray(publicParam) ? publicParam[0] : publicParam;
    const isPublic = publicValue === "true";

    // ファイル配列に変換
    const fileArray = Array.isArray(files) ? files : [files];

    if (fileArray.length === 0) {
      return c.json(
        { success: false, error: "ファイルが選択されていません" },
        400,
      );
    }

    // カスタムファイル名の配列を取得
    const filenameArray: string[] = customFilenames
      ? (Array.isArray(customFilenames)
        ? customFilenames.map(String)
        : [String(customFilenames)])
      : [];

    // Gist用のファイルオブジェクトを作成
    const gistFiles: Record<string, { content: string }> = {};

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (file instanceof File) {
        const content = await file.text();
        // カスタムファイル名がある場合はそれを使用、なければ元のファイル名
        const filename = filenameArray[i]?.trim() || file.name;
        gistFiles[filename] = { content };
      }
    }

    if (Object.keys(gistFiles).length === 0) {
      return c.json(
        { success: false, error: "有効なファイルが見つかりません" },
        400,
      );
    }

    // Gist IDがある場合は更新、ない場合は作成
    const isUpdate = !!gistId && gistId.trim() !== "";

    // Gist IDの検証（16進数文字のみ許可）
    // 注意: このパターンはクライアント側の extractGistId と一致させる必要があります
    if (isUpdate && !/^[a-fA-F0-9]+$/.test(gistId)) {
      return c.json(
        { success: false, error: "無効なGist IDです" },
        400,
      );
    }

    const apiUrl = isUpdate
      ? `https://api.github.com/gists/${gistId}`
      : "https://api.github.com/gists";
    const method = isUpdate ? "PATCH" : "POST";

    // GitHub APIでGistを作成または更新
    const gistData = {
      description: customDescription ||
        `${isUpdate ? "Updated" : "Uploaded"} via Gist Uploader - ${new Date().toISOString()}`,
      public: isPublic,
      files: gistFiles,
    };

    const gistResponse = await fetch(apiUrl, {
      method: method,
      headers: {
        "Authorization": `Bearer ${getAccessTokenFromUser(user)}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "Gist-Uploader",
      },
      body: JSON.stringify(gistData),
    });

    if (!gistResponse.ok) {
      const error = await gistResponse.text();
      console.error("GitHub API error:", error);
      return c.json({
        success: false,
        error: `GitHub API エラー (HTTP ${gistResponse.status})`,
      }, 500);
    }

    const gistResult = await gistResponse.json() as {
      html_url: string;
      id: string;
    };

    return c.json({
      success: true,
      gist_url: gistResult.html_url,
      gist_id: gistResult.id,
    });
  } catch (error) {
    console.error("Gist creation/update error:", error);
    const err = error instanceof Error ? error : new Error(String(error));
    return c.json({
      success: false,
      error: err.message || "Gist作成/更新中にエラーが発生しました",
    }, 500);
  }
});

// アクセストークンを取得する関数
function getAccessTokenFromUser(
  userWithToken: GitHubUser & { access_token?: string },
): string {
  if (!userWithToken.access_token) {
    throw new Error("Access token not found in user session");
  }
  return userWithToken.access_token;
}

export default app;
