import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";

// ファイルアップロード機能のテスト

Deno.test("File upload form - multiple files handling", () => {
  // MockFile クラスを作成
  class MockFile {
    name: string;
    size: number;
    type: string;
    content: string;

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
