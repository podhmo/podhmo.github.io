# deno ツールの .mbtx (MoonBit script mode) 移行 — 作業レポート

podhmo.github.io 内の deno 製 CLI ツール9本を MoonBit 製単一ファイル `.mbtx` へ移植した記録。
全 PR は stacked PRs (stack #116、[底辺 PR #114](https://github.com/podhmo/podhmo.github.io/pull/114) 〜本PR) として master から積み上げている。マージはユーザーが行う前提。

## 実施内容

| フェーズ | 内容 | PR |
|---|---|---|
| 移植 | gen-index / normalize-text / ai-studio-to-markdown / claude-code / copilot-cli / llm-scaffold / sync-writing-skills / ai-studio-download / html-server (1ツール=1PR、.ts 削除) | #114-#123 |
| ドキュメント | chatgpt/tools/README.md (mbtx-install 手順)、Makefile setup、deno 用 .vscode 削除 | #124 |
| レビュー (子セッション) | master..tip 全体差分を バグ/再実装/リファクタ の3軸でレビュー → 18指摘 | — |
| バグ修正 | 指摘10件すべて真のバグ、1 root cause=1 PR で対応 | #125-#133 |
| リファクタ | 採用した再実装除去・dep pin を対応 | #134, #135 |
| このレポート | — | 本PR |

## 計画外の記録と判断

計画と実施後の理解が分岐した点と、その時点で行った明示的な判断。

### html-server のスコープを静的サーバへ縮小

- **計画**: deno 版は静的配信 + `</body>` への reload script 注入 + `Deno.watchFs` 監視 + SSE 通知。MoonBit に fs watch API が無いため **mtime ポーリングで live reload を維持**する方針だった。
- **実施後の理解**: ユーザーより「python -m http.server みたいなもので十分で watch 不要」。watch・SSE・script 注入を全廃し、一覧ページ + MIME 付き配信のみに (#123)。
- **判断**: 一覧を deno 版の `*.html` 限定から **全ファイル表示に拡張** (実装子の判断)。「python -m http.server 相当」という指示の機能等価解釈として受理。

### 依存方針: mooncakes 許可 (結果的に未使用)

- **計画**: core / moonbitlang/x / moonbitlang/async の縛りを意識していた。
- **変更**: ユーザーより mooncakes パッケージ使用を許可。結果的に core/x/async で全ツール完結し、追加依存は無し。import pin だけはレビュー指摘として後付け (#134 で `async@0.22.4`)。

### ai-studio-download: RS256 手実装 + 非対話化 + E2E 未検証を明示

- **計画**: 変換対象として最難と予告していた通りの内容だった (x/jwt は HMAC のみ → `core/bigint` で RSA 署名を自前実装)。
- **判断1**: RS256 署名は openssl 出力とのバイト一致 + verify 通過で正しさを担保。完全な E2E (token exchange〜Drive DL) は **GCP 資格情報が無く不可能 → 未検証として PR #122 に明記**して残す。
- **判断2**: 対話 Select は番号入力へ置き換え (スクリプト言語での対話 UI をやらない判断)。

### レビューフェーズの挿入 (ユーザー指示) と重大な発見

- **計画外**: 移植完了後に「子セッションで全体差分レビュー」フェーズが挿入された。
- **発見**: 10件すべて真のバグ。最重要は2点:
  1. **`x/fs create_dir` のバックエンド差** — WASI (`moon run`) では再帰+冪等だが **native は非再帰 + EEXIST raise**。`moon run` では動くのに **mbtx-install が生成する native バイナリでは `llm-scaffold apply` が壊れる**状態だった (#126)。実行形態 (mbtx-install native) まで踏まえないと見逃す罠。
  2. **`Compare for String` は shortlex (長さ優先)** — JS `<` の符号位置順と非互換。タイムスタンプの時系列ソート (copilot) と一覧表示順 (html-server) が崩れていた (#127)。
- **判断**: 指摘は全件採用。「CAP は無視して」の追認により修正9本 + リファクタ2本を追加で積んだ。

### レポートの所在

- このリポジトリに `docs/sketch/ja/` は未存在 → 新設。ファイル名はタスク内容から新規命名 (`mbtx-migration-report.md`)。

### mbtx-install の公開と実バイナリ E2E (追記)

- **計画外**: スタック積み上げ完了後に `podhmo/mbtx-install@0.1.0` が mooncakes に公開された (`moon install podhmo/mbtx-install/cmd/mbtx-install` で導入可能)。それまでは「インストールはこれから作る mbtx-install でやるつもり」が前提で、実行検証は `moon run` (WASI バックエンド) に留まっていた。
- **追記時の検証**: 実際に mbtx-install で全9ツールをインストールし、**native バイナリ**として E2E 検証した。native こそ `create_dir` バックエンド差 (#126) が刺さる実行形態であり、`moon run` の検証では潰し切れなかった領域。
- **結果**: 全9本合格。`llm-scaffold apply` の深いディレクトリ作成が deno 版と出力一致 (ensure_dir 修復が実バイナリで有効)、copilot の時系列ソートが異なる長さの timestamp で正順 (lexical_compare 有効)、sync-writing-skills の実 fetch が `moon run` 版とバイト一致、html-server が 200/301/404/HEAD/traversal 拒否を満たす。ai-studio-download は `--help` のみ (Drive E2E は資格情報待ち)。

## レビュー指摘と verdict

レビュー子の指摘18件への採否と対応先。

| # | 指摘 | 種別 | verdict | 対応 |
|---|---|---|---|---|
| F1 | url_encode が `%` を欠落 → Drive API クエリ全滅 | bug | 採用 | #125 (`@percent.encode` 置換、再実装指摘と兼用) |
| F2 | `create_dir` が native で非再帰+EEXIST | bug | 採用 | #126 (`ensure_dir` 自前実装) |
| F3 | copilot `timestamp_cmp` が shortlex で時系列崩壊 | bug | 採用 | #127 (`lexical_compare`) |
| F7 | html-server `names.sort()` が shortlex | bug | 採用 | #127 (F3 と同根因で同 PR) |
| F4 | `pick_text` が role 判定前に eager 評価 → 非文字列 text の system メッセージで全体 abort | bug | 採用 | #128 (user/assistant 分岐内へ移動) |
| F5 | 配列内の `null` が `"null"` と文字列化 (JS join は `""`) | bug | 採用 | #129 |
| F6 | `HOME=""` で USERPROFILE fallback しない | bug | 採用 | #130 |
| F8 | `run_forever` コールバックで `tcp.close()` (契約違反) | bug | 採用 | #131 (6箇所除去) |
| F9 | `list_files` エラー時に部分結果で続行 (deno 版は `[]` + stderr) | bug | 採用 | #132 |
| F10 | gen-index が `--` をファイル名に混入 | bug | 採用 | #133 |
| R1 | url_encode = `percent::encode` の再実装 | reimpl | 採用 | #125 (F1 修復と兼用) |
| R2 | `b64_decode` = `base64::decode` の再実装 | reimpl | 採用 | #135 |
| R3 | `days_from_civil`+`parse_iso_seconds` ≈ `PlainDateTime` | reimpl | 採用 | #135 (`@string.from_str` + `s[:19]` slice) |
| R4 | `is_scaffold_space` ≈ `Char::is_whitespace` | reimpl | **不採用** | JS `\s` と `\u0085` (NEL) で差異あり。厳密等価が必要で手書きが正 |
| T1 | `json_stringify` は薄い wrapper | refactor | 採用 | #135 |
| T2 | `moonbitlang/async` import が未 pin | refactor | 採用 | #134 |
| T3 | keep-alive 未対応 | refactor | **不採用** | スコープ外 (deno 版にも無い機能追加) |
| T4 | `detect_local_zone` (`date +%z` 外部コマンド) | refactor | **不採用** | std に代替なし。libc の $TZ/localtime 解決に乗る現実装が最良 |

## 差分上の注意点 (検証で確認した等価性の境界)

diff を読んで初めて見える、等価性維持の細部と意図的な差。

- **percent::encode 化の挙動差**: space が `+` → `%20`、`*`/`~` の扱いが URLSearchParams 準拠 → RFC3986 準拠へ変化。Drive API は percent-encoding を正しくデコードするため機能等価 (#125 に明記)。
- **`format_mtime_in` の suffix 扱い**: `PlainTime`/`PlainDateTime` の parse は `Z`/offset suffix を受理しないため `s[:19]` slice + UTC 解釈。**旧実装も「suffix を完全に無視して UTC 扱い」だったので同じセマンティクス** — `+09:00` 付き入力も新旧とも offset を見ず UTC として処理する点で一致 (バグではなく元実装の仕様)。
- **b64_decode → `@base64.decode`**: 旧 `b64_value` は `-_` (base64url 文字) も寛容に受理していたが、std は Malformed を raise。入力は PEM 標準 base64 のみなので実害なし — 不正入力時の失敗点が DER 解析から base64 デコードへ前進するだけ。
- **`b64url_encode` は自前実装のまま**: core に base64url encode が存在しないため意図的に残留 (JWT 署名で使用中)。
- **fix-02 の fmt 副産物**: `ensure_dir` 実装時の `moon fmt` が `trigger_explanation` heredoc の末尾空白を除去。help 出力の空白行が2文字分変化 (無害、記録)。
- **llm-scaffold init**: deno 版との stderr 差が +1 byte 残存 (無害、PR #120 に明記済み)。
- **`--` 区切り**: deno `parseArgs` 互換として `--` 以降を全て位置引数化 (#133)。

## 残存する既知の境界

- **ai-studio-download の Drive E2E 未検証** — GCP 資格情報が無いため token exchange〜ファイルDL の実動作は未確認 (RS256 署名単体は検証済み)。
- `deno.jsonc` / `pwa/*.ts` / `chatgpt/src/*.ts` / Makefile `gen` — deno SPA・Worker 向けで今回の CLI 移植対象外。

## 不備の振り返り

短いプロセスメモ (興味対象外の話題なので最小限に)。

- レビュー子の長い報告がメッセージ取得で3度 truncate → 小分け再送で解決。長い報告は構造化して分割させる運用が良い。
- 移植フェーズで `moon run` (WASI) 経由の検証しかしていなかったため、native バックエンド差 (#126 の類) が移植中レビューでは取りこぼし → 後段のレビューフェーズで救済。`.mbtx` 検証は mbtx-install 相当の native ビルドでも通すべきだった。
