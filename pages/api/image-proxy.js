// GET /api/image-proxy?url=<encoded image URL>
//
// WHY THIS EXISTS: the Editor's export (html2canvas) reads pixel data out of
// a <canvas> to produce a PNG/JPEG/PDF. Reading pixels from a canvas that
// drew a cross-origin image "taints" it unless that image's server sent
// permissive CORS headers — most news CDNs don't. Without this proxy, a
// News Digest headline with an image from a CORS-restrictive source would
// silently break export (blank image, or the whole download failing) —
// exactly the "one click, ready to export" promise this feature makes.
//
// Routing the image through our own /api/image-proxy makes it same-origin
// by the time the browser sees it, so no CORS headers are needed at all —
// the standard fix for this class of problem.
//
// Restricted to actual images only (checks the real Content-Type of the
// response, not just the URL's file extension) so this can't be used as a
// general-purpose "fetch any URL through our server" proxy.

const { safeFetch, readCapped } = require('../../lib/safeFetch');

const ALLOWED_TYPES = /^image\/(png|jpe?g|gif|webp|svg\+xml|avif|bmp)/i;

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url parameter' });

  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const r = await safeFetch(url, { 'Accept': 'image/*' });
    if (!r.ok) return res.status(502).json({ error: `Source returned ${r.status}` });

    const contentType = r.headers.get('content-type') || '';
    if (!ALLOWED_TYPES.test(contentType)) return res.status(415).json({ error: 'Not an image' });

    const buf = await readCapped(r, 8 * 1024 * 1024); // 8MB — generous for a social card image, not for abuse
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // same image URL = same bytes, safe to cache a day
    res.status(200).send(buf);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not fetch image' });
  }
}
