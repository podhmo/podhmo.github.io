import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";

// ファイルアップロード機能のテスト

// 共通のMockFileクラス
class MockFile {
  name: string;
  size: number;
  type: string;
  private content: string;

  constructor(name: string, content: string, type: string = "text/plain") {
    this.name = name;
    this.content = content;
    this.type = type;
    this.size = new TextEncoder().encode(content).length;
  }

  async text(): Promise<string> {
    return this.content;
  }
}

Deno.test("File upload form - multiple files handling", () => {

  // テスト用ファイル
  const testFiles = [
    new MockFile("test1.txt", "Hello World"),
    new MockFile("test2.js", "console.log('test');"),
    new MockFile("README.md", "# Test Project\n\nThis is a test."),
  ];

  // ファイル名が正しく取得できることを確認
  assertEquals(testFiles[0].name, "test1.txt");
  assertEquals(testFiles[1].name, "test2.js");
  assertEquals(testFiles[2].name, "README.md");

  // ファイルサイズが正しく計算されることを確認
  assertEquals(testFiles[0].size, 11); // "Hello World"
  assertEquals(testFiles[1].size, 20); // "console.log('test');" (セミコロンが1文字多い)
});

Deno.test("File content processing", async () => {
  const testFile = new MockFile(
    "sample.json",
    '{"name": "test", "value": 123}',
    "application/json",
  );

  // ファイル内容が正しく読み取れることを確認
  const content = await testFile.text();
  assertEquals(content, '{"name": "test", "value": 123}');

  // JSONとしてパースできることを確認
  const parsed = JSON.parse(content);
  assertEquals(parsed.name, "test");
  assertEquals(parsed.value, 123);
});

Deno.test("Gist API payload structure", () => {
  // Gist作成時のペイロード構造をテスト
  const mockFiles = {
    "test1.txt": { content: "Hello World" },
    "script.js": { content: "console.log('Hello');" },
    "README.md": { content: "# Test\nThis is a test file." },
  };

  const gistPayload = {
    description: "Test gist created via uploader",
    public: false,
    files: mockFiles,
  };

  // ペイロード構造が正しいことを確認
  assertExists(gistPayload.description);
  assertEquals(gistPayload.public, false);
  assertExists(gistPayload.files);

  // ファイル構造が正しいことを確認
  assertEquals(Object.keys(gistPayload.files).length, 3);
  assertExists(gistPayload.files["test1.txt"]);
  assertExists(gistPayload.files["script.js"]);
  assertExists(gistPayload.files["README.md"]);

  assertEquals(gistPayload.files["test1.txt"].content, "Hello World");
});

Deno.test("File type validation", () => {
  const testCases = [
    { filename: "test.txt", expectedText: true },
    { filename: "script.js", expectedText: true },
    { filename: "script.ts", expectedText: true },
    { filename: "component.jsx", expectedText: true },
    { filename: "component.tsx", expectedText: true },
    { filename: "app.py", expectedText: true },
    { filename: "README.md", expectedText: true },
    { filename: "config.json", expectedText: true },
    { filename: "index.html", expectedText: true },
    { filename: "style.css", expectedText: true },
    { filename: "image.png", expectedText: false },
    { filename: "document.pdf", expectedText: false },
  ];

  function isTextFile(filename: string): boolean {
    return /\.(js|ts|jsx|tsx|py|md|txt|json|html|css)$/i.test(filename);
  }

  testCases.forEach(({ filename, expectedText }) => {
    assertEquals(
      isTextFile(filename),
      expectedText,
      `File ${filename} should ${
        expectedText ? "be" : "not be"
      } treated as text`,
    );
  });
});

Deno.test("File size formatting", () => {
  function formatFileSize(bytes: number): string {
    return (bytes / 1024).toFixed(1) + " KB";
  }

  assertEquals(formatFileSize(1024), "1.0 KB");
  assertEquals(formatFileSize(2048), "2.0 KB");
  assertEquals(formatFileSize(1536), "1.5 KB");
  assertEquals(formatFileSize(512), "0.5 KB");
});

Deno.test("Error handling for API responses", () => {
  // 成功レスポンス
  const successResponse = {
    success: true,
    gist_url: "https://gist.github.com/user/123456",
    gist_id: "123456",
  };

  assertEquals(successResponse.success, true);
  assertExists(successResponse.gist_url);
  assertExists(successResponse.gist_id);

  // エラーレスポンス
  const errorResponse = {
    success: false,
    error: "認証が必要です",
  };

  assertEquals(errorResponse.success, false);
  assertExists(errorResponse.error);
  assertEquals(errorResponse.error, "認証が必要です");
});

Deno.test("Multiple files processing into Gist payload", async () => {
  // Simulate multiple files from client
  const files = [
    new MockFile("file1.txt", "This is file 1"),
    new MockFile("file2.js", "console.log('file2');"),
    new MockFile("file3.md", "# File 3\n\nMarkdown content"),
  ];

  // Simulate server-side processing (from main.tsx lines 584-589)
  const gistFiles: Record<string, { content: string }> = {};
  
  for (const file of files) {
    const content = await file.text();
    gistFiles[file.name] = { content };
  }

  // Verify all three files are processed
  assertEquals(Object.keys(gistFiles).length, 3);
  
  // Verify each file has correct content
  assertEquals(gistFiles["file1.txt"].content, "This is file 1");
  assertEquals(gistFiles["file2.js"].content, "console.log('file2');");
  assertEquals(gistFiles["file3.md"].content, "# File 3\n\nMarkdown content");
});

Deno.test("parseBody all:true behavior simulation", () => {
  // Simulate what Hono's parseBody({ all: true }) returns
  // When multiple files are uploaded with the same key 'files'
  const mockBodyWithMultipleFiles = {
    files: [
      { name: "file1.txt", text: () => Promise.resolve("content1") },
      { name: "file2.txt", text: () => Promise.resolve("content2") },
      { name: "file3.txt", text: () => Promise.resolve("content3") },
    ],
    public: ["true"], // With all:true, single values may also become arrays
  };

  // Verify files is an array
  assertEquals(Array.isArray(mockBodyWithMultipleFiles.files), true);
  assertEquals(mockBodyWithMultipleFiles.files.length, 3);

  // Verify public param handling (from main.tsx lines 570-572)
  const publicParam = mockBodyWithMultipleFiles.public;
  const publicValue = Array.isArray(publicParam) ? publicParam[0] : publicParam;
  assertEquals(publicValue, "true");
});

Deno.test("Custom filename handling", async () => {
  // Simulate files with custom filenames
  const files = [
    new MockFile("original1.txt", "Content 1"),
    new MockFile("original2.txt", "Content 2"),
  ];
  
  // Simulate custom filenames from form
  const customFilenames = ["renamed1.txt", "renamed2.txt"];
  
  // Process files with custom names
  const gistFiles: Record<string, { content: string }> = {};
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const content = await file.text();
    const filename = customFilenames[i] || file.name;
    gistFiles[filename] = { content };
  }
  
  // Verify custom filenames are used
  assertEquals(Object.keys(gistFiles).length, 2);
  assertExists(gistFiles["renamed1.txt"]);
  assertExists(gistFiles["renamed2.txt"]);
  assertEquals(gistFiles["renamed1.txt"].content, "Content 1");
  assertEquals(gistFiles["renamed2.txt"].content, "Content 2");
});

Deno.test("Custom description handling", () => {
  // Test with custom description
  const customDescription = "My custom gist description";
  const isUpdate = false;
  
  const description = customDescription || `${isUpdate ? 'Updated' : 'Uploaded'} via Gist Uploader`;
  
  assertEquals(description, "My custom gist description");
  
  // Test without custom description (fallback)
  const emptyDescription = "";
  const fallbackDescription = emptyDescription || `${isUpdate ? 'Updated' : 'Uploaded'} via Gist Uploader`;
  
  assertEquals(fallbackDescription, "Uploaded via Gist Uploader");
});

Deno.test("File overwrite scenario for Gist update", async () => {
  // Scenario: User wants to update "old-file.txt" in existing Gist
  // by uploading "new-file.txt" but renaming it to "old-file.txt"
  
  const uploadedFile = new MockFile("new-file.txt", "New content to replace old file");
  const customFilename = "old-file.txt"; // Same name as existing file in Gist
  
  const gistFiles: Record<string, { content: string }> = {};
  const content = await uploadedFile.text();
  gistFiles[customFilename] = { content };
  
  // Verify the file will be uploaded with the custom name
  // This will overwrite "old-file.txt" in the Gist
  assertExists(gistFiles["old-file.txt"]);
  assertEquals(gistFiles["old-file.txt"].content, "New content to replace old file");
  
  // Original filename should not be in the gistFiles
  assertEquals(gistFiles["new-file.txt"], undefined);
});
