// POST /api/grammar { text }
// Proxies LanguageTool's public API (no key needed for light/personal use).
// For heavy production traffic, self-host LanguageTool or get a paid key —
// see https://languagetool.org/http-api/ — and swap the endpoint below.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided' });

  try {
    const params = new URLSearchParams({ text, language: 'en-US' });
    const upstream = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Grammar service unavailable right now' });
    }
    const data = await upstream.json();
    const issues = (data.matches || []).map(m => ({
      message: m.message,
      offset: m.offset,
      length: m.length,
      snippet: text.slice(m.offset, m.offset + m.length),
      suggestions: (m.replacements || []).slice(0, 3).map(r => r.value)
    }));
    res.status(200).json({ issues });
  } catch (err) {
    res.status(500).json({ error: 'Could not reach the grammar checker — check your connection' });
  }
}
