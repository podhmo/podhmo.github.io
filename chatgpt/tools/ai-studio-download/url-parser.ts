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
