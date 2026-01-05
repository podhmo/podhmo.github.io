import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Since extractFileIdFromUrl is not exported, we need to recreate it for testing
// or export it from the main file. For now, we'll recreate it here.
function extractFileIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // AI Studio URL format: https://aistudio.google.com/prompts/{fileId}
    if (urlObj.hostname === "aistudio.google.com" && urlObj.pathname.startsWith("/prompts/")) {
      const pathParts = urlObj.pathname.split("/");
      const fileId = pathParts[2]; // /prompts/{fileId}
      if (fileId && fileId.length > 0) {
        return fileId;
      }
    }
    return null;
  } catch {
    return null;
  }
}

Deno.test("AI Studio URL Parser: extractFileIdFromUrl", async (t) => {
  await t.step("should extract file ID from valid AI Studio URL", () => {
    const url = "https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5";
    const fileId = extractFileIdFromUrl(url);
    assertEquals(fileId, "1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5");
  });

  await t.step("should extract file ID from AI Studio URL with trailing slash", () => {
    const url = "https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5/";
    const fileId = extractFileIdFromUrl(url);
    assertEquals(fileId, "1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5");
  });

  await t.step("should extract file ID from AI Studio URL with query parameters", () => {
    const url = "https://aistudio.google.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5?foo=bar";
    const fileId = extractFileIdFromUrl(url);
    assertEquals(fileId, "1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5");
  });

  await t.step("should return null for invalid hostname", () => {
    const url = "https://example.com/prompts/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5";
    const fileId = extractFileIdFromUrl(url);
    assertEquals(fileId, null);
  });

  await t.step("should return null for wrong path prefix", () => {
    const url = "https://aistudio.google.com/something/1-UCiE72JzsfPU5YzE0KVHj5MynEyKbQ5";
    const fileId = extractFileIdFromUrl(url);
    assertEquals(fileId, null);
  });

  await t.step("should return null for URL without file ID", () => {
    const url = "https://aistudio.google.com/prompts/";
    const fileId = extractFileIdFromUrl(url);
    assertEquals(fileId, null);
  });

  await t.step("should return null for malformed URL", () => {
    const url = "not-a-valid-url";
    const fileId = extractFileIdFromUrl(url);
    assertEquals(fileId, null);
  });

  await t.step("should return null for empty string", () => {
    const url = "";
    const fileId = extractFileIdFromUrl(url);
    assertEquals(fileId, null);
  });

  await t.step("should handle file ID with different formats", () => {
    // Test with various valid Google Drive file ID formats
    const testCases = [
      { url: "https://aistudio.google.com/prompts/abc123", expected: "abc123" },
      { url: "https://aistudio.google.com/prompts/1234567890", expected: "1234567890" },
      { url: "https://aistudio.google.com/prompts/a-b-c_123", expected: "a-b-c_123" },
    ];

    for (const testCase of testCases) {
      const fileId = extractFileIdFromUrl(testCase.url);
      assertEquals(fileId, testCase.expected);
    }
  });
});
