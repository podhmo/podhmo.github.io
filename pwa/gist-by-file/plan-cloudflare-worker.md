# Cloudflare Workers 移行計画

## 目的
現在のDeno + Honoアプリケーションを Cloudflare Workers で動作するように移行し、エッジでの高速配信とスケーラビリティを実現する。同時にローカル開発環境との互換性も維持する。

## 現状分析

### 現在の構成
- **ランタイム**: Deno
- **フレームワーク**: Hono
- **認証**: GitHub OAuth
- **機能**: ファイルアップロード → Gist作成
- **UI**: JSX + Pico CSS（モバイルファースト）

### Cloudflare Workers の制約
- **Module Workers形式**が必要（Web Workers APIベース）
- **ファイルシステムアクセス不可**
- **環境変数はCloudflare環境**で管理
- **Request/Response**ベースのアーキテクチャ

## 移行戦略

### Phase 1: アーキテクチャ適応（45分予定）
1. **Module Workers形式への変換**
   ```typescript
   export default {
     fetch(request: Request, env: Env): Promise<Response> {
       // Honoアプリケーションをラップ
     }
   }
   ```

2. **環境変数管理の変更**
   ```typescript
   // Before (Deno)
   const CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID");
   
   // After (Cloudflare Workers)
   const CLIENT_ID = env.GITHUB_CLIENT_ID;
   ```

3. **デュアル環境対応**
   ```typescript
   // 実行環境の判定
   const isCloudflareWorkers = typeof globalThis.Deno === 'undefined';
   ```

### Phase 2: 開発環境整備（30分予定）
1. **denoflareツールのセットアップ**
   ```bash
   deno install --unstable-worker-options --allow-read --allow-net \
     --global --allow-env --allow-run --name denoflare --force \
     https://raw.githubusercontent.com/skymethod/denoflare/v0.6.0/cli/cli.ts
   ```

2. **設定ファイル作成**
   - `.denoflare` 設定ファイル
   - `wrangler.toml` 互換性確保

3. **ローカル開発とWorkers両対応**
   ```typescript
   // main.tsx (既存) - ローカル開発用
   // worker.ts (新規) - Cloudflare Workers用
   // shared/ - 共通ロジック
   ```

### Phase 3: デプロイ設定（15分予定）
1. **Secrets設定**
   - GitHub OAuth credentials の設定

2. **公開デプロイ**
   - `denoflare publish` でWorkers環境に公開

## 技術仕様

### ファイル構成
```
├── main.tsx              # 既存ローカル版（保持）
├── worker.ts             # Cloudflare Workers エントリーポイント
├── shared/
│   ├── app.ts           # Honoアプリケーション共通ロジック
│   ├── auth.ts          # GitHub認証処理
│   ├── gist.ts          # Gist作成処理
│   └── ui.tsx           # UIコンポーネント
├── .denoflare           # denoflare設定
├── wrangler.toml        # Cloudflare設定
└── deno.json            # 既存設定（保持）
```

### 環境変数マッピング
```typescript
interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  BASE_URL: string;
}

// 環境判定とフォールバック
function getEnvVar(key: string, env?: Env): string {
  if (env && key in env) {
    return env[key as keyof Env];
  }
  return Deno.env.get(key) || '';
}
```

### デプロイメント戦略
1. **ローカル開発**: `deno task dev` （既存）
2. **Cloudflare デプロイ**: `denoflare publish`

## 実装手順

### Step 1: 共通ロジック抽出
```typescript
// shared/app.ts
export function createApp() {
  const app = new Hono();
  // 既存のルート定義を移動
  return app;
}
```

### Step 2: Workers エントリーポイント作成
```typescript
// worker.ts
import { createApp } from './shared/app.ts';

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  BASE_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const app = createApp();
    // 環境変数をHonoのコンテキストに注入
    app.use('*', (c, next) => {
      c.env = env;
      return next();
    });
    
    return app.fetch(request);
  }
}
```

### Step 3: 環境判定ロジック
```typescript
// shared/env.ts
export function getClientId(env?: any): string {
  if (typeof globalThis.Deno !== 'undefined') {
    // Deno環境
    return Deno.env.get('GITHUB_CLIENT_ID') || '';
  }
  // Cloudflare Workers環境
  return env?.GITHUB_CLIENT_ID || '';
}
```

## メリット・利点

### 手軽な公開デプロイ
- **無料デプロイ**: Cloudflare Workers の無料プランで公開可能
- **簡単デプロイ**: `denoflare publish` 一発でWebアプリを公開
- **独自URL**: `*.workers.dev` ドメインで即座にアクセス可能
- **設定不要**: サーバー設定や管理が一切不要

## 制約・考慮事項

### Cloudflare Workers制限
- **実行時間**: 最大10秒（CPU時間）
- **メモリ**: 128MB上限
- **リクエストサイズ**: 100MB上限（ファイルアップロードに適している）

### 技術的制約
- **ファイルシステム**: 利用不可（既に未使用）
- **Node.js API**: 一部制限あり（現在未使用）
- **WebAssembly**: 対応済み

### 開発・運用
- **デバッグ**: Cloudflare Dashboardでのログ確認
- **シークレット**: Wrangler CLI経由で安全に管理
- **モニタリング**: Analytics & Real User Monitoring

## テスト戦略

### ローカルテスト
```bash
# 既存Denoテスト（機能テスト）
deno task test

# ローカル動作確認（既存）
deno task dev
```

### デプロイテスト
```bash
# Workers環境への直接デプロイ
denoflare publish

# 公開URLでの動作確認
curl https://your-app.workers.dev
```

## 成功基準

- [ ] ローカル開発環境の機能維持
- [ ] Cloudflare Workersでの動作確認
- [ ] GitHubログイン機能の動作
- [ ] ファイルアップロード→Gist作成の動作
- [ ] モバイルUIの表示確認
- [ ] パフォーマンス改善の測定（First Byte Time）

## Future Work

### 拡張機能（Workers環境活用）
- [ ] **Durable Objects**: セッション永続化
- [ ] **KV Storage**: キャッシュ最適化
- [ ] **R2 Storage**: 一時ファイル保存
- [ ] **Analytics**: 詳細なユーザー分析

---

**推定実装時間**: 約1.5時間  
**優先度**: Medium  
**リスク**: Low（既存機能を保持しつつシンプルに公開）