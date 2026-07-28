// GET /api/news?feeds=url1,url2,url3 (comma-separated, each URL-encoded)
// Fetches RSS/Atom feeds SERVER-SIDE and returns structured items.
//
// Deliberately RSS-only, not page scraping: RSS is a format publishers
// choose to expose specifically so their headlines can be syndicated —
// using it is the legitimate, sanctioned version of "get headlines from
// many sources fast." Scraping a site's rendered article pages (which is
// what nepalipaisa.com's /news actually is — no RSS feed, dynamically
// loaded, explicit copyright notice) is a different, unsanctioned thing.
//
// This intentionally returns headline + link + source + date only —
// never full article text — because the point is to get you to a fast
// starting point with attribution intact, not to reproduce the article.

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return '';
  let val = m[1].trim();
  const cdata = val.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) val = cdata[1].trim();
  return val
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

function extractLink(block) {
  // RSS: <link>url</link>. Atom: <link href="url" />
  const rss = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (rss && rss[1].trim()) return rss[1].trim();
  const atom = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return atom ? atom[1] : '';
}

function parseFeed(xml, sourceUrl) {
  const feedTitleMatch = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const sourceName = feedTitleMatch ? extractTag(`<title>${feedTitleMatch[1]}</title>`, 'title') : new URL(sourceUrl).hostname;

  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const block of itemBlocks) {
    const title = extractTag(block, 'title');
    const link = extractLink(block);
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const description = extractTag(block, 'description') || extractTag(block, 'summary');
    if (title) {
      items.push({
        title,
        link,
        source: sourceName,
        pubDate: pubDate || null,
        description: description ? description.slice(0, 200) : ''
      });
    }
  }
  return items;
}

const UA = 'Mozilla/5.0 (compatible; SnapStudioNewsDigest/1.0; +https://github.com/)';

async function fetchWithTimeout(url, extraHeaders = {}, ms = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': UA, ...extraHeaders },
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Timed out after 10s \u2014 the feed server is slow or unresponsive');
    throw new Error(`Network error: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

// Given a webpage's HTML, find the <link rel="alternate" type="application/rss+xml|atom+xml" href="..."> tag
// news sites publish to advertise their real feed URL, and resolve it to an absolute URL.
function discoverFeedUrl(html, baseUrl) {
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    const isFeed = /type=["'](application\/rss\+xml|application\/atom\+xml)["']/i.test(tag);
    if (!isFeed) continue;
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    try { return new URL(hrefMatch[1], baseUrl).toString(); } catch (e) { /* skip malformed */ }
  }
  return null;
}

async function fetchAndParse(url) {
  const r = await fetchWithTimeout(url, { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' });
  if (!r.ok) throw new Error(`Server returned ${r.status} ${r.statusText} \u2014 this URL may not be a real feed, or the site is blocking automated requests`);
  const body = await r.text();
  const looksLikeXml = /<rss|<feed|<\?xml/i.test(body.slice(0, 500));
  return { body, looksLikeXml };
}

export default async function handler(req, res) {
  const { feeds } = req.query;
  if (!feeds) return res.status(400).json({ error: 'No feed URLs provided' });

  const urls = feeds.split(',').map(u => u.trim()).filter(Boolean);
  if (urls.length === 0) return res.status(400).json({ error: 'No valid feed URLs' });
  if (urls.length > 20) return res.status(400).json({ error: 'Maximum 20 feeds at once' });

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const parsed = new URL(url); // throws a clear error on a malformed URL
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https URLs are allowed');

      // FIXED: a custom User-Agent like "SnapStudioNewsDigest/1.0" gets
      // blocked with a 403 by a meaningful number of real news sites —
      // they allow browsers and well-known feed readers, and reject
      // anything unrecognized. A standard browser UA is what real feed
      // readers (Feedly, etc.) actually send for exactly this reason.
      // Also added: a 10s timeout, since a single slow/hanging feed
      // shouldn't silently stall the whole digest.
      let { body: xml, looksLikeXml } = await fetchAndParse(url);
      let resolvedFrom = null;

      // AUTO-DISCOVERY: the #1 reason feeds "fail" is that people paste the
      // homepage (https://onlinekhabar.com) instead of the actual feed URL.
      // Rather than just erroring, try to find the site's real feed link in
      // its HTML <head> and transparently fetch that instead.
      if (!looksLikeXml) {
        const discovered = discoverFeedUrl(xml, url);
        if (!discovered) throw new Error('This looks like a regular webpage, and no RSS/Atom link was found on it \u2014 look for the site\u2019s dedicated feed URL (often ending in /feed or /rss)');
        const second = await fetchAndParse(discovered);
        if (!second.looksLikeXml) throw new Error('Found a feed link on that page, but it didn\u2019t return valid XML either \u2014 the site may not actually support RSS');
        xml = second.body;
        resolvedFrom = discovered;
      }

      const items = parseFeed(xml, resolvedFrom || url);
      if (items.length === 0) throw new Error('Valid feed, but zero items were found in it \u2014 the feed may be empty or use a format this parser doesn\u2019t recognize');
      return { items, resolvedFrom };
    })
  );

  const allItems = [];
  const errors = [];
  const resolved = []; // { requested, actual } pairs, so the client can offer to save the corrected URL
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      allItems.push(...r.value.items);
      if (r.value.resolvedFrom) resolved.push({ requested: urls[i], actual: r.value.resolvedFrom });
    } else {
      errors.push({ feed: urls[i], error: r.reason?.message || String(r.reason) });
    }
  });

  allItems.sort((a, b) => (new Date(b.pubDate || 0)) - (new Date(a.pubDate || 0)));

  res.status(200).json({ items: allItems, errors, resolved });
}
