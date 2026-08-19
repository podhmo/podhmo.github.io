import { parse } from "jsr:@std/flags@0.224.0";
import { GoogleAuth } from "npm:google-auth-library@9.0.0";
import { join } from "jsr:@std/path@0.224.0";
import { Select } from "jsr:@cliffy/prompt@1.0.0-rc.7/select"; // Updated to rc.4 as per jsr.io

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
    console.error("エラー詳細:", error.message);
    Deno.exit(1);
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
      error.message,
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
    console.error("ファイル一覧の取得中にエラーが発生しました:", error.message);
    // エラーが発生した場合は空の配列を返すか、nullを返して呼び出し元で処理する
    return [];
  }
  return files;
}

/**
 * Get file metadata by file ID from Google Drive
 * @param client Authenticated Google API client
 * @param fileId Google Drive file ID
 * @returns DriveFile object or null if file not found
 */
async function getFileById(client: any, fileId: string): Promise<DriveFile | null> {
  try {
    const response = await client.request<DriveFile>({
      url: `${DRIVE_API_URL}/files/${fileId}`,
      params: {
        fields: "id,name,modifiedTime",
      },
    });

    if (response.data) {
      return response.data;
    } else {
      console.error(`ファイル ID: ${fileId} が見つかりませんでした。`);
      return null;
    }
  } catch (error) {
    console.error(
      `ファイル情報の取得中にエラーが発生しました (ID: ${fileId}):`,
      error.message,
    );
    return null;
  }
}

/**
 * Extract file ID from AI Studio URL
 * @param url AI Studio URL (e.g., https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5)
 * @returns File ID or null if URL is invalid
 */
export function extractFileIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // AI Studio URL format: https://aistudio.google.com/prompts/{fileId}
    if (urlObj.hostname === "aistudio.google.com" && urlObj.pathname.startsWith("/prompts/")) {
      const pathParts = urlObj.pathname.split("/");
      // pathParts will be ['', 'prompts', 'fileId', ...] for pathname '/prompts/fileId'
      // or ['', 'prompts', 'fileId', ''] for pathname '/prompts/fileId/'
      if (pathParts.length >= 3 && pathParts[2] && pathParts[2].length > 0) {
        return pathParts[2];
      }
    }
    return null;
  } catch {
    return null;
  }
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

    if (!fetchResponse.ok || !fetchResponse.body) {
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
            await Deno.mkdir(outputDir, { recursive: true });
        } catch (e) {
            if (!(e instanceof Deno.errors.AlreadyExists)) {
                console.error(`出力ディレクトリの作成に失敗しました: ${outputDir}`, e.message);
                return;
            }
        }
    }

    const file = await Deno.open(outputPath, { write: true, create: true });
    await fetchResponse.body.pipeTo(file.writable);

    console.log(`ファイル "${originalName}" を "${outputPath}" としてダウンロードしました。`);
  } catch (error) {
    console.error(
      `ファイルのダウンロード中にエラーが発生しました (ID: ${fileId}):`,
      error.message,
    );
  }
}


async function main() {
  const flags = parse(Deno.args, {
    string: ["output", "keyFile", "url"],
    boolean: ["help"],
    alias: { "h": "help", "o": "output", "u": "url" },
  });

  if (flags.help) {
    printUsage();
    Deno.exit(0);
  }

  if (flags.keyFile) {
    try {
        await Deno.stat(flags.keyFile);
        Deno.env.set("GOOGLE_APPLICATION_CREDENTIALS", flags.keyFile);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            console.error(`指定されたサービスアカウントキーファイルが見つかりません: ${flags.keyFile}`);
        } else {
            console.error(`サービスアカウントキーファイルの読み込み中にエラーが発生しました: ${flags.keyFile}`, error.message);
        }
        Deno.exit(1);
    }
  }

  const client = await getAuthenticatedClient();
  
  // If URL parameter is provided, download directly by ID
  if (flags.url) {
    const fileId = extractFileIdFromUrl(flags.url as string);
    if (!fileId) {
      console.error(`無効なAI Studio URLです: ${flags.url}`);
      console.error("正しいURL形式: https://aistudio.google.com/prompts/{fileId}");
      Deno.exit(1);
    }

    console.log(`URL からファイル ID を抽出しました: ${fileId}`);
    const file = await getFileById(client, fileId);
    
    if (!file) {
      console.error(`ファイル ID ${fileId} の情報を取得できませんでした。`);
      Deno.exit(1);
    }

    console.log(`ファイル "${file.name}" (ID: ${fileId}) をダウンロードします...`);
    await downloadFileInteractive(client, fileId, file.name, flags.output as string);
    Deno.exit(0);
  }

  // Original interactive flow
  const folderId = await findAiStudioFolderId(client);

  if (!folderId) {
    Deno.exit(1);
  }

  const files = await listFiles(client, folderId);

  if (files.length === 0) {
    console.log(`"${AI_STUDIO_FOLDER_NAME}" フォルダ内にダウンロード可能なファイルが見つかりませんでした。`);
    Deno.exit(0);
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
    const selectedFileValue: string = await Select.prompt({
        message: `ダウンロードする対話履歴を選択してください (↑↓キーで選択, Enterで決定):`,
        options: options,
        search: true, // 候補が多い場合に検索できるようにする
        // pageSize: 10, // 1ページに表示するアイテム数
    });

    if (selectedFileValue) {
        const [fileId, originalName] = selectedFileValue.split('|');
        console.log(`\n"${originalName}" (ID: ${fileId}) をダウンロードします...`);
        await downloadFileInteractive(client, fileId, originalName, flags.output as string);
    } else {
        console.log("ファイルが選択されませんでした。処理を終了します。");
    }
  } catch (error) {
    // Select.prompt が Ctrl+C などで中断された場合、エラーを投げる可能性がある
    // cliffy/prompt の場合、通常は undefined を返すか、特定の SignalError を投げる
    if (error.message.includes("Prompt was aborted")) { // cliffy v0.25.x の場合。rc版は挙動確認
        console.log("\n選択がキャンセルされました。処理を終了します。");
    } else {
        console.error("\n選択処理中に予期せぬエラーが発生しました:", error.message);
    }
    Deno.exit(0); // キャンセルまたはエラー時は正常終了(0)かエラー終了(1)か検討
  }
}

function printUsage() {
  console.log(`
Google AI Studio 対話履歴ダウンローダー

スクリプトを実行すると、"${AI_STUDIO_FOLDER_NAME}" フォルダ内の対話履歴が
更新日時順に一覧表示されます。カーソルキーでダウンロードしたいファイルを選択し、
Enterキーで決定してください。

または、--url オプションを使用して、AI Studio の URL から直接ダウンロードすることもできます。

オプション:
  -u, --url <URL>     AI Studio の URL を指定して直接ダウンロードします。
                      例: https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5
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
  ai-studio-download --url https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5
  ai-studio-download -u https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5 -o ./output
`);
}

if (import.meta.main) {
  await main();
}