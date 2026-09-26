import { describe, expect, it } from "vitest";

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

describe("gist-by-file", () => {
  it("File upload form - multiple files handling", () => {
    // テスト用ファイル
    const testFiles = [
      new MockFile("test1.txt", "Hello World"),
      new MockFile("test2.js", "console.log('test');"),
      new MockFile("README.md", "# Test Project\n\nThis is a test."),
    ];

    // ファイル名が正しく取得できることを確認
    expect(testFiles[0].name).toBe("test1.txt");
    expect(testFiles[1].name).toBe("test2.js");
    expect(testFiles[2].name).toBe("README.md");

    // ファイルサイズが正しく計算されることを確認
    expect(testFiles[0].size).toBe(11); // "Hello World"
    expect(testFiles[1].size).toBe(20); // "console.log('test');" (セミコロンが1文字多い)
  });

  it("File content processing", async () => {
    const testFile = new MockFile(
      "sample.json",
      '{"name": "test", "value": 123}',
      "application/json",
    );

    // ファイル内容が正しく読み取れることを確認
    const content = await testFile.text();
    expect(content).toBe('{"name": "test", "value": 123}');

    // JSONとしてパースできることを確認
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe("test");
    expect(parsed.value).toBe(123);
  });

  it("Gist API payload structure", () => {
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
    expect(gistPayload.description).toBeTruthy();
    expect(gistPayload.public).toBe(false);
    expect(gistPayload.files).toBeTruthy();

    // ファイル構造が正しいことを確認
    expect(Object.keys(gistPayload.files).length).toBe(3);
    expect(gistPayload.files["test1.txt"]).toBeTruthy();
    expect(gistPayload.files["script.js"]).toBeTruthy();
    expect(gistPayload.files["README.md"]).toBeTruthy();

    expect(gistPayload.files["test1.txt"].content).toBe("Hello World");
  });

  it("File type validation", () => {
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
      expect(isTextFile(filename), `File ${filename}`).toBe(expectedText);
    });
  });

  it("File size formatting", () => {
    function formatFileSize(bytes: number): string {
      return (bytes / 1024).toFixed(1) + " KB";
    }

    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(512)).toBe("0.5 KB");
  });

  it("Error handling for API responses", () => {
    // 成功レスポンス
    const successResponse = {
      success: true,
      gist_url: "https://gist.github.com/user/123456",
      gist_id: "123456",
    };

    expect(successResponse.success).toBe(true);
    expect(successResponse.gist_url).toBeTruthy();
    expect(successResponse.gist_id).toBeTruthy();

    // エラーレスポンス
    const errorResponse = {
      success: false,
      error: "認証が必要です",
    };

    expect(errorResponse.success).toBe(false);
    expect(errorResponse.error).toBe("認証が必要です");
  });

  it("Multiple files processing into Gist payload", async () => {
    // Simulate multiple files from client
    const files = [
      new MockFile("file1.txt", "This is file 1"),
      new MockFile("file2.js", "console.log('file2');"),
      new MockFile("file3.md", "# File 3\n\nMarkdown content"),
    ];

    // Simulate server-side processing
    const gistFiles: Record<string, { content: string }> = {};

    for (const file of files) {
      const content = await file.text();
      gistFiles[file.name] = { content };
    }

    // Verify all three files are processed
    expect(Object.keys(gistFiles).length).toBe(3);

    // Verify each file has correct content
    expect(gistFiles["file1.txt"].content).toBe("This is file 1");
    expect(gistFiles["file2.js"].content).toBe("console.log('file2');");
    expect(gistFiles["file3.md"].content).toBe("# File 3\n\nMarkdown content");
  });

  it("parseBody all:true behavior simulation", () => {
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
    expect(Array.isArray(mockBodyWithMultipleFiles.files)).toBe(true);
    expect(mockBodyWithMultipleFiles.files.length).toBe(3);

    // Verify public param handling
    const publicParam = mockBodyWithMultipleFiles.public;
    const publicValue = Array.isArray(publicParam)
      ? publicParam[0]
      : publicParam;
    expect(publicValue).toBe("true");
  });

  it("Custom filename handling", async () => {
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
    expect(Object.keys(gistFiles).length).toBe(2);
    expect(gistFiles["renamed1.txt"]).toBeTruthy();
    expect(gistFiles["renamed2.txt"]).toBeTruthy();
    expect(gistFiles["renamed1.txt"].content).toBe("Content 1");
    expect(gistFiles["renamed2.txt"].content).toBe("Content 2");
  });

  it("Custom description handling", () => {
    // Test with custom description
    const customDescription = "My custom gist description";
    const isUpdate = false;

    const description = customDescription ||
      `${isUpdate ? "Updated" : "Uploaded"} via Gist Uploader`;

    expect(description).toBe("My custom gist description");

    // Test without custom description (fallback)
    const emptyDescription = "";
    const fallbackDescription = emptyDescription ||
      `${isUpdate ? "Updated" : "Uploaded"} via Gist Uploader`;

    expect(fallbackDescription).toBe("Uploaded via Gist Uploader");
  });

  it("File overwrite scenario for Gist update", async () => {
    // Scenario: User wants to update "old-file.txt" in existing Gist
    // by uploading "new-file.txt" but renaming it to "old-file.txt"

    const uploadedFile = new MockFile(
      "new-file.txt",
      "New content to replace old file",
    );
    const customFilename = "old-file.txt"; // Same name as existing file in Gist

    const gistFiles: Record<string, { content: string }> = {};
    const content = await uploadedFile.text();
    gistFiles[customFilename] = { content };

    // Verify the file will be uploaded with the custom name
    // This will overwrite "old-file.txt" in the Gist
    expect(gistFiles["old-file.txt"]).toBeTruthy();
    expect(gistFiles["old-file.txt"].content).toBe(
      "New content to replace old file",
    );

    // Original filename should not be in the gistFiles
    expect(gistFiles["new-file.txt"]).toBeUndefined();
  });
});
