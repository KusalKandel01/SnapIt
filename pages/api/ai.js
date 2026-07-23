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

const PROMPTS = {
  headlines: (input) => `Write 5 short, punchy social media headlines (each under 12 words) for a card about: "${input}". Return only the 5 headlines, one per line, no numbering.`,
  caption: (input) => `Write a short, engaging social media caption (2-3 sentences) for a card about: "${input}". Return only the caption text.`,
  hashtags: (input) => `Suggest 8 relevant, non-generic hashtags for a social media post about: "${input}". Return only the hashtags separated by spaces, each starting with #.`,
  rewrite: (input) => `Rewrite this headline to be punchier and more attention-grabbing, keeping it under 12 words: "${input}". Return only the rewritten headline.`
};

const ALT_TEXT_PROMPT = 'Write a concise, accurate alt-text description of this image for screen reader users, under 20 words. Describe what is actually visible — do not guess at names, locations, or context you cannot see. Return only the description text, no preamble.';

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
    const model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';
    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
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
        })
      });
      if (!upstream.ok) {
        const text = await upstream.text();
        return res.status(upstream.status).json({ error: 'Alt-text generation failed — your model may not support image input. Try setting AI_VISION_MODEL to a vision-capable model.', detail: text });
      }
      const data = await upstream.json();
      const text = data.choices?.[0]?.message?.content || '';
      return res.status(200).json({ text: text.trim() });
    } catch (err) {
      return res.status(500).json({ error: 'Could not reach the AI provider', detail: String(err) });
    }
  }

  if (!PROMPTS[task]) return res.status(400).json({ error: 'Unknown task' });
  if (!input || !input.trim()) return res.status(400).json({ error: 'No input provided' });

  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: PROMPTS[task](input) }],
        temperature: 0.8,
        max_tokens: 300
      })
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: 'AI request failed', detail: text });
    }
    const data = await upstream.json();
    const text = data.choices?.[0]?.message?.content || '';
    res.status(200).json({ text: text.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Could not reach the AI provider', detail: String(err) });
  }
}
