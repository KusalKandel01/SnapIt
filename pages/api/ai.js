// POST /api/ai { task: 'headlines'|'caption'|'hashtags'|'rewrite', input: string }
// POST /api/ai { task: 'imageAlt', imageDataUrl: string }
// Proxies an OpenAI-compatible chat completions endpoint so the key never
// reaches the browser — same pattern as pages/api/stock.js for Unsplash.
//
// Works with OpenAI directly, or any other provider that implements the
// same request/response shape (many do). Configure via env vars:
//   AI_API_KEY   — required
//   AI_API_URL   — defaults to OpenAI's endpoint
//   AI_MODEL     — defaults to 'gpt-4o-mini'; set to whatever your provider offers
//   AI_VISION_MODEL — for imageAlt specifically; defaults to AI_MODEL. Not every
//                     model can see images — set this to a vision-capable one
//                     (gpt-4o-mini supports vision) if your default text model doesn't.

// SECURITY NOTE: this route has no auth in front of it and calls a billed
// external API with a server-held key. Input-length/size caps and a
// timeout below bound the worst case per request, but they do NOT stop
// someone from calling this endpoint thousands of times per minute and
// running up your bill — that needs real rate limiting (e.g. Vercel KV or
// Upstash Redis backing a per-IP counter), which isn't wired up here
// because it needs infrastructure/credentials this codebase doesn't have.
// If this app is live publicly with an AI_API_KEY set, that's the
// remaining gap — either gate AI features behind login, or add a rate
// limiter, before this see real traffic.

const MAX_INPUT_CHARS = 4000;       // bounds prompt-token cost per request
const MAX_IMAGE_DATA_URL_CHARS = 8 * 1024 * 1024; // ~6MB image after base64 overhead
const REQUEST_TIMEOUT_MS = 20000;   // vision/chat calls run longer than a feed fetch

async function callUpstream(url, key, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

// Never hand a caller the upstream provider's raw error body in production —
// it can leak more than intended (stack traces, account-identifying info
// depending on provider). Full detail still available in dev for setup
// debugging, since that's when you actually need it.
function safeErrorPayload(message, detail) {
  const payload = { error: message };
  if (process.env.NODE_ENV !== 'production') payload.detail = detail;
  return payload;
}

const PROMPTS = {
  headlines: (input) => `Write 5 short, punchy social media headlines (each under 12 words) for a card about: "${input}". Return only the 5 headlines, one per line, no numbering.`,
  caption: (input) => `Write a short, engaging social media caption (2-3 sentences) for a card about: "${input}". Return only the caption text.`,
  hashtags: (input) => `Suggest 8 relevant, non-generic hashtags for a social media post about: "${input}". Return only the hashtags separated by spaces, each starting with #.`,
  rewrite: (input) => `Rewrite this headline to be punchier and more attention-grabbing, keeping it under 12 words: "${input}". Return only the rewritten headline.`
};

const ALT_TEXT_PROMPT = 'Write a concise, accurate alt-text description of this image for screen reader users, under 20 words. Describe what is actually visible — do not guess at names, locations, or context you cannot see. Return only the description text, no preamble.';

// Next.js API routes default to a 1MB request body limit. imageAlt sends a
// base64-encoded image in the body — any real photo is comfortably over
// 1MB as base64 — so without this, that feature fails on real images
// while appearing to work in quick tests with tiny ones.
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { task, input, imageDataUrl } = req.body || {};

  const key = process.env.AI_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: 'AI features need an API key. Set AI_API_KEY (and optionally AI_API_URL / AI_MODEL) in your environment — see README.md.'
    });
  }

  const url = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';

  if (task === 'imageAlt') {
    if (!imageDataUrl) return res.status(400).json({ error: 'No image provided' });
    if (imageDataUrl.length > MAX_IMAGE_DATA_URL_CHARS) return res.status(413).json({ error: 'Image is too large' });
    const model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';
    try {
      const upstream = await callUpstream(url, key, {
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: ALT_TEXT_PROMPT },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }],
        temperature: 0.4,
        max_tokens: 80
      });
      if (!upstream.ok) {
        const text = await upstream.text();
        return res.status(upstream.status).json(safeErrorPayload('Alt-text generation failed — your model may not support image input. Try setting AI_VISION_MODEL to a vision-capable model.', text));
      }
      const data = await upstream.json();
      const text = data.choices?.[0]?.message?.content || '';
      return res.status(200).json({ text: text.trim() });
    } catch (err) {
      const timedOut = err.name === 'AbortError';
      return res.status(timedOut ? 504 : 500).json(safeErrorPayload(timedOut ? 'AI provider timed out' : 'Could not reach the AI provider', String(err)));
    }
  }

  if (!PROMPTS[task]) return res.status(400).json({ error: 'Unknown task' });
  if (!input || !input.trim()) return res.status(400).json({ error: 'No input provided' });
  if (input.length > MAX_INPUT_CHARS) return res.status(413).json({ error: `Input is too long — keep it under ${MAX_INPUT_CHARS} characters` });

  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  try {
    const upstream = await callUpstream(url, key, {
      model,
      messages: [{ role: 'user', content: PROMPTS[task](input) }],
      temperature: 0.8,
      max_tokens: 300
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json(safeErrorPayload('AI request failed', text));
    }
    const data = await upstream.json();
    const text = data.choices?.[0]?.message?.content || '';
    res.status(200).json({ text: text.trim() });
  } catch (err) {
    const timedOut = err.name === 'AbortError';
    res.status(timedOut ? 504 : 500).json(safeErrorPayload(timedOut ? 'AI provider timed out' : 'Could not reach the AI provider', String(err)));
  }
}
