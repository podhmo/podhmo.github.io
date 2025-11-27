/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { load } from "@std/dotenv";
import type { FC, PropsWithChildren } from "hono/jsx";

// ローカル開発時に .env ファイルを読み込む
await load({ export: true });

const app = new Hono();

// 環境変数
const CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET");
const BASE_URL = Deno.env.get("BASE_URL") || "http://localhost:8000";

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
        <title>Hono GitHub Login</title>
        {/* Pico CSS v2 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
        <style>{`
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
        `}</style>
      </head>
      <body>
        <header class="container">
          <nav>
            <ul>
              <li><strong>GitHub Auth App</strong></li>
            </ul>
          </nav>
        </header>
        <main class="container">
          {props.children}
        </main>
        <footer class="container">
          <small>Built with Hono & Deno</small>
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
  </Layout>
);

const ErrorScreen: FC<{ message: string }> = ({ message }) => (
  <Layout>
    <article style={{ borderColor: "var(--pico-del-color)" }}>
      <header>エラーが発生しました</header>
      <p>{message}</p>
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
  if (!CLIENT_ID) return c.text("GITHUB_CLIENT_ID is not set", 500);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: "read:user",
    redirect_uri: `${BASE_URL}/auth/callback`,
  });

  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.html(<ErrorScreen message="認証コードが見つかりませんでした" />);
  if (!CLIENT_ID || !CLIENT_SECRET) return c.text("Server config error", 500);

  try {
    // 1. Access Tokenの取得
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });
    
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description);

    const accessToken = tokenData.access_token;

    // 2. ユーザー情報の取得
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "Hono-Deno-App",
      },
    });

    if (!userRes.ok) throw new Error("Failed to fetch user data");

    const userData = await userRes.json();
    
    // 必要な情報だけ抽出
    const user: GitHubUser = {
      login: userData.login,
      avatar_url: userData.avatar_url,
      name: userData.name,
      html_url: userData.html_url,
    };

    // 3. Cookieに保存 (本番ではセッションIDのみを保存し、データはDB/KVに入れることを推奨)
    setCookie(c, "user_session", JSON.stringify(user), {
      httpOnly: true,
      secure: true, // HTTPS環境(localhost以外)では必須に近いが、動作確認のため環境に合わせて調整してください
      path: "/",
      maxAge: 60 * 60 * 24, // 1日
    });

    return c.redirect("/");

  } catch (e: any) {
    console.error(e);
    return c.html(<ErrorScreen message={e.message || "認証中にエラーが発生しました"} />);
  }
});

app.get("/auth/logout", (c) => {
  deleteCookie(c, "user_session");
  return c.redirect("/");
});

Deno.serve(app.fetch);