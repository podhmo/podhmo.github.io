function convertMarkdown(text: string): string {
    const lines = text.split("\n");
    const result: string[] = [];
    let bulletGroups: string[][] = [];
    let currentGroup: string[] = [];

    // 行を処理して変換
    lines.forEach((line, index) => {
        // 空行の処理
        if (line.trim() === "") {
            if (currentGroup.length > 0) {
                bulletGroups.push([...currentGroup]);
                currentGroup = [];
            }
            result.push("");
            return;
        }

        // インデントなしのテキストはセクションとして処理
        if (
            !line.startsWith(" ") && !line.startsWith("-") &&
            !line.startsWith("*")
        ) {
            if (currentGroup.length > 0) {
                bulletGroups.push([...currentGroup]);
                currentGroup = [];
            }
            result.push(`## ${line.trim()}`);
            return;
        }

        // 箇条書きの処理
        if (
            line.trim().startsWith("-") || line.trim().startsWith("*") ||
            line.trim().startsWith("@")
        ) {
            currentGroup.push(line);
        }
    });

    // 最後のグループを追加
    if (currentGroup.length > 0) {
        bulletGroups.push(currentGroup);
    }

    // 各箇条書きグループを処理
    bulletGroups.forEach((group) => {
        // 最大深度の計算
        const maxDepth = Math.max(...group.map((line) => {
            const match = line.match(/^(\s*)/);
            return match ? match[1].length / 2 : 0;
        }));

        group.forEach((line) => {
            const trimmed = line.trim();
            const indentMatch = line.match(/^(\s*)/);
            const indentLevel = indentMatch ? indentMatch[1].length / 2 : 0;

            // @で始まる場合は常にテキスト
            if (trimmed.startsWith("@")) {
                result.push(line.replace("@", "").trim());
                return;
            }

            // - で始まる箇条書き
            if (trimmed.startsWith("-")) {
                if (maxDepth === 0 || indentLevel === maxDepth) {
                    result.push(trimmed.substring(1).trim());
                } else {
                    const sectionLevel = 2 + indentLevel;
                    result.push(
                        `${"#".repeat(sectionLevel)} ${
                            trimmed.substring(1).trim()
                        }`,
                    );
                }
                return;
            }

            // * で始まる箇条書き
            if (trimmed.startsWith("*")) {
                const starCount = trimmed.match(/^\*+/)![0].length;
                const content = trimmed.substring(starCount).trim();
                result.push(`${"  ".repeat(starCount - 1)}- ${content}`);
            }
        });
    });

    return result.join("\n");
}

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
`;

console.log(convertMarkdown(testInput.trim()));
