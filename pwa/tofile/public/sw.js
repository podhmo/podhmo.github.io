self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === "/share" && event.request.method === "POST") {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  try {
    const formData = await request.formData();
    const text = formData.get("text") || formData.get("url") || formData.get("title") || "";
    return makeDownloadPage(String(text), timestampFilename());
  } catch (err) {
    const errorText = `Error: ${err?.message ?? String(err)}\n\nStack:\n${err?.stack ?? "(no stack)"}`;
    return makeDownloadPage(errorText, `error-${timestampFilename().replace("note-", "")}`);
  }
}

// Return an HTML page that immediately downloads the file and redirects to /.
// This avoids postMessage + redirect race conditions on repeated shares.
function makeDownloadPage(text, filename) {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>Downloading…</title></head>
<body>
<script>
(function () {
  var blob = new Blob([${JSON.stringify(text)}], { type: "text/plain; charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = ${JSON.stringify(filename)};
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  location.replace("/");
})();
</script>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function timestampFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const y = now.getUTCFullYear();
  const mo = pad(now.getUTCMonth() + 1);
  const d = pad(now.getUTCDate());
  const h = pad(now.getUTCHours());
  const mi = pad(now.getUTCMinutes());
  const s = pad(now.getUTCSeconds());
  return `note-${y}${mo}${d}-${h}${mi}${s}.txt`;
}

