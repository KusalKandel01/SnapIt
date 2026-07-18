// GET /api/stock?q=mountains
// Proxies Unsplash's search endpoint so the API key never reaches the browser.
export default async function handler(req, res) {
  const { q } = req.query;
  const key = process.env.UNSPLASH_ACCESS_KEY;

  if (!key) {
    return res.status(500).json({
      error: 'UNSPLASH_ACCESS_KEY is not set. Add it in your Vercel project settings or .env.local — see README.md.'
    });
  }
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const upstream = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: 'Unsplash request failed', detail: text });
    }
    const data = await upstream.json();
    const results = (data.results || []).map(r => ({
      id: r.id,
      thumb: r.urls.small,
      full: r.urls.regular,
      alt: r.alt_description || 'photo',
      credit: r.user?.name || 'Unsplash',
      creditUrl: r.user?.links?.html || 'https://unsplash.com'
    }));
    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Server error reaching Unsplash', detail: String(err) });
  }
}
