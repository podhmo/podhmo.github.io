import { describe, expect, it } from "vitest";
import { decryptSession, encryptSession } from "../src/session";

const SECRET = "test-secret-for-session-encryption";

const sampleUser = {
  login: "testuser",
  avatar_url: "https://example.com/a.png",
  name: "Test User",
  html_url: "https://github.com/testuser",
  access_token: "gho_dummy_access_token",
};

describe("session cookie encryption", () => {
  it("encrypt → decrypt round-trip", async () => {
    const cookie = await encryptSession(sampleUser, SECRET);
    const decrypted = await decryptSession(cookie, SECRET);
    expect(decrypted).toEqual(sampleUser);
  });

  it("cookie value does not contain plaintext token", async () => {
    const cookie = await encryptSession(sampleUser, SECRET);
    expect(cookie).not.toContain("gho_dummy_access_token");
    expect(cookie).not.toContain("testuser");
    // base64url の iv.ciphertext 形式
    expect(cookie).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("different IV per encryption (same input → different output)", async () => {
    const a = await encryptSession(sampleUser, SECRET);
    const b = await encryptSession(sampleUser, SECRET);
    expect(a).not.toBe(b);
  });

  it("rejects cookie encrypted with a different secret", async () => {
    const cookie = await encryptSession(sampleUser, SECRET);
    await expect(decryptSession(cookie, "other-secret")).rejects.toThrow();
  });

  it("rejects tampered ciphertext", async () => {
    const cookie = await encryptSession(sampleUser, SECRET);
    const [iv, ct] = cookie.split(".");
    const tampered = `${iv}.${ct.slice(0, -4)}AAAA`;
    await expect(decryptSession(tampered, SECRET)).rejects.toThrow();
  });

  it("rejects legacy plaintext JSON cookies", async () => {
    const legacy = encodeURIComponent(JSON.stringify(sampleUser));
    await expect(decryptSession(legacy, SECRET)).rejects.toThrow();
  });
});
