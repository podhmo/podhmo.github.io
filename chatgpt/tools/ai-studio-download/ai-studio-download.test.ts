import { assertEquals } from "jsr:@std/assert@0.224.0";
import { extractFileIdFromUrl } from "./url-parser.ts";

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
