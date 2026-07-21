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

export default async function handler(req, res) {
  const { feeds } = req.query;
  if (!feeds) return res.status(400).json({ error: 'No feed URLs provided' });

  const urls = feeds.split(',').map(u => u.trim()).filter(Boolean);
  if (urls.length === 0) return res.status(400).json({ error: 'No valid feed URLs' });
  if (urls.length > 20) return res.status(400).json({ error: 'Maximum 20 feeds at once' });

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const parsed = new URL(url); // throws on invalid URL
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https allowed');
      const r = await fetch(url, { headers: { 'User-Agent': 'SnapStudioNewsDigest/1.0' } });
      if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
      const xml = await r.text();
      return parseFeed(xml, url);
    })
  );

  const allItems = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') allItems.push(...r.value);
    else errors.push({ feed: urls[i], error: r.reason?.message || String(r.reason) });
  });

  allItems.sort((a, b) => (new Date(b.pubDate || 0)) - (new Date(a.pubDate || 0)));

  res.status(200).json({ items: allItems, errors });
}
