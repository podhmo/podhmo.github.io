#!/usr/bin/env node

/*

1つのファイルで完結したnodeのスクリプトを作成したいです。テキストファイルのフィルターを作りたいです。まず入力としてはコマンドライン引数が指定されてない場合は標準入力を読みコマンドライン引数が指定されてる場合はコマンドライン引数を読むようにしてください。
そして以下のような変換をしてください

- \tをタブに変換
- \nを改行に変換
- ホームディレクトリを取得しその値を~に変換

結果を標準出力に出してください。

----

- Node 24+ 必須 (.ts を直接実行する)。外部依存は使わず node: のbuiltinモジュールのみを利用してください

*/

import { readFile } from "node:fs/promises";

async function main() {
  let input: string;

  const args = process.argv.slice(2);
  if (args.length === 0) {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    input = Buffer.concat(chunks).toString("utf-8");
  } else {
    // Read from all files specified in command-line arguments
    const fileContents = await Promise.all(args.map((filePath) => readFile(filePath, "utf-8")));
    input = fileContents.join('\n');
  }

  // Get home directory (cross-platform)
  const home = process.env.HOME || process.env.USERPROFILE || "";

  let output = input;

  // Replace home directory with ~
  if (home) {
    const homeRegex = new RegExp(RegExp.escape(home), 'g');
    output = output.replace(homeRegex, '~');
  }

  // Replace escape sequences
  output = output.replace(/\\t/g, '\t');
  output = output.replace(/\\n/g, '\n');

  // Output to stdout
  console.log(output);
}

await main();
