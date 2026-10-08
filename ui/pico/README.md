# pico

pico.css v2 のコンポーネント組み合わせだけで作るウェブアプリUI例集。

- 入口は <https://podhmo.github.io/ui/pico/index.html> (`./index.html`)
- ドキュメント: <https://picocss.com/docs/v2>

## 目的とルール

元々は「pico.css の世界でどこまで作れるか」を確かめるための sandbox。
以下のルールで書いている。

- **独自クラスを増やさない。** style.css や `<style>` ブロックは置かない。使うクラスは pico 同梱のものだけ (`container`, `grid`, `overflow-auto`, `dropdown`, `striped`, `secondary`, `contrast`, `outline`, `modal-is-open`, ...)
- **クラスより先にセマンティック要素。** `article` (カード), `nav`, `details/summary` (アコーディオン/dropdown), `dialog`, `progress`, `hgroup`, `figure`, `table` でレイアウトと装飾を済ませる
- **モバイルを tier 1 に。** PC では `.grid` が勝手に横並びになるのに任せるだけ。768px 未満では全部縦積みになるので、モバイルで崩れない構成が自然にPCにも効く
- JS は最小限。pico 自体は JS 不要だが `<dialog>` の開閉だけ自前の数行が要る (settings.html 参照)

各ページは雛形としてコピーして使う想定。

## ページ一覧と使い分け

| page | どんなときに | 主な部品 |
| --- | --- | --- |
| `index.html` | 目次・カタログ型のトップ。アプリのランチャー画面の土台にも | table (overflow-auto) |
| `login.html` | 認証フォーム。入力エラー表示の見せ方も入っている | article の中に form, `aria-invalid` + `small` + `aria-describedby`, `role="switch"` |
| `hero.html` | ランディング等「ウェブサイト寄り」の標準ページ | nav の右端に `role="button"` CTA, hgroup のヒーロー, blockquote の引用, `role="group"` の登録フォーム |
| `dashboard.html` | 管理画面・KPI サマリのトップ | `.grid` の KPI カード (4列→縦積み), `table.striped` + `overflow-auto`, `progress`, nav の `details.dropdown` ユーザーメニュー, `aria-busy` のローディング表示 |
| `datatable.html` | 一覧+検索+一括操作の管理画面 | `role="search"` 検索バー, `nav` の左に `details.dropdown` の一括操作・右に主操作ボタン, チェックボックスつき `table.striped` (モバイル用に列を畳む), `data-tooltip`, nav の `aria-current` を使ったページネーション |
| `tasks.html` | チェックリスト系。進捗表示の出し方の例 | checkbox リスト + `del` で完了表現, 確定/不確定の `progress`, `details` で折りたたみ |
| `kanban.html` | カードを列に並べるボード | `.grid` の直下に `section` = 列、その中に `article` = カード。`role="group"` のビュー切り替えも |
| `chat.html` | メッセージング・サイドバーつき画面 | `aside` の中の `details` アコーディオンに `nav` (aside 内の nav は自動で縦積み), メッセージは `article` + `header`, 入力は `role="group"` |
| `settings.html` | フォーム中心の設定画面 + 確認ダイアログ | `role="switch"` トグル, `range`, `select`, radio, `dialog` + `modal-is-open`, パンくず `nav[aria-label="breadcrumb"]` |
| `profile.html` | 詳細表示系 (ユーザー/組織/リソース) | `.grid` 2列, `figure` + インラインSVG のアバター, `table` の属性表, カード内 `role="group"` |
| `inbox.html` | 通知・受信トレイ。テーブルではなくカード列にする例 | nav + `aria-current` のタブ風フィルタ, `nav` 左側の `details.dropdown` のまとめ操作, article の `header/footer` に差出人・操作 |
| `billing.html` | 料金プラン・請求系 | `.grid` 3枚のプランカード, `mark` のバッジ, `ins`/`del`/`kbd` の状態表示 |
| `reservation.html` | 予約フォーム。フォーム部品の網羅的な例 | `type=date`/`time`/`datetime-local`/`month`/`number`/`tel`/`color`, `select` (required+placeholder, `optgroup`), `select[multiple]`, `aria-invalid="false"` の valid 表示, `readonly`, `fieldset[disabled]`, `label[aria-disabled]`, checkbox/radio の横並び, indeterminate (JS 1行) |
| `catalog.html` | フィルタ付き一覧。nav 外で使う dropdown のバリエーション | nav 外の `details.dropdown` (select 風), `summary role="button"` + `.secondary`/`.contrast`/`.outline`, radio・checkbox を項目に持つ dropdown, nav 右端 dropdown の `<ul dir="rtl">` 右揃え, `tfoot` の合計行, `a.contrast`/`a.secondary` のリンクバリアント, `a[aria-disabled]` |
| `changelog.html` | リリースノート等の読み物ページ | `.container-fluid`, `abbr`, `pre > samp`, `sub`/`sup`, `u`/`s`, `figure > img` + `figcaption`, 要素単位の `data-theme="light"` |
| `ai-studio-download.html` | 既存アプリ ([chatgpt/tools/ai-studio-download](../../chatgpt/tools/ai-studio-download/)) を pico 部品だけで組み直すためのモック。「一覧 + 各行に操作ボタン」型の画面の雛形 | `article` 1枚 = 1件、カード内を `.grid` で「`hgroup` (タイトル+日時) / `role="group"` (JSON / Markdown)」の2列に。PC では左右、モバイルでは縦積み。`aria-busy` のローディング、`fieldset` + `role="switch"` のオプション |
| `prompt-template-clipper.html` | 既存アプリ ([chatgpt/index.html + src](../../chatgpt/) の Prompt Template Clipper) を pico 部品だけで組み直すためのモック。「変数入力 → 生成設定 → 本文」のフォーム中心の詳細画面の雛形 | Copy ボタンは画面に1個だけ — 対象テキスト textarea 右下に `.prompt-block` (`position:relative`) + absolute で浮かせる (pico に position 系が無い唯一の例外、本体は `chatgpt/style.css`)。言語/タイトルはブロック直上の `<small>`。`label` + `textarea` の素の縦積み、`input[type=file]` + `small` のステータス、`fieldset role="group"` の URL 入力+Load、パンくず `nav[aria-label="breadcrumb"]` |

## 逆引き: やりたいこと → pico の書き方

| やりたいこと | 書き方 |
| --- | --- |
| 中央寄せの読み物幅 | `header/main/footer` に `.container` (全幅は `.container-fluid`) |
| 横並び→モバイルで縦積み | `.grid` の直下に要素を並べる。768px 未満で自動的に1列 |
| 入力行+ボタンをくっつける | `fieldset` や `div` に `role="group"`。**モバイルでも縮まない**点に注意 |
| 検索バー | `form` に `role="search"` |
| カード | `article`。中の `header`/`footer` が面付きの帯になる |
| ナビバー | `nav` に `ul` を2つ置くと左右に分かれる。`nav > ul` 内の `details.dropdown` はリンク風に変わる |
| 縦メニュー/サイドバー | `aside` の中に `nav` を置くと自動で縦積み |
| パンくず | `<nav aria-label="breadcrumb">`、現在地の `a` に `aria-current="page"` |
| アコーディオン | `details` + `summary` (`.dropdown` を付けない方) |
| ドロップダウン/メニュー | `details.dropdown` + `summary` + 内側に `ul` |
| モーダル | `dialog` + `article`。開閉は自前JSで `showModal()`/`close()`、`html` に `modal-is-open` を付け外し |
| select 風のドロップダウン | nav の**外**に `details.dropdown` を置くと select 風の見た目になる (catalog.html) |
| ボタン見た目のドロップダウン | `details.dropdown > summary[role="button"]`。`.secondary`/`.contrast`/`.outline` のバリアントも効く |
| dropdown の項目を選択式に | `li > label > input[type=checkbox|radio]` (catalog.html) |
| nav 右端 dropdown の右揃え | 内側の `<ul dir="rtl">` で `right:0` になる (公式のやり方。項目テキストも右揃えになる点だけ注意) |
| 日付・時刻・日時・月・数値・電話番号・色の入力 | `type=date`/`time`/`datetime-local`/`month`/`number`/`tel`/`color` (reservation.html) |
| 複数選択の select | `select multiple size="…"` |
| select の選択肢をグループ化 | `optgroup label="…"` |
| 入力の valid 表示 | `aria-invalid="false"` (+`aria-describedby` と `small`)。エラーは `aria-invalid="true"` |
| 読み取り専用・無効の入力 | `readonly` / `disabled`。ラベルごと muted にするには `label[aria-disabled]`。ブロック全体は `fieldset[disabled]` |
| checkbox・radio の横並び | `label` で包まず `<input id>` + `<label for>` を兄弟にする (reservation.html) |
| 一部選択 (indeterminate) | 属性では書けない。`el.indeterminate = true` の 1行だけ JS (docs 記載の手順) |
| 表の合計行 | `tfoot` (太字+上罫線になる) |
| 色つきリンク | `a.secondary` / `a.contrast` |
| 無効なリンク | `a[aria-disabled="true"]` (クリックは止まらないので注意) |
| 用語への補足 (dotted 下線) | `abbr title="…"` |
| 端末出力 | `pre > samp` |
| 上付き・下付き | `sup` / `sub` (脚注、化学式、計算量の表記など) |
| 全幅レイアウト | `.container-fluid` (changelog.html) |
| 要素ごとにテーマを変える | 任意要素に `data-theme="light"`/`"dark"` (changelog.html のライトカード) |
| 画像+caption | `figure > img` + `figcaption`。img は自動で流体サイズ |
| タブ風の切り替え | pico にタブは無い。`nav` + `aria-current` か `role="group"` のボタン列で代替 (inbox.html) |
| バッジ/ラベル | バッジ要素は無い。`kbd`, `mark`, `ins`(緑), `del`(赤) で状態を書き分ける |
| トグルスイッチ | `<input type="checkbox" role="switch">` |
| ローディング | ボタンや要素に `aria-busy="true"` |
| ツールチップ | `data-tooltip="..."` (+`data-placement`) |
| 横スクロールする表 | `div.overflow-auto` で `table` を包む (スマホで必須) |
| ストライプの表 | `table.striped` |
| 完了した項目 | `del` で打消し線 (tasks.html, kanban.html) |

## pico だけでは届かないもの (と今回の代替)

- **固定幅のサイドバー** — `.grid` は等分しかできない。chat.html は 50/50 を許容。どうしても細いサイドバーが要るなら `details` アコーディオンに逃がすのが無難
- **アバターの丸画像・アイコン** — profile.html はインラインSVGで代替 (CSSクラス増やさずに済む)
- **トースト/通知バー** — 無い。`article` のリスト表示か、`aria-busy` 中のボタンで状態を見せる
- **タブ** — `nav` + `aria-current` か `role="group"` で代替 (上表)
- **右寄せ吹き出しのチャット** — 左右の寄せ分けはできない。chat.html は全幅 `article` + `mark` で自分の発言を区別
- **要素上への重ね配置 (absolute/fixed)** — position 系ユーティリティが無い。pico だけで近づけるなら `nav` の右 `ul` にボタンを置いて「ブロック直上の右側」に見せる手があるが、本文上に浮かせるには無理。どうしても浮かせたい場合だけ最小ルールの独自 CSS を許容する方針 (prompt-template-clipper.html の `.prompt-block`/`copy-button` = 親 `position:relative` + ボタン `position:absolute`)

## 検証メモ (pico v2.1.1)

- `.grid` は `min-width:768px` 以上で `auto-fit` の等分列、未満で1列。4枚なら4列になるのでカードの枚数は列数と考える
- `role="group"` は `.grid` と違ってモバイルでも縮まず横並びのまま。中身が長いと潰れるので短いラベルにする
- トップ `nav` の項目は溢れると折り返されて崩れるので、モバイルで見て右側 `ul` は2項目程度に抑える。多い場合は `details.dropdown` に畳むか `nav[aria-label="breadcrumb"]` を使う (dashboard.html / settings.html / kanban.html 参照)
- `role="group"` のボタン列も同様に折り返さず潰れるので、長い文言はリンクに逃がす方が無難 (login.html のフッター参照)。ボタン3つ以上も 375px では2行に折れる → 副次操作は `details.dropdown` に畳み、主操作1つだけ残す (datatable.html の一括操作)
- `details.dropdown` のメニューは summary の**左端**基準 (`left:0` + `min-width:fit-content`) で開く。`nav` の右端に置くと項目が長いとき右にはみ出し、375px では開いた瞬間にページが横に広がる。右端に置きたいときは内側の `ul` に `dir="rtl"` を付けると `right:0` で開く (catalog.html)。ただし `dir=rtl` は `direction:rtl` なので項目の文字列自体も右揃え表示になる — それが嫌なら従来通り `nav` の左側 `ul` か本文側に置く
- `table` は `width:100%` の auto layout なので、狭い幅では折り返せない内容 (メールアドレス等) が幅を取り、CJK のセルが1文字ずつ縦に折れる。`.overflow-auto` はページのはみ出しは防ぐがこの潰れは防げない → 列数を減らし、メール・ロール・状態などは名前セルに `kbd`/`ins`/`small` で畳む (datatable.html は 7列→3列)。それでも無理ならカード列 (inbox.html) にする
- `input` の直後 (兄弟要素として) に置いた `small` はヘルパーテキスト扱いで `display:block` + 負の margin になる。checkbox ラベル内の「本文 <small>補足</small>」は `span` で包んで `input + small` にならないようにする (tasks.html)
- `.container` の最大幅はブレークポイントごとに段階的 (最大 ~1150px+)。article を1枚だけ置くと横にだらっと伸びる → 複数枚並べる or 読み物なら気にしない
- `nav` 内の `details.dropdown > summary` (roleなし) はリンク風、`nav` 外では select 風の見た目になる
- `data-theme="dark"` は `html` だけでなく `table` 等の任意要素にも効く (changelog.html はダークページ内に `article[data-theme="light"]` を置いている)
- `summary[role="button"]` の dropdown は summary が普通のボタン装飾+矢印になる。nav の中でもボタン見た目になるので、リンク風のままにしたい nav 内 dropdown には `role` を付けない
- nav 外の `details.dropdown` は select 風の見た目で `display:inline-block` 相当。`.grid` に入れると横幅いっぱいに並ぶ (catalog.html は3つ並べている)
- checkbox/radio を `li > label > input` の形で dropdown 項目にすると、メニューが開いたまま選べるフィルタになる (docs の "Dropdowns with checkboxes and radios")
- checkbox の indeterminate は HTML 属性が無い。docs 通り `el.indeterminate = true` の 1行だけ JS を置く (reservation.html / catalog.html) — dialog の開閉と同じ「最小限の JS」の範囲とする
- 横並び checkbox/radio (`<input id>` + `<label for>` の兄弟) はモバイルでも縦積みにならない。項目が多いと折り返して窮屈になるので短いラベルにする (reservation.html は4項目+disabled 1項目)
- `select[multiple]` は素の `<select>` と違って矢印が出ず、常に `size` 行のリストになる。モバイルの縦積みフォームでは `size="4"〜"6"` 程度が無難
- `select:invalid` は `required` + 未選択で自動でエラー色になる。placeholder は `disabled` な `option` で作る (reservation.html)
- `abbr[title]` は dotted 下線だけで、タップでも title が出るがモバイルでは出ない環境もある。長い補足は `small` か脚注に逃がす方が安全
- `img` は `max-width:100%` で親に合わせて縮む。`figure` 内の `img` も同じ
- `audio`/`video`/`iframe`/`canvas`/`svg` も流体サイズになるだけ (装飾は無い)。この例集では `img` のみ使用
- `a[aria-disabled]`/`label[aria-disabled]` は muted 表示になるだけで機能は止まらない (リンクは遷移する)
- `role=search`/`role=group` の末尾ボタンは `padding-inline` が大きめ (40px) で、`<button>` は `white-space:normal` なので「検索」程度の短いラベルでも 2 文字ずつ縦に折れることがある。`<input type="submit">` はテキストが折れないのでこちらを使う (datatable.html / catalog.html)
- `.secondary`/`.contrast` を `role="button"` なしの `a` に付けると色だけ変わるリンクになる (ボタン見た目にはならない)。nav の中でも同じ
- `tfoot` の `td`/`th` は太字+上罫線。合計行に向く (catalog.html)
- `pico.colors.min.css` (色ユーティリティ) ・ `pico.conditional.min.css` ・ classless 版は別 stylesheet が要るのでこの例集の対象外。同様に `[dir=rtl]` の各種左右反転ルールはページ全体を RTL にする用途なので省略
- dropdown/details 系は JS 不要だが `dialog` だけは `showModal()` が要る

## 実アプリへの適用例: ai-studio-download

`ai-studio-download.html` は [chatgpt/tools/ai-studio-download](../../chatgpt/tools/ai-studio-download/) を pico 部品だけで組み直すためのモック。元の実装は `#file-list li` を flex で左右に並べ、`@media (max-width: 576px)` で縦積みにする独自 CSS を持っていた。それを次のように置き換える。

| 元 (独自 CSS) | モック (pico のみ) |
| --- | --- |
| `li { display:flex; justify-content:space-between }` + モバイル用 `flex-direction:column` | `article` の中に `.grid` → 768px 以上で2列、未満で縦積み。メディアクエリ不要 |
| `.file-actions { display:flex / grid }` + ボタン幅の調整 | `div[role="group"]` に短いラベルのボタン2つ (JSON / Markdown)。幅は親列いっぱいに均等割り |
| `li > span { overflow-wrap:anywhere }` (長いタイトル対策) | 不要。pico は `:root { overflow-wrap: break-word }` と `.grid > * { min-width: 0 }` を持つので、空白のない長いトークンも列幅で折り返す |
| `border-bottom` の区切り線 | `article` のカード境界で代替 |
| `#loading-message` / `#no-files-message` の margin | `p[aria-busy="true"]` と `article` 内の `p` の既定余白のまま |
| `nav > ul > li > button` のログイン/ログアウト | 同じ。ナビ右側は1項目 (ログアウト) だけにして 375px でも折れないようにする |

タイトルと日時は `hgroup` (`h4` + `p > time`) にまとめると、2行目が自動で muted color になる。

## 実アプリへの適用例: prompt-template-clipper

`prompt-template-clipper.html` は [chatgpt/index.html + src](../../chatgpt/) (Prompt Template Clipper) を pico 部品だけで組み直すためのモック。元の実装は `index.html` の `<style>` ブロックで独自クラス (`container` の max-width, `copy-button` の absolute 浮遊, `placeholder-input`, `pre` の `#ccc` 固定色など) を持っていた。それを次のように置き換える。

Copy ボタンだけは例外: スマホで本文上に少し浮いて押しやすいことが重要で、pico には position 系ユーティリティが無いため `.prompt-block { position: relative }` + `.copy-button { position: absolute }` の最小ルールだけ `chatgpt/style.css` に残すことにした (ブロック基準の絶対配置なので、上部の生成コントロールが増えてもボタン位置はずれない)。ボタンは画面に1個だけ — アプリの目的が「入力データを織り込んだ一つの最終プロンプトを作る」ことなので、対象テキスト textarea の右下で最終生成プロンプトをコピーする。

| 元 (独自 CSS) | モック (pico のみ) |
| --- | --- |
| `<div class="container">` で全体を包み `padding:1rem; max-width:800px` | `header`/`main`/`footer` にそれぞれ `.container` (pico 既定のレスポンシブ幅) |
| パンくずを包む `<nav>` 入れ子 | `nav[aria-label="breadcrumb"]` をそのまま置く (外側の nav は不要) |
| `.template-body-container` + `.copy-button { position:absolute }` で `pre` の上に浮遊 | 同様の浮遊を最小ルールで維持: `.prompt-block { position:relative }` > `.copy-button { position:absolute; right/bottom: 0.5rem }` (独自 CSS はこの 2 ルールのみ、本体は `chatgpt/style.css`)。ボタンは対象テキスト textarea 右下に1個だけ置き、ブロック側は言語/タイトルの `<small>` + `pre` のみ |
| `pre { background-color:#ccc; color:#333 }` | 削除。`data-theme="dark"` 下で pico 既定の `pre` が暗い背景になる |
| `.placeholder-input` の div + inline `label` | `label` + `textarea` をそのまま縦積み (pico で label はブロック) |
| `<small>` の中に `input[type=file]` をネスト | `textarea` 直後の `<small>` (ヘルパーテキスト) → `input[type=file]` → ステータス用 `<small>` (こちらもヘルパー表示になる) |
| `label` + `input` + `button` の縦積み (Load from URL) | `fieldset role="group"` で入力とボタンを結合 |
| `article` の中身に `small` を直置き | `article > footer > small` で帯状のフッターに |
| `.template-body-container mark` | 出力内で `mark` を使っていないため削除 (死んでいた CSS) |

ローディング表示は `<p aria-busy="true">` にすると pico のスピナーが出る (元は素の `p` だった)。

## 共通ボイラープレート

```html
<!DOCTYPE html>
<html lang="ja" data-theme="dark">
<head>
    <title>...</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body>
    <header class="container">...</header>
    <main class="container">...</main>
</body>
</html>
```

リポジトリ内の `ui/example/article.html`, `ui/scaffold/simple/index.html` と同じ構成に揃えてある。
