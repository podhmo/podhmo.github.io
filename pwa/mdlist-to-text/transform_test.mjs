import { assertEquals } from "jsr:@std/assert";

import { convertMarkdown } from "./transform.mjs";

Deno.test("convertMarkdown", () => {
    const testInput = `
タイトル
- @ ここに文章を書いてみる
- ここは章タイトル
  - @ ここは章の文章
  - ここは節タイトル
    - ここは節の文章
    - ここも同様
  - 節2のタイトル
    - これは節2の文章
  - @ これは実質節2の文章
- @ ここも実質節2の文章
- ここは章2のタイトル
  - ここは章2の文章
  - * 箇条書き
  - ** ネストしたもの
  - ** ネストしたもの2
  - * 箇条書き2
  - ここも章2の文章
`.trim();

    const want = `
## タイトル

ここに文章を書いてみる

### ここは章タイトル

ここは章の文章

#### ここは節タイトル

ここは節の文章

ここも同様

#### 節2のタイトル

これは節2の文章

これは実質節2の文章

ここも実質節2の文章

### ここは章2のタイトル

ここは章2の文章

  -  箇条書き
    -  ネストしたもの
    -  ネストしたもの2
  -  箇条書き2
ここも章2の文章
`.trim();

    const got = convertMarkdown(testInput).trim();
    assertEquals(got, want);
});
