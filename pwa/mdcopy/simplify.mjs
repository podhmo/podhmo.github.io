/** シンプルな表現のURLに変換する */
export function simplifyURL(url) {
    if (url.startsWith("https://www.amazon.") && url.includes("/dp/")) { // for Amazon product page
        // e.g. https://www.amazon.com/{description}/dp/{asin}/...
        const u = new URL(url);
        const parts = u.pathname.split("/dp/");
        const asin = parts[1].split("/")[0];
        return `${u.origin}/dp/${asin}`;
    }
    return url;
}
