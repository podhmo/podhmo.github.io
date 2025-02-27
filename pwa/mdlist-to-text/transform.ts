//
// 以下の様なルールでmarkdownテキストを変換する
// - 先頭のインデント無しのテキストは ## のsectionとして扱われる
// - `-`を使った箇条書きはテキストとして扱われる
//   - `-`を使った箇条書きの行であっても、`@`が先頭についたアイテムは無条件でテキストとして扱われる
//   - `-`の箇条書きがネストした時トップレベル毎の箇条書きをグルーピングし最もレベル（深度）の深い箇条書きのアイテムはテキストとして扱われる
//   - それ以外はインデントの数だけレベルを落としたセクションとして扱う
// - `*`を使った箇条書きは連続する*の数だけネストされた箇条書きとして扱われる
// - インデント付きの空白改行はただの改行として変換される
function convertMarkdown(
    text: string,
): string {
    type Node = {
        type: "title" | "section" | "text" | "list" | "empty";
        text: string;
        children?: Node[];
        level: number;
    };

    type Group = {
        maxLevel: number;
        items: Node[];
    };

    const groups: Group[] = [];
    let currentGroup: Group = { maxLevel: 0, items: [] };

    // grouping
    const re = /^( *)- ?(.)/;
    for (const line of text.split("\n")) {
        if (line.trim() === "") {
            currentGroup.items.push({ type: "empty", text: "", level: -1 });
            continue;
        }

        const m = re.exec(line);
        if (!m) {
            if (currentGroup.items.length > 0) {
                groups.push(currentGroup);
            }
            currentGroup = { maxLevel: 0, items: [] };
            currentGroup.items.push({ type: "title", text: line, level: -1 });
            continue;
        }

        const lv = m[1]?.length || 0;
        if (lv === 0) {
            groups.push(currentGroup);
            currentGroup = { maxLevel: 0, items: [] };
        }

        switch (m[2]) {
            case "@":
                currentGroup.items.push({
                    type: "text",
                    text: line.substring(line.indexOf("@") + 1).trimStart(),
                    level: lv,
                });
                break;
            case "*":
                currentGroup.items.push({
                    type: "list",
                    text: line.substring(line.indexOf("*") - 1).trim(),
                    level: lv,
                });
                break;
            default:
                currentGroup.items.push({
                    type: "section",
                    text: line.substring(m[0].length - 1),
                    level: lv,
                });
                if (currentGroup.maxLevel < lv) {
                    currentGroup.maxLevel = lv;
                }
                break;
        }
    }
    if (currentGroup.items.length > 0) {
        groups.push(currentGroup);
    }

    // emit
    const buf = [];

    for (const group of groups) {
        for (const item of group.items) {
            switch (item.type) {
                case "empty": {
                    buf.push("");
                    break;
                }
                case "title": {
                    buf.push(`## ${item.text}`);
                    buf.push("");
                    break;
                }
                case "text": {
                    buf.push(item.text);
                    buf.push("");
                    break;
                }
                case "section": {
                    if (item.level === group.maxLevel) {
                        buf.push(item.text); // as text
                    } else {
                        buf.push(
                            `##${
                                "#".repeat((item.level / 2) + 1)
                            } ${item.text}`,
                        );
                    }
                    buf.push("");
                    break;
                }
                case "list": {
                    let i = 0;
                    for (const k of item.text.split("*")) {
                        if (k !== "") {
                            break;
                        }
                        i++;
                    }
                    buf.push(`${"  ".repeat(i)}- ${item.text.substring(i)}`);
                    break;
                }
            }
        }
    }
    return buf.join("\n");
}

if (import.meta.main) {
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
}
