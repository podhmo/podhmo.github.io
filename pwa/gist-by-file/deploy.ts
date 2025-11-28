// Deno Deploy 用エントリーポイント
import { load } from "https://deno.land/std@0.220.0/dotenv/mod.ts";

// Deno Deploy環境判定
const isDenoDeploy = !!Deno.env.get("DENO_DEPLOYMENT_ID");

if (!isDenoDeploy) {
  // ローカル環境でのテスト用
  await load({ export: true });
}

// メインアプリケーションのインポート
const { app } = await import("./main.tsx");

// BASE_URLからport番号を抽出
const getPortFromBaseUrl = (baseUrl: string): number => {
  try {
    const url = new URL(baseUrl);
    return url.port ? parseInt(url.port, 10) : (url.protocol === "https:" ? 443 : 80);
  } catch {
    return isDenoDeploy ? 443 : 3333;
  }
};

const BASE_URL = Deno.env.get("BASE_URL") || 
  (isDenoDeploy ? "https://podhmo-gist-uploader.deno.dev" : "http://localhost:3333");

const PORT = getPortFromBaseUrl(BASE_URL);

console.log(`🚀 Starting server on ${isDenoDeploy ? 'Deno Deploy' : 'local'}`);
console.log(`📍 Base URL: ${BASE_URL}`);

// Deno Deploy環境でサーバーを起動
if (isDenoDeploy) {
  // Deno Deploy: Deno.serve()を使用
  Deno.serve(app.fetch);
} else {
  // ローカル: ポート指定でサーバー起動
  Deno.serve({ port: PORT }, app.fetch);
}