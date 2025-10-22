# tools

- ai-studio-to-markdown -- Google AI Studioの対話履歴(JSON形式)をmarkdownに変換
- ai-studio-download    -- Google AI Studioの対話履歴をダウンロードするツール(JSON形式)
- llm-scaffold          -- llmの生成結果をそのままディレクトリに転写したい
- normalize-text        -- テキストのエスケープシーケンス変換とホームディレクトリの正規化

## install

```bash
deno install -f --global --allow-read ./ai-studio-to-markdown.ts
deno install -f --global --allow-read --allow-write -n llm-scaffold ./llm-scaffold.ts
deno install -f --global --allow-sys --allow-read --allow-write --allow-env=GOOGLE_APPLICATION_CREDENTIALS,GOOGLE_SDK_NODE_LOGGING,GOOGLE_CLOUD_QUOTA_PROJECT,google_application_credentials,HOME,CLOUD_RUN_JOB,FUNCTION_NAME,K_SERVICE,METADATA_SERVER_DETECTION,DETECT_GCP_RETRIES,GCE_METADATA_IP,GCE_METADATA_HOST,HTTPS_PROXY,https_proxy,HTTP_PROXY,http_proxy,NO_PROXY,no_proxy,DEBUG_AUTH,GCLOUD_PROJECT,GOOGLE_CLOUD_PROJECT,gcloud_project,google_cloud_project --allow-net=metadata.google.internal:80,169.254.169.254:80,www.googleapis.com:443 -n ai-studio-download ./ai-studio-download/ai-studio-download.ts
alias ai-studio-download="GOOGLE_APPLICATION_CREDENTIALS=~/.config/google/service-account-key.json ai-studio-download"
deno install -f --global --allow-read --allow-env -n normalize-text ./normalize-text.ts
```