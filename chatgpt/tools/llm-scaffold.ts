#!/usr/bin/env node
// Usage: node llm-scaffold.ts <command> [options] (Node 24+ 必須)
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { dirname, join, extname, relative, basename } from "node:path";

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

トリガーワードが私の発言に含まれていない通常の対話では、これらの形式に縛られる必要はありません。**あなたの役割は、私の疑問に答えたり、設計や実装に関する相談に乗ったりすることです。**自由に回答してください。**ただし、この通常の対話モードにおいては、\`${TRIGGER_WORD_GENERATE}\` の指示があるまで、具体的な実装コード全体の生成は控えてください。**部分的なコードのアイデアや概念的な説明は問題ありませんが、完成されたコードの提供は生成モードの役割です。

【出力形式のルール（生成モード）】
1.  各ファイルは、ファイルパスとその内容のペアで構成してください。
2.  ファイルパスは、プロジェクトのルートディレクトリからの相対パスで記述してください。
3.  ファイルの内容は、**4つのバッククォート（\`\`\`\`）で囲まれたMarkdownのコードブロック**として記述してください。
    - コードブロックの開始行には、言語識別子（オプション）とコロン \`:\` に続けてファイルパスを記述してください。
    - 例: \`\`\`\`typescript:src/components/Button.tsx
4.  生成するファイルが複数ある場合は、上記1〜3のセットを繰り返してください。
5.  ファイルの内容にMarkdownのコードブロックが含まれる場合（例：README.md内にサンプルコードを記述する場合）、そのネストしたコードブロックは通常の3つのバッククォート（\`\`\`）を使用してください。4つのバッククォートは最も外側のファイル単位のブロックでのみ使用します。
6.  出力の冒頭と末尾はdetailsタグで囲んでください。

【出力形式のルール（プランニングモード）】
1.  提案する各ファイルについて、以下の情報を1行で記述してください。
    -   \`ファイルパス - 簡単な説明や必要理由\`
2.  ファイルパスは、プロジェクトのルートディレクトリからの相対パスで記述してください。
3.  箇条書き（例: \`- \` や \`* \` で始まる行）で列挙してください。

【出力例（生成モード）】
私の依頼: 「挨拶をするPythonスクリプトと、その説明を書いたREADMEファイルを作って ${TRIGGER_WORD_GENERATE}」

あなたの期待される回答形式:

出力される内容は以下のようになります。

<details>

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

</details>

【出力例（プランニングモード）】
私の依頼: 「簡単なブログシステムのファイル構成案を教えて ${TRIGGER_WORD_PLAN}」

あなたの期待される回答形式:

- \`hello.py\` - アプリケーションのエントリーポイント
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

function getLanguageIdentifier(filepath: string): string {
    const ext = extname(filepath).toLowerCase();
    switch (ext) {
        case ".ts": return "typescript";
        case ".tsx": return "typescript";
        case ".js": return "javascript";
        case ".jsx": return "javascript";
        case ".py": return "python";
        case ".md": return "markdown";
        case ".json": return "json";
        case ".html": return "html";
        case ".css": return "css";
        case ".java": return "java";
        case ".go": return "go";
        case ".rb": return "ruby";
        case ".php": return "php";
        case ".cs": return "csharp";
        case ".cpp": return "cpp";
        case ".c": return "c";
        case ".swift": return "swift";
        case ".kt": return "kotlin";
        case ".rs": return "rust";
        case ".scala": return "scala";
        case ".pl": return "perl";
        case ".lua": return "lua";
        case ".r": return "r";
        case ".sql": return "sql";
        case ".sh": return "bash";
        case ".ps1": return "powershell";
        case ".yml":
        case ".yaml": return "yaml";
        case ".xml": return "xml";
        case ".txt": return "text";
        case ".log": return "log";
        case ".env": return "text";
        case ".dockerfile": return "dockerfile";
        case ".gitignore": return "text";
        default: return "";
    }
}

async function handleInit() {
    console.log(PROMPT_TEMPLATE.trim());
    const triggerExplanation = `
---
トリガーワードについて:
LLMへの指示の最後に以下のトリガーワードを含めることで、ツールの動作モードを指定できます。

- \`${TRIGGER_WORD_PLAN}\`: プランニングモード。ファイル構成案（ファイルパスと説明）をLLMに出力させます。
                       \`llm-scaffold plan\` コマンドでこの出力を確認できます。
- \`${TRIGGER_WORD_GENERATE}\`: 生成モード。実際のファイル内容を含んだscaffoldをLLMに出力させます。
                         \`llm-scaffold plan\` (内容確認) や \`llm-scaffold apply\` コマンドで利用します。

これらのトリガーワードの後のLLMの応答を、各コマンドの入力として与えてください。
---
  `;
    process.stderr.write(triggerExplanation);
}

async function handlePlan(inputFile: string) { // Renamed from handleParse
    if (!inputFile) {
        console.error(
            "Error: Input file path is required for 'plan' command.",
        );
        printHelp();
        process.exit(1);
    }
    try {
        const llmOutputText = (await readFile(inputFile, "utf-8")).trim();
        const planItems = parseScaffoldPlan(llmOutputText);
        const filesToGenerate = parseScaffoldGenerate(llmOutputText);

        if (planItems.length > 0 && filesToGenerate.length === 0) {
            console.log("\n📝 Detected Plan Mode Output (Proposed by LLM):");
            if (planItems.length === 0) {
                console.log("No plan items found in the input.");
                return;
            }
            planItems.forEach((item) => {
                console.log(`  📄 ${item.filepath} - ${item.description}`);
            });
        } else if (filesToGenerate.length > 0) {
            console.log(
                "\n⚙️  Detected Generate Mode Output (Files to be created by 'apply' command):",
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
        process.exit(1);
    }
}

async function handleApply( // Renamed from handleExecute
    inputFile: string,
    targetDirectory: string | undefined,
) {
    if (!inputFile) {
        console.error(
            "Error: Input file path is required for 'apply' command.",
        );
        printHelp();
        process.exit(1);
    }
    const projectRoot = targetDirectory || process.cwd();

    try {
        const llmOutputText = (await readFile(inputFile, "utf-8")).trim();
        const filesToGenerate = parseScaffoldGenerate(llmOutputText);

        if (filesToGenerate.length === 0) {
            console.warn("\n⚠️ No files to generate found in the LLM output.");
            console.warn(
                "   If you intended to check a plan, use the 'plan' command.",
            );
            console.warn(
                "   Ensure the LLM output (after ##SCAFFOLD_GENERATE##) is in the correct format:",
            );
            console.warn("   ````language:path/to/file.ext");
            console.warn("   File content...");
            console.warn("   ````");
            return;
        }

        await mkdir(projectRoot, { recursive: true });
        console.log(
            `\n⚙️  Applying scaffold generation in "${projectRoot}"...`,
        );

        for (const file of filesToGenerate) {
            if (!file.filepath) {
                console.warn("Skipping file with empty path.");
                continue;
            }
            const targetPath = join(projectRoot, file.filepath);
            const dir = dirname(targetPath);

            try {
                if (dir && dir !== "." && dir !== projectRoot) {
                    await mkdir(dir, { recursive: true });
                }
                await writeFile(targetPath, file.content, "utf-8");
                console.log(
                    `  ✅ Created: ${relative(projectRoot, targetPath) || basename(targetPath)}`,
                );
            } catch (error) {
                console.error(
                    `  ❌ Error writing file "${file.filepath}":`,
                    error.message,
                );
            }
        }
        console.log("\nScaffold application complete.");
    } catch (e) {
        handleFileError(e, inputFile, projectRoot);
        process.exit(1);
    }
}

async function encodeFileToString(actualFilePath: string, displayPath: string): Promise<string> {
    try {
        const content = await readFile(actualFilePath, "utf-8");
        const language = getLanguageIdentifier(actualFilePath);
        
        let normalizedDisplayPath = displayPath.replace(/\\/g, "/"); // Convert backslashes for consistency
        if (normalizedDisplayPath.startsWith("./")) {
            normalizedDisplayPath = normalizedDisplayPath.substring(2);
        }
        // If displayPath ended up empty (e.g. was "." or "./"), use basename of actual file
        if (!normalizedDisplayPath && basename(actualFilePath)) { 
            normalizedDisplayPath = basename(actualFilePath).replace(/\\/g, "/");
        }


        return `\`\`\`\`${language}:${normalizedDisplayPath}\n${content.trimEnd()}\n\`\`\`\`\n\n`;
    } catch (e) {
        console.error(`Error reading file "${actualFilePath}" for encoding: ${e.message}`);
        return "";
    }
}

async function encodeDirectoryRecursive(
    currentActualDir: string,
    currentDisplayBase: string,
): Promise<string> {
    let dirOutput = "";
    const ignoredDirs = [".git", "node_modules", ".vscode", ".idea", "dist", "build", "target", "out"];
    try {
        for (const entry of await readdir(currentActualDir, { withFileTypes: true })) {
            const actualEntryPath = join(currentActualDir, entry.name);
            const displayEntryPath = currentDisplayBase ? join(currentDisplayBase, entry.name) : entry.name;

            try {
                const st = await stat(actualEntryPath);
                if (st.isFile()) {
                    dirOutput += await encodeFileToString(actualEntryPath, displayEntryPath);
                } else if (st.isDirectory()) {
                    if (ignoredDirs.includes(entry.name)) {
                        console.warn(`  ℹ️ Skipping directory: ${displayEntryPath}`);
                        continue;
                    }
                    dirOutput += await encodeDirectoryRecursive(actualEntryPath, displayEntryPath);
                }
            } catch (statError) {
                 console.warn(`  ⚠️ Could not stat ${actualEntryPath}, skipping: ${(statError as Error).message}`);
            }
        }
    } catch (e) {
        console.error(`Error reading directory "${currentActualDir}" for encoding: ${(e as Error).message}`);
    }
    return dirOutput;
}

async function handleEncode(paths: string[]) {
    if (paths.length === 0) {
        console.error("Error: At least one file or directory path is required for 'encode' command.");
        printHelp();
        process.exit(1);
    }

    let fullOutput = "";

    for (const pathArg of paths) {
        let normalizedPathArg = pathArg.replace(/\\/g, "/"); // Normalize once at the start
        try {
            const st = await stat(pathArg);
            if (st.isFile()) {
                if (normalizedPathArg.startsWith("./")) {
                     normalizedPathArg = normalizedPathArg.substring(2);
                }
                fullOutput += await encodeFileToString(pathArg, normalizedPathArg);
            } else if (st.isDirectory()) {
                // For a directory argument, its own name (or "" if ".") becomes the base for display paths inside it.
                let displayBaseForDirItems = basename(normalizedPathArg);
                if (normalizedPathArg === "." || normalizedPathArg === "./") {
                    displayBaseForDirItems = ""; // Items in CWD are not prefixed
                }
                 // If pathArg was "foo/bar", displayBaseForDirItems is "bar"
                 // We want "foo/bar/item.txt", not "bar/item.txt"
                 // So, displayBaseForDirItems should be normalizedPathArg itself, unless it's "."
                if (normalizedPathArg.startsWith("./")) {
                     normalizedPathArg = normalizedPathArg.substring(2);
                }
                displayBaseForDirItems = (pathArg === "." || pathArg === "./") ? "" : normalizedPathArg;


                fullOutput += await encodeDirectoryRecursive(pathArg, displayBaseForDirItems);
            }
        } catch (e) {
            if ((e as { code?: string }).code === "ENOENT") {
                console.error(`Error: Path not found "${pathArg}"`);
            } else {
                console.error(`Error processing path "${pathArg}" for encoding: ${(e as Error).message}`);
            }
        }
    }

    if (fullOutput.length > 0) {
        // Ensure single trailing newline
        const outputToWrite = fullOutput.endsWith('\n\n') ? fullOutput.substring(0, fullOutput.length - 1) : fullOutput;
        process.stdout.write(outputToWrite);
    } else {
        console.warn("No files found or processed for encoding.");
    }
}


function handleFileError(e: unknown, inputFile: string, targetDir?: string) {
    const code = (e as { code?: string }).code;
    if (code === "ENOENT") {
        console.error(`Error: Input file not found at "${inputFile}"`);
    } else if (code === "EACCES" || code === "EPERM") {
        let pathInfo = `"${inputFile}"`;
        if (targetDir) pathInfo += ` or target directory "${targetDir}"`;
        console.error(
            `Error: Permission denied. Check read/write access for ${pathInfo}.`,
        );
    } else {
        console.error("An unexpected error occurred:", (e as Error).message);
        if ((e as Error).stack) console.error((e as Error).stack);
    }
}

function printHelp() {
    console.log(`
llm-scaffold: A tool to scaffold projects from LLM outputs and prepare inputs for LLMs.

Usage:
  node llm-scaffold.ts <command> [options]

Commands:
  init                      Prints the recommended prompt for LLM interaction and
                            explains trigger words to stderr.

  plan <input_file>         Parses the LLM output file and lists the planned files
                            (from ${TRIGGER_WORD_PLAN} mode) or files to be generated
                            (from ${TRIGGER_WORD_GENERATE} mode) without creating them.
                            - <input_file>: Path to the file containing LLM output.

  apply <input_file> [target_directory]
                            Parses the LLM output file (expected to be in 'generate'
                            mode format) and applies the scaffold, creating files
                            and directories.
                            - <input_file>: Path to the file containing LLM output.
                            - [target_directory]: Optional. Directory to scaffold into.
                                                  Defaults to the current working directory.

  encode <path_or_paths...>
                            Reads specified files and/or files within specified
                            directories and outputs their content in the format
                            expected by the LLM for generation tasks (quadruple backticks).
                            This is useful for providing existing code to an LLM.
                            - <path_or_paths...>: One or more file or directory paths.
                                                  Output paths are relative to the CWD if given as such,
                                                  or based on the directory structure provided.
                                                  Ignored Dirs: .git, node_modules, .vscode, .idea, dist, build, target, out
                                                  Example: 'encode src/component.ts README.md ./utils'

  help, -h, --help          Show this help message.

Example Workflow:
1. Get the prompt for instructing the LLM:
   node llm-scaffold.ts init > my_prompt.txt
   (Review trigger word explanations on stderr)
2. Use 'my_prompt.txt' with your LLM.
   - For planning: End your request with ${TRIGGER_WORD_PLAN}.
   - For direct generation: End your request with ${TRIGGER_WORD_GENERATE}.
3. Save LLM's response to a file (e.g., llm_plan_output.txt or llm_generate_output.txt).
4. Preview the LLM's plan or proposed file generation:
   node llm-scaffold.ts plan llm_generate_output.txt
5. Apply the scaffold (if output was for generation):
   node llm-scaffold.ts apply llm_generate_output.txt ./my_new_project
6. To provide existing code to LLM (e.g., for modification):
   node llm-scaffold.ts encode ./src/existing_module README.md > for_llm_input.txt
   (Then, paste content of for_llm_input.txt into your LLM prompt)
`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (
        !command || command === "help" || command === "-h" ||
        command === "--help"
    ) {
        printHelp();
        process.exit(0);
    }

    switch (command) {
        case "init":
            await handleInit();
            break;
        case "plan":
            await handlePlan(args[1]);
            break;
        case "apply":
            await handleApply(args[1], args[2]);
            break;
        case "encode":
            await handleEncode(args.slice(1));
            break;
        default:
            console.error(`Error: Unknown command "${command}"`);
            printHelp();
            process.exit(1);
    }
}

await main();