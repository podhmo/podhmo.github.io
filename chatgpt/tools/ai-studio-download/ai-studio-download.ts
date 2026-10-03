#!/usr/bin/env node
// Usage: node ai-studio-download.ts [-o output_dir] [--keyFile path] (Node 24+ 必須)
// 依存: このディレクトリで `npm install` 済みであること (google-auth-library)
import { parseArgs } from "node:util";
import { GoogleAuth } from "google-auth-library";
import { join } from "node:path";
import { mkdir, stat, writeFile } from "node:fs/promises";
import * as readline from "node:readline/promises";

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const AI_STUDIO_FOLDER_NAME = "Google AI Studio";

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  mimeType?: string;
}

interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

async function getAuthenticatedClient() {
  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const client = await auth.getClient();
    return client;
  } catch (error) {
    console.error(
      "認証クライアントの取得に失敗しました。環境変数 GOOGLE_APPLICATION_CREDENTIALS が正しく設定されているか、サービスアカウントキーファイルへのアクセス権限があるか確認してください。",
    );
    console.error("エラー詳細:", (error as Error).message);
    process.exit(1);
  }
}

async function findAiStudioFolderId(client: any): Promise<string | null> {
  try {
    const response = await client.request<DriveFileList>({
      url: `${DRIVE_API_URL}/files`,
      params: {
        q: `name='${AI_STUDIO_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
        pageSize: 1,
      },
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    } else {
      console.error(`フォルダ "${AI_STUDIO_FOLDER_NAME}" が見つかりませんでした。`);
      return null;
    }
  } catch (error) {
    console.error(
      `"${AI_STUDIO_FOLDER_NAME}" フォルダの検索中にエラーが発生しました:`,
      (error as Error).message,
    );
    return null;
  }
}

async function listFiles(client: any, folderId: string): Promise<DriveFile[]> {
  let files: DriveFile[] = [];
  let pageToken: string | undefined = undefined;

  try {
    do {
      const response = await client.request<DriveFileList>({
        url: `${DRIVE_API_URL}/files`,
        params: {
          q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
          fields: "nextPageToken, files(id, name, modifiedTime)",
          orderBy: "modifiedTime desc",
          pageSize: 100,
          pageToken: pageToken,
        },
      });

      if (response.data.files) {
        files = files.concat(response.data.files);
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);
  } catch (error) {
    console.error("ファイル一覧の取得中にエラーが発生しました:", (error as Error).message);
    // エラーが発生した場合は空の配列を返すか、nullを返して呼び出し元で処理する
    return [];
  }
  return files;
}


function sanitizeFileName(originalName: string): string {
  let namePart = originalName;
  const extMatch = originalName.match(/\.[^.]+$/);
  if (extMatch) {
    namePart = originalName.substring(0, originalName.length - extMatch[0].length);
  }
  let sanitized = namePart.trim().replace(/\s+/g, "-").replace(/-+/g, "-");
  sanitized = sanitized.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF._-]/g, "_");
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, "");
  if (!sanitized) {
    sanitized = originalName.substring(0, 10).replace(/[^\w]/g, "_") || "downloaded-file";
  }
  return `${sanitized}.json`;
}

async function downloadFileInteractive(
  client: any,
  fileId: string,
  originalName: string,
  outputDir?: string,
) {
  try {
    const token = await (client.getAccessToken() as Promise<{token: string | null}>);
    if (!token.token) {
        console.error("アクセストークンの取得に失敗しました。");
        return;
    }

    const fetchResponse = await fetch(`${DRIVE_API_URL}/files/${fileId}?alt=media`, {
        headers: {
            Authorization: `Bearer ${token.token}`,
        },
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error(
        `ファイルのダウンロードに失敗しました (ID: ${fileId})。ステータス: ${fetchResponse.status}`,
        errorText
      );
      return;
    }

    const sanitizedName = sanitizeFileName(originalName);
    const outputPath = outputDir
      ? join(outputDir, sanitizedName)
      : sanitizedName;

    if (outputDir) {
        try {
            await mkdir(outputDir, { recursive: true });
        } catch (e) {
            console.error(`出力ディレクトリの作成に失敗しました: ${outputDir}`, (e as Error).message);
            return;
        }
    }

    const buffer = Buffer.from(await fetchResponse.arrayBuffer());
    await writeFile(outputPath, buffer);

    console.log(`ファイル "${originalName}" を "${outputPath}" としてダウンロードしました。`);
  } catch (error) {
    console.error(
      `ファイルのダウンロード中にエラーが発生しました (ID: ${fileId}):`,
      (error as Error).message,
    );
  }
}

/** 番号入力 + 絞り込み文字列で候補を1つ選ぶ (cliffy の Select.prompt の簡易代替) */
async function selectPrompt(
  message: string,
  options: { name: string; value: string }[],
): Promise<string | undefined> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    let candidates = options;
    for (;;) {
      candidates.forEach((opt, i) => console.log(`  ${i + 1}) ${opt.name}`));
      const answer = (
        await rl.question(`${message}\n番号または絞り込み文字列を入力 (空Enterでキャンセル): `)
      ).trim();
      if (!answer) return undefined;
      const num = Number.parseInt(answer, 10);
      if (Number.isInteger(num) && num >= 1 && num <= candidates.length) {
        return candidates[num - 1].value;
      }
      const filtered = options.filter((o) => o.name.includes(answer));
      if (filtered.length === 1) return filtered[0].value;
      if (filtered.length === 0) {
        console.log("該当する項目がありません。");
        candidates = options;
      } else {
        candidates = filtered;
      }
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const { values: flags } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h", default: false },
      output: { type: "string", short: "o" },
      keyFile: { type: "string" },
    },
    allowPositionals: true,
  });

  if (flags.help) {
    printUsage();
    process.exit(0);
  }

  if (flags.keyFile) {
    try {
        await stat(flags.keyFile);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = flags.keyFile;
    } catch (error) {
        if ((error as { code?: string }).code === "ENOENT") {
            console.error(`指定されたサービスアカウントキーファイルが見つかりません: ${flags.keyFile}`);
        } else {
            console.error(`サービスアカウントキーファイルの読み込み中にエラーが発生しました: ${flags.keyFile}`, (error as Error).message);
        }
        process.exit(1);
    }
  }

  const client = await getAuthenticatedClient();
  const folderId = await findAiStudioFolderId(client);

  if (!folderId) {
    process.exit(1);
  }

  const files = await listFiles(client, folderId);

  if (files.length === 0) {
    console.log(`"${AI_STUDIO_FOLDER_NAME}" フォルダ内にダウンロード可能なファイルが見つかりませんでした。`);
    process.exit(0);
  }

  const options = files.map(file => {
    const date = new Date(file.modifiedTime).toLocaleString("ja-JP", {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
    return {
      name: `${date} - ${file.name}`,
      value: `${file.id}|${file.name}`, // IDと元のファイル名を結合して渡す
    };
  });

  try {
    const selectedFileValue: string | undefined = await selectPrompt(
        `ダウンロードする対話履歴を選択してください:`,
        options,
    );

    if (selectedFileValue) {
        const [fileId, originalName] = selectedFileValue.split('|');
        console.log(`\n"${originalName}" (ID: ${fileId}) をダウンロードします...`);
        await downloadFileInteractive(client, fileId, originalName, flags.output);
    } else {
        console.log("ファイルが選択されませんでした。処理を終了します。");
    }
  } catch (error) {
    console.error("\n選択処理中に予期せぬエラーが発生しました:", (error as Error).message);
    process.exit(0); // キャンセルまたはエラー時は正常終了(0)かエラー終了(1)か検討
  }
}

function printUsage() {
  console.log(`
Google AI Studio 対話履歴ダウンローダー

スクリプトを実行すると、"${AI_STUDIO_FOLDER_NAME}" フォルダ内の対話履歴が
更新日時順に一覧表示されます。番号(または絞り込み文字列)を入力して
ダウンロードしたいファイルを選択してください。

オプション:
  -o, --output <パス> ダウンロード先のディレクトリを指定します。
                      省略時はカレントディレクトリに保存されます。
  --keyFile <パス>    サービスアカウントキーファイルへのパスを指定します。
                      (環境変数 GOOGLE_APPLICATION_CREDENTIALS より優先)
  -h, --help          このヘルプメッセージを表示します。

環境変数:
  GOOGLE_APPLICATION_CREDENTIALS  サービスアカウントキーJSONファイルへのパス。

例:
  ai-studio-download
  ai-studio-download -o ./downloaded_histories
  ai-studio-download --keyFile ./path/to/your-service-account-key.json
`);
}

await main();
