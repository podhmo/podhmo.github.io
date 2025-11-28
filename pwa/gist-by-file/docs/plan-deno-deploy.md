# Deno Deploy 移行計画

## 目的
現在のDeno + Honoアプリケーションを Deno Deploy で公開し、手軽にWebアプリを配信する。既存のローカル開発環境を維持しつつ、最小限の変更でデプロイ可能にする。

## 現状分析

### 現在の構成
- **ランタイム**: Deno
- **フレームワーク**: Hono + JSX
- **認証**: GitHub OAuth
- **機能**: ファイルアップロード → Gist作成
- **UI**: JSX + Pico CSS（モバイルファースト）
- **開発**: `deno task dev` でローカルサーバー

### Deno Deploy の利点
- **Deno ネイティブ**: 既存コードがそのまま動作
- **無料プラン**: 個人利用で十分な制限
- **GitHub 連携**: リポジトリから自動デプロイ
- **エッジ配信**: 世界中で高速アクセス
- **設定不要**: サーバー管理一切不要

## 移行戦略

### Phase 1: 現在の問題修正（15分予定）
1. **JSXエラー修正**
   ```
   Can only set one of `children` or `props.dangerouslySetInnerHTML`
   ```
   - JSXでscriptタグの重複設定を修正
   - childrenとdangerouslySetInnerHTMLの競合解決

2. **環境変数確認**
   - `.env`ファイルの設定確認
   - GitHub OAuth設定の動作確認

### Phase 2: Deno Deploy対応（20分予定）
1. **deployctl セットアップ**
   ```bash
   # Deno Deploy CLIのインストール
   deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts
   ```

2. **デプロイ設定ファイル作成**
   ```typescript
   // deploy.ts - デプロイ用エントリーポイント
   import app from "./main.tsx";
   Deno.serve(app.fetch);
   ```

3. **環境変数設定**
   - Deno Deploy Dashboardでの環境変数設定
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `BASE_URL`

### Phase 3: デプロイとテスト（15分予定）
1. **手動デプロイ**
   ```bash
   # 直接デプロイ
   deployctl deploy --project=gist-uploader deploy.ts
   ```

2. **動作確認**
   - GitHubログイン機能のテスト
   - ファイルアップロード機能のテスト
   - モバイルUIの表示確認

## 技術仕様

### ファイル構成
```
├── main.tsx              # 既存メインファイル（保持）
├── deploy.ts             # Deno Deploy専用エントリーポイント
├── deno.json             # 既存設定（保持）
├── .env                  # ローカル開発用（保持）
└── README.md             # デプロイ手順追記
```

### 環境変数マッピング
```typescript
// ローカル開発
const CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID");

// Deno Deploy
const CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID"); // 同じ
```

### デプロイ戦略
1. **ローカル開発**: `deno task dev` （既存のまま）
2. **デプロイ**: `deno task deploy` （新規）
3. **公開URL**: `https://gist-uploader.deno.dev`

## 実装手順

### Step 1: JSXエラー修正
```typescript
// 問題のあるコード
<script dangerouslySetInnerHTML={{__html: "..."}}>
  // ここにchildrenがあるとエラー
</script>

// 修正後
<script dangerouslySetInnerHTML={{__html: "..."}} />
```

### Step 2: デプロイファイル作成
```typescript
// deploy.ts
import { load } from "https://deno.land/std@0.220.0/dotenv/mod.ts";
import { createApp } from "./main.tsx";

// Deno Deploy環境では.envファイルは不要
if (Deno.env.get("DENO_DEPLOYMENT_ID")) {
  // 本番環境
} else {
  // ローカルテスト用
  await load({ export: true });
}

const app = createApp();
Deno.serve(app.fetch);
```

### Step 3: GitHub OAuth設定更新
```
Callback URL: https://gist-uploader.deno.dev/auth/callback
```

## メリット・利点

### 手軽な公開デプロイ
- **完全無料**: 個人利用で制限内
- **コマンド一発**: `deployctl deploy` で即座に公開
- **独自URL**: `*.deno.dev` ドメイン
- **自動HTTPS**: SSL証明書自動発行
- **Deno ネイティブ**: 既存コードそのまま利用

### 開発体験
- **設定不要**: 追加設定ほぼゼロ
- **高速デプロイ**: 数秒でデプロイ完了
- **リアルタイム**: コード変更を即座に反映
- **ログ確認**: Dashboard でログとメトリクス確認

## 制約・考慮事項

### Deno Deploy制限
- **実行時間**: リクエストあたり15秒（十分）
- **メモリ**: 512MB（十分）
- **ファイルサイズ**: アップロード制限内で動作
- **データベース**: 外部API依存（GitHub API使用中）

### 技術的制約
- **ファイルシステム**: 読み取り専用（問題なし）
- **Node.js API**: 一部制限（現在未使用）
- **WebAssembly**: 完全対応

### セキュリティ
- **環境変数**: Dashboard経由で安全管理
- **HTTPS強制**: 全通信暗号化
- **OAuth**: GitHub認証でセキュア

## テスト戦略

### ローカルテスト
```bash
# 既存の開発環境（JSX修正後）
deno task dev

# デプロイファイルのローカルテスト
deno run -A deploy.ts
```

### デプロイテスト
```bash
# Deno Deploy へのデプロイ
deno task deploy

# 公開URLでの動作確認
curl https://gist-uploader.deno.dev
```

### 機能テスト
1. **GitHubログイン**: OAuth フロー確認
2. **ファイルアップロード**: Gist作成確認
3. **モバイルUI**: レスポンシブ動作確認
4. **エラーハンドリング**: 各種エラーケース確認

## 実際のデプロイ手順

### Step 1: 初回デプロイ
```bash
# デプロイ実行（初回はプロジェクト作成）
deno task deploy

# または直接実行
deployctl deploy --project=podhmo-gist-uploader deploy.ts
```

### Step 2: Deno Deploy Dashboard設定
1. **プロジェクト確認**: https://dash.deno.com/projects/podhmo-gist-uploader
2. **環境変数設定**:
   ```
   GITHUB_CLIENT_ID = "Iv23lim16B3zSRXIyb9I"
   GITHUB_CLIENT_SECRET = "your_secret_here" 
   BASE_URL = "https://podhmo-gist-uploader.deno.dev"
   ```

### Step 3: GitHub OAuth設定更新
```
GitHub Developer Settings > OAuth Apps > gist-by-file
Authorization callback URL: https://podhmo-gist-uploader.deno.dev/auth/callback
```

### Step 4: 再デプロイ（環境変数反映）
```bash
# 環境変数設定後に再デプロイ
deno task deploy
```

### Step 5: 動作確認
```bash
# 公開URLアクセス
curl https://podhmo-gist-uploader-5ww32tbcfrvz.deno.dev

# または ブラウザで確認
open https://podhmo-gist-uploader-5ww32tbcfrvz.deno.dev
```

## トラブルシューティング

### よくある問題

1. **環境変数が反映されない**
   ```bash
   # Dashboard で環境変数設定後、再デプロイ必要
   deno task deploy
   ```

2. **GitHubコールバックエラー**
   ```
   原因: callback URLが古い設定のまま
   解決: GitHub OAuth設定でURLを本番URLに更新
   ```

3. **デプロイ権限エラー**
   ```bash
   # Deno Deployにログイン
   deployctl login
   
   # プロジェクト作成権限確認
   deployctl projects list
   ```

### ログ確認方法
```bash
# リアルタイムログ表示
deployctl logs --project=podhmo-gist-uploader

# Dashboard でのログ確認
# https://dash.deno.com/projects/podhmo-gist-uploader/logs
```

## 成功基準

- [x] JSXエラーの解消
- [x] ローカル開発環境の維持  
- [x] Deno Deploy対応ファイル作成
- [ ] Deno Deployでの動作確認
- [ ] GitHubログイン機能の動作
- [ ] ファイルアップロード→Gist作成の動作
- [ ] モバイルUIの正常表示
- [ ] 公開URLでのアクセス確認

## Future Work

### 拡張機能
- [ ] **カスタムドメイン**: 独自ドメイン設定
- [ ] **Analytics**: Deno Deploy Analytics活用
- [ ] **CI/CD**: GitHub Actions連携自動デプロイ
- [ ] **環境分離**: staging/production環境

### 運用改善
- [ ] **モニタリング**: エラーレート監視
- [ ] **パフォーマンス**: レスポンス時間最適化
- [ ] **セキュリティ**: レート制限実装

---

**推定実装時間**: 約50分  
**優先度**: High  
**リスク**: Low（既存技術スタックそのまま利用）

**主な利点**: Deno環境そのままで手軽に公開デプロイが実現可能！