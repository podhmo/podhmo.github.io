#!/usr/bin/env -S deno run --allow-read --allow-env

/*

1つのファイルで完結したdenoのスクリプトを作成したいです。テキストファイルのフィルターを作りたいです。まず入力としてはコマンドライン引数が指定されてない場合は標準入力を読みコマンドライン引数が指定されてる場合はコマンドライン引数を読むようにしてください。
そして以下のような変換をしてください

- \tをタブに変換
- \nを改行に変換
- ホームディレクトリを取得しその値を~に変換

結果を標準出力に出してください。

----

- https://deno.land/x のimportは絶対にしないでください
- jsr:@std/*  のimportを利用してください
- 可能な限りjsrのみでimportするようにして無理なら `npm:` のimportをしてください
- 出力が1ファイルだけの場合はdeno.jsonを作らずimport時に直接バージョンを指定してください

*/

async function main() {
  let input: string;

  if (Deno.args.length === 0) {
    // Read from stdin
    const bytes = await Deno.readAll(Deno.stdin);
    input = new TextDecoder().decode(bytes);
  } else {
    // Read from all files specified in command-line arguments
    const fileContents = await Promise.all(Deno.args.map((filePath) => Deno.readTextFile(filePath)));
    input = fileContents.join('\n');
  }

  // Get home directory (cross-platform)
  const home = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";

  let output = input;

  // Replace home directory with ~
  if (home) {
    // Simple escape for regex (self-implemented to avoid imports)
    const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const homeRegex = new RegExp(escapeRegex(home), 'g');
    output = output.replace(homeRegex, '~');
  }

  // Replace escape sequences
  output = output.replace(/\\t/g, '\t');
  output = output.replace(/\\n/g, '\n');

  // Output to stdout
  console.log(output);
}

if (import.meta.main) {
  await main();
}
