import { ensureDir } from "jsr:@std/fs@1.0.17";
import { dirname, join } from "jsr:@std/path@1.0.9";

const TRIGGER_WORD_GENERATE = "##SCAFFOLD_GENERATE##";
const TRIGGER_WORD_PLAN = "##SCAFFOLD_PLAN##";

const PROMPT_TEMPLATE = `
【重要なお願い】
あなたは、私と対話するアシスタントです。
もし、私の**最後の発言**に特定のトリガーワードが含まれていたら、その直後のあなたの応答は特別なモードとして扱われます。

1.  トリガーワード \`${TRIGGER_WORD_GENERATE}\` が含まれていた場合:
    scaffold生成モードとなり、以下の【出力形式のルール（生成モード）】に従って、ファイル構造と各ファイルの内容を厳密に出力してください。

2.  トリガーワード \`${TRIGGER_WORD_PLAN}\` が含まれていた場合:
    プランニングモードとなり、以下の【出力形式のルール（プランニングモード）】に従って、提案するファイル名とその必要理由（または簡単な説明）を箇条書きで出力してください。

トリガーワードが私の発言に含まれていない通常の対話では、これらの形式に縛られる必要はありません。自由に回答してください。

【出力形式のルール（生成モード）】
1.  各ファイルは、ファイルパスとその内容のペアで構成してください。
2.  ファイルパスは、プロジェクトのルートディレクトリからの相対パスで記述してください。
3.  ファイルの内容は、**4つのバッククォート（\`\`\`\`）で囲まれたMarkdownのコードブロック**として記述してください。
    - コードブロックの開始行には、言語識別子（オプション）とコロン \`:\` に続けてファイルパスを記述してください。
    - 例: \`\`\`\`typescript:src/components/Button.tsx
4.  生成するファイルが複数ある場合は、上記1〜3のセットを繰り返してください。
5.  ファイルの内容にMarkdownのコードブロックが含まれる場合（例：README.md内にサンプルコードを記述する場合）、そのネストしたコードブロックは通常の3つのバッククォート（\`\`\`）を使用してください。4つのバッククォートは最も外側のファイル単位のブロックでのみ使用します。

【出力形式のルール（プランニングモード）】
1.  提案する各ファイルについて、以下の情報を1行で記述してください。
    -   \`ファイルパス - 簡単な説明や必要理由\`
2.  ファイルパスは、プロジェクトのルートディレクトリからの相対パスで記述してください。
3.  箇条書き（例: \`- \` や \`* \` で始まる行）で列挙してください。

【出力例（生成モード）】
私の依頼: 「挨拶をするPythonスクリプトと、その説明を書いたREADMEファイルを作って ${TRIGGER_WORD_GENERATE}」

あなたの期待される回答形式:

\`\`\`\`python:hello.py
def greet(name):
  print(f"Hello, {name}!")

if __name__ == "__main__":
  greet("World")
\`\`\`\`

\`\`\`\`markdown:README.md
# 簡単な挨拶プログラム

これは \`hello.py\` という名前のPythonスクリプトです。
実行すると挨拶メッセージを表示します。

## 使い方

\`\`\`bash
python hello.py
\`\`\`

## コード例

\`\`\`python
def greet(name):
  print(f"Hello, {name}!")
\`\`\`
\`\`\`\`

【出力例（プランニングモード）】
私の依頼: 「簡単なブログシステムのファイル構成案を教えて ${TRIGGER_WORD_PLAN}」

あなたの期待される回答形式:

- \`src/index.js\` - アプリケーションのエントリーポイント
- \`src/components/PostList.js\` - 投稿一覧を表示するコンポーネント
- \`src/components/PostDetail.js\` - 個別の投稿を表示するコンポーネント
- \`src/services/api.js\` - API通信を行うモジュール
- \`public/index.html\` - HTMLのベースファイル
- \`README.md\` - プロジェクトの説明ファイル

これらの指示に従って、適切なモードで応答してください。
`;

interface PlanItem {
    filepath: string;
    description: string;
}

interface FileToGenerate {
    filepath: string;
    content: string;
    language?: string;
}

function parseScaffoldPlan(text: string): PlanItem[] {
    const plans: PlanItem[] = [];
    const lines = text.trim().split("\n");
    const planRegex =
        /^[\s*-]*\s*(?<filepath>[^-\n]+?)\s*-\s*(?<description>.*)$/;

    for (const line of lines) {
        const match = line.match(planRegex);
        if (match && match.groups) {
            const filepath = match.groups.filepath.trim().replace(/^`|`$/g, "")
                .trim();
            plans.push({
                filepath: filepath,
                description: match.groups.description.trim(),
            });
        }
    }
    return plans;
}

function parseScaffoldGenerate(text: string): FileToGenerate[] {
    const files: FileToGenerate[] = [];
    const lines = text.split("\n");
    let inBlock = false;
    let currentFile: FileToGenerate | null = null;
    let contentBuffer: string[] = [];

    for (const line of lines) {
        if (!inBlock && line.startsWith("````")) {
            const headerMatch = line.match(
                /^````(?<language>[a-zA-Z0-9-_]*):(?<filepath>[^\n]+)$/,
            );
            if (headerMatch && headerMatch.groups) {
                inBlock = true;
                currentFile = {
                    filepath: headerMatch.groups.filepath.trim(),
                    language: headerMatch.groups.language || undefined,
                    content: "",
                };
                contentBuffer = [];
            }
        } else if (inBlock && line.startsWith("````")) {
            if (currentFile) {
                currentFile.content = contentBuffer.join("\n");
                files.push(currentFile);
            }
            inBlock = false;
            currentFile = null;
            contentBuffer = [];
        } else if (inBlock) {
            contentBuffer.push(line);
        }
    }
    if (inBlock && currentFile) {
        console.warn(
            `Warning: Scaffold block for "${currentFile.filepath}" seems unclosed. Processing collected content.`,
        );
        currentFile.content = contentBuffer.join("\n");
        files.push(currentFile);
    }
    return files;
}

async function handleInit() {
    console.log(PROMPT_TEMPLATE.trim());
    const triggerExplanation = `
---
トリガーワードについて:
LLMへの指示の最後に以下のトリガーワードを含めることで、ツールの動作モードを指定できます。

- \`${TRIGGER_WORD_PLAN}\`: プランニングモード。ファイル構成案（ファイルパスと説明）をLLMに出力させます。
                       \`llm-scaffold parse\` コマンドでこの出力を確認できます。
- \`${TRIGGER_WORD_GENERATE}\`: 生成モード。実際のファイル内容を含んだscaffoldをLLMに出力させます。
                         \`llm-scaffold parse\` や \`llm-scaffold execute\` コマンドで利用します。

これらのトリガーワードの後のLLMの応答を、各コマンドの入力として与えてください。
---
  `;
    // 標準エラー出力に書き出す (Deno.stderr.writeSync と TextEncoder を使用)
    const encoder = new TextEncoder();
    await Deno.stderr.write(encoder.encode(triggerExplanation));
}

async function handleParse(inputFile: string) {
    if (!inputFile) {
        console.error(
            "Error: Input file path is required for 'parse' command.",
        );
        printHelp();
        Deno.exit(1);
    }
    try {
        const llmOutputText = (await Deno.readTextFile(inputFile)).trim();
        const planItems = parseScaffoldPlan(llmOutputText);
        const filesToGenerate = parseScaffoldGenerate(llmOutputText);

        if (planItems.length > 0 && filesToGenerate.length === 0) {
            console.log("\n📝 Detected Plan Mode Output:");
            if (planItems.length === 0) {
                console.log("No plan items found in the input.");
                return;
            }
            planItems.forEach((item) => {
                console.log(`  📄 ${item.filepath} - ${item.description}`);
            });
        } else if (filesToGenerate.length > 0) {
            console.log(
                "\n⚙️ Detected Generate Mode Output (Files to be created):",
            );
            if (filesToGenerate.length === 0) {
                console.log("No files to generate found in the input.");
                return;
            }
            filesToGenerate.forEach((file) => {
                console.log(`  📁 ${file.filepath}`);
            });
        } else {
            console.error(
                "\n⚠️ Could not determine mode or parse LLM output effectively.",
            );
            console.log(
                "Ensure the input file contains LLM output corresponding to a plan or generate trigger.",
            );
        }
    } catch (e) {
        handleFileError(e, inputFile);
        Deno.exit(1);
    }
}

async function handleExecute(
    inputFile: string,
    targetDirectory: string | undefined,
) {
    if (!inputFile) {
        console.error(
            "Error: Input file path is required for 'execute' command.",
        );
        printHelp();
        Deno.exit(1);
    }
    const projectRoot = targetDirectory || Deno.cwd();

    try {
        const llmOutputText = (await Deno.readTextFile(inputFile)).trim();
        const filesToGenerate = parseScaffoldGenerate(llmOutputText);

        if (filesToGenerate.length === 0) {
            console.warn("\n⚠️ No files to generate found in the LLM output.");
            console.warn(
                "   If you intended to run a plan, use the 'parse' command.",
            );
            console.warn(
                "   Ensure the LLM output (after ##SCAFFOLD_GENERATE##) is in the correct format:",
            );
            console.warn("   ````language:path/to/file.ext");
            console.warn("   File content...");
            console.warn("   ````");
            return;
        }

        await ensureDir(projectRoot); // Ensure the main target directory exists
        console.log(
            `\n⚙️  Executing scaffold generation in "${projectRoot}"...`,
        );

        for (const file of filesToGenerate) {
            if (!file.filepath) {
                console.warn("Skipping file with empty path.");
                continue;
            }
            const targetPath = join(projectRoot, file.filepath);
            const dir = dirname(targetPath);

            try {
                if (dir !== projectRoot && dir !== "." && dir !== "") {
                    await ensureDir(dir);
                }
                await Deno.writeTextFile(targetPath, file.content);
                console.log(
                    `  ✅ Created: ${
                        targetPath.replace(
                            projectRoot.endsWith("/")
                                ? projectRoot
                                : projectRoot + "/",
                            "",
                        )
                    }`,
                );
            } catch (error) {
                console.error(
                    `  ❌ Error writing file "${file.filepath}":`,
                    error.message,
                );
            }
        }
        console.log("\nScaffold generation complete.");
    } catch (e) {
        handleFileError(e, inputFile, projectRoot);
        Deno.exit(1);
    }
}

function handleFileError(e: any, inputFile: string, targetDir?: string) {
    if (e instanceof Deno.errors.NotFound) {
        console.error(`Error: Input file not found at "${inputFile}"`);
    } else if (e instanceof Deno.errors.PermissionDenied) {
        let pathInfo = `"${inputFile}"`;
        if (targetDir) pathInfo += ` or target directory "${targetDir}"`;
        console.error(
            `Error: Permission denied. Check read/write access for ${pathInfo}.`,
        );
    } else {
        console.error("An unexpected error occurred:", e.message);
        if (e.stack) console.error(e.stack);
    }
}

function printHelp() {
    console.log(`
llm-scaffold: A tool to scaffold projects from LLM outputs.

Usage:
  deno run --allow-read --allow-write llm-scaffold.ts <command> [options]

Commands:
  init                      Prints the recommended prompt for LLM interaction and
                            explains trigger words to stderr.

  parse <input_file>        Parses the LLM output file and lists the planned files
                            or files to be generated without creating them.
                            - <input_file>: Path to the file containing LLM output.

  execute <input_file> [target_directory]
                            Parses the LLM output file and generates the scaffold.
                            - <input_file>: Path to the file containing LLM output
                                            (expected to be in 'generate' mode format).
                            - [target_directory]: Optional. Directory to scaffold into.
                                                  Defaults to the current working directory.
  help, -h, --help          Show this help message.

Example Workflow:
1. Get the prompt:
   deno run llm-scaffold.ts init > my_prompt.txt
   (Review trigger word explanations on stderr)
2. Use 'my_prompt.txt' with your LLM. For planning, end your request with ${TRIGGER_WORD_PLAN}.
   For generation, end with ${TRIGGER_WORD_GENERATE}.
3. Save LLM's response to a file (e.g., llm_out.txt).
4. Parse the output (dry-run):
   deno run --allow-read llm-scaffold.ts parse llm_out.txt
5. Execute scaffolding (if output was for generation):
   deno run --allow-read --allow-write llm-scaffold.ts execute llm_out.txt ./my_new_project

`);
}

// --- Main CLI Logic ---
async function main() {
    const args = Deno.args;
    const command = args[0];

    if (
        !command || command === "help" || command === "-h" ||
        command === "--help"
    ) {
        printHelp();
        Deno.exit(0);
    }

    switch (command) {
        case "init":
            await handleInit();
            break;
        case "parse":
            await handleParse(args[1]);
            break;
        case "execute":
            await handleExecute(args[1], args[2]);
            break;
        default:
            console.error(`Error: Unknown command "${command}"`);
            printHelp();
            Deno.exit(1);
    }
}

if (import.meta.main) {
    main();
}
