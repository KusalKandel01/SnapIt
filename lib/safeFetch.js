// Shared SSRF guard for any server-side route that fetches a URL a client
// supplied (news feeds, image proxy, future link previews, etc). Pulled out
// of pages/api/news.js so a second route can't accidentally reimplement
// this — and get it subtly wrong — from scratch.
const dns = require('dns').promises;
const net = require('net');

// A named bot UA ("SnapStudioBot/1.0") gets blocked outright by Cloudflare
// and similar bot-protection on a huge share of real news sites — that
// protection defaults to allowing recognized browsers and rejecting
// anything else, named or not. RSS is explicitly published for automated
// fetching, so identifying as a normal browser here isn't evasion — it's
// what every real feed reader (Feedly, Inoreader, etc.) actually sends,
// for exactly this reason.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB cap on anything fetched this way

// Checking the hostname string alone isn't enough — an attacker-controlled
// domain can resolve to a private IP (DNS rebinding) — so this resolves DNS
// and checks the actual IP, not just the URL text.
function isPrivateOrReservedIp(ip) {
  const type = net.isIP(ip);
  if (type === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;                              // 10.0.0.0/8
    if (a === 127) return true;                              // loopback
    if (a === 169 && b === 254) return true;                 // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;         // 172.16.0.0/12
    if (a === 192 && b === 168) return true;                 // 192.168.0.0/16
    if (a === 0) return true;                                 // 0.0.0.0/8
    return false;
  }
  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true;                         // loopback
    if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;        // unique local (fc00::/7)
    if (lower.startsWith('::ffff:')) return isPrivateOrReservedIp(lower.slice(7)); // IPv4-mapped
    return false;
  }
  return true; // couldn't classify — fail closed
}

async function assertSafeUrl(urlStr) {
  const parsed = new URL(urlStr);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https URLs are allowed');
  const hostname = parsed.hostname;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) throw new Error('Requests to localhost are not allowed');

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (e) {
    throw new Error(`Could not resolve ${hostname}`);
  }
  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) throw new Error('This URL resolves to a private/internal address and can\u2019t be fetched');
  }
}

async function safeFetch(url, extraHeaders = {}, ms = 10000) {
  await assertSafeUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, ...extraHeaders },
      signal: controller.signal,
      redirect: 'follow'
    });
    // A redirect could land on a private address even though the original
    // URL was safe (redirect-based SSRF) — check the final URL too.
    if (r.url && r.url !== url) await assertSafeUrl(r.url);
    return r;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Timed out after 10s \u2014 the server is slow or unresponsive');
    throw err instanceof Error ? err : new Error(`Network error: ${err}`);
  } finally {
    clearTimeout(timeout);
  }
}

// Reads a response body with a hard byte cap, even if Content-Length is
// absent or lying, so a hostile/misconfigured server can't exhaust memory.
async function readCapped(r, maxBytes = MAX_RESPONSE_BYTES) {
  const declaredLength = Number(r.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) throw new Error('Response was too large');

  const reader = r.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > maxBytes) { reader.cancel(); throw new Error(`Response exceeded the ${Math.round(maxBytes / 1024 / 1024)}MB size limit`); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

module.exports = { safeFetch, assertSafeUrl, readCapped, MAX_RESPONSE_BYTES, UA };
