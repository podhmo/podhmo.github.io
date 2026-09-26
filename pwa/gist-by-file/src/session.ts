// user_session Cookie の暗号化/復号 (AES-GCM + SESSION_SECRET)
// WebCrypto 標準APIのみ。依存なし。

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const b64urlEncode = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const b64urlDecode = (s: string): Uint8Array =>
  Uint8Array.from(
    atob(s.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );

// SESSION_SECRET から AES-256-GCM の鍵を導出 (SHA-256 ハッシュをそのまま鍵にする)
async function sessionKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSession(
  value: unknown,
  secret: string,
): Promise<string> {
  const key = await sessionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(value)),
  );
  return `${b64urlEncode(iv)}.${b64urlEncode(new Uint8Array(ciphertext))}`;
}

export async function decryptSession<T>(
  cookie: string,
  secret: string,
): Promise<T> {
  const [ivPart, ctPart] = cookie.split(".");
  if (!ivPart || !ctPart) {
    throw new Error("invalid session cookie format");
  }
  const key = await sessionKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64urlDecode(ivPart) as BufferSource },
    key,
    b64urlDecode(ctPart) as BufferSource,
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}
