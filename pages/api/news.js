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
// This intentionally returns headline + link + source + date + thumbnail
// image only — never full article text — because the point is to get you
// to a fast starting point with attribution intact, not to reproduce the
// article. The image comes from the feed's own media tags (media:content,
// media:thumbnail, enclosure) or an <img> already embedded in its
// description — never fetched/scraped from the article page itself.

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

function extractImage(block) {
  // Covers the handful of ways feeds actually carry an image, in the order
  // real-world feeds most commonly use them:
  // 1. <media:content url="..." medium="image" /> or type="image/*"
  const mediaContent = block.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i)
    || block.match(/<media:content[^>]*(?:medium=["']image["']|type=["']image\/[^"']*["'])[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (mediaContent) return mediaContent[1];

  // 2. <media:thumbnail url="..." />
  const mediaThumb = block.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (mediaThumb) return mediaThumb[1];

  // 3. <enclosure url="..." type="image/*" />
  const enclosure = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image\/[^"']*["'][^>]*>/i)
    || block.match(/<enclosure[^>]*type=["']image\/[^"']*["'][^>]*url=["']([^"']+)["'][^>]*>/i);
  if (enclosure) return enclosure[1];

  // 4. First <img src="..."> inside the description or content:encoded body
  const bodyMatch = block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)
    || block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
  if (bodyMatch) {
    const img = bodyMatch[1].match(/<img[^>]*src=["']([^"']+)["']/i);
    if (img) return img[1];
  }
  return '';
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
    const image = extractImage(block);
    if (title) {
      items.push({
        title,
        link,
        source: sourceName,
        pubDate: pubDate || null,
        description: description ? description.slice(0, 200) : '',
        image: image || ''
      });
    }
  }
  return items;
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

const { safeFetch, readCapped } = require('../../lib/safeFetch');

async function fetchAndParse(url) {
  const r = await safeFetch(url, { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' });
  if (!r.ok) throw new Error(`Server returned ${r.status} ${r.statusText} \u2014 this URL may not be a real feed, or the site is blocking automated requests`);
  const bodyBuf = await readCapped(r);
  const body = bodyBuf.toString('utf-8');
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
      new URL(url); // throws a clear "Invalid URL" error early for malformed input

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
