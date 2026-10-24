/* SSRF guard for every server-side fetch of a URL that came from a visitor or a scraped page. */

const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[?::1\]?|\[?f[cd][0-9a-f]{2}:.*|\[?fe80:.*|metadata\.google\.internal)$/i;

export function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    if (!host.includes(".") || PRIVATE_HOST.test(host)) return false;
    if (u.port && !["80", "443"].includes(u.port)) return false;
    return true;
  } catch {
    return false;
  }
}

/** fetch() that refuses private targets, including after redirects (followed manually, max 4). */
export async function safeFetch(url: string, init: RequestInit = {}, hops = 4): Promise<Response> {
  if (!isPublicHttpUrl(url)) throw new Error("Blocked non-public URL");
  const res = await fetch(url, { ...init, redirect: "manual" });
  if (res.status >= 300 && res.status < 400 && res.headers.get("location") && hops > 0) {
    const next = new URL(res.headers.get("location")!, url).toString();
    return safeFetch(next, init, hops - 1);
  }
  return res;
}
