# Snap Studio

A multi-page social graphics builder: pick a platform size (Instagram, Facebook, X, LinkedIn, YouTube, Pinterest, TikTok, Threads...), fill in your text, pull a free HQ photo from Unsplash or upload your own (or your own video — it'll grab a frame), then export as PNG/JPEG or copy straight to your clipboard. Your logo and brand name live in the sidebar everywhere via the Brand Kit page.

## What's included

- `pages/index.js` — dashboard
- `pages/editor.js` — the main card builder: 4 layouts, unlimited text/image layers with typography controls and drag-resize, platform sizes, drag-and-drop uploads, video frame capture, stock photo search, AI Assist, emoji picker, customizable photo fade + page color, version history, batch export, save/load
- `pages/media.js` — media library (IndexedDB): upload once, reuse across every project
- `pages/news.js` — News Digest: RSS-based, attribution-first headline aggregation
- `pages/api/news.js` — server-side RSS/Atom parser (regex-based, no XML library dependency)
- `pages/brand.js` — multiple named brand kits (logo + name each), switch the active one
- `pages/templates.js` — 23 starting points across Nepal-specific occasions and worldwide formats
- `pages/brand.js` — logo + brand name (saved in your browser)
- `pages/api/stock.js` — server-side proxy to Unsplash (keeps your key private)
- `lib/platformSizes.js` — the full list of platform sizes; add more here any time
- `components/CardCanvas.js` — the actual card renderer
- `components/useAutosave.js` — debounced, timestamped autosave to `localStorage` — every edit is saved, nothing is lost on refresh or accidental close

## Autosave & version history

Every change you make is saved locally (in your browser) about a second after you stop typing, timestamped. The "Version history" button in the Editor lists every saved snapshot by date and time — click one to restore it. Reopening the Editor after closing the tab automatically picks up your most recent save. This is separate from "Save as file" / "Load a file," which export/import a single project as a portable `.json` you can hand to someone else or keep permanently outside the browser.

## Run it locally

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste in your Unsplash key
npm run dev
```

Open http://localhost:3000

### Getting a free Unsplash key
1. Go to https://unsplash.com/developers and sign up (free)
2. Create a new app (choose "Demo" — that's enough for personal use)
3. Copy the "Access Key" into `.env.local` as `UNSPLASH_ACCESS_KEY`

The stock photo search in the Editor won't return results until this is set — everything else works without it.

### Setting up AI Assist (optional)
1. Get an API key from an OpenAI-compatible provider (OpenAI itself, or any provider implementing the same `/chat/completions` shape)
2. Add to `.env.local`:
   ```
   AI_API_KEY=your_key_here
   AI_API_URL=https://api.openai.com/v1/chat/completions   # or your provider's endpoint
   AI_MODEL=gpt-4o-mini                                     # or whatever model your provider offers
   ```
3. Restart `npm run dev`

Without a key, the AI Assist buttons in the Editor return a clear error explaining what's missing — nothing else in the app is affected.

## News Digest

Go to `/news`, add RSS feed URLs (not regular webpage URLs — the feed itself, usually ending in `/feed`, `/rss`, or `rss.xml`), click "Refresh digest." Click "Start a post" on any headline and it opens the Editor pre-filled with that headline, the source name, and a caption crediting it — you write your own take, the source stays visible.

**Finding real feed URLs**: a verified directory of Nepal-focused RSS feeds exists at https://rss.feedspot.com/nepal_news_rss_feeds/ — copy the actual feed URL (not the outlet's homepage) from there. Many outlets also publish a `/feed` or `/rss` page listing their category-specific feeds directly on their own site.

**Deliberately not built**: scraping a site's regular web pages for headlines, or rewriting article content to obscure its source. See "Declined features" above for why.

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — Snap Studio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Deploy to Vercel

1. Go to https://vercel.com/new and import the GitHub repo you just pushed
2. Framework preset: Next.js (auto-detected, no changes needed)
3. Under **Environment Variables**, add `UNSPLASH_ACCESS_KEY` with your key (and `AI_API_KEY` / `AI_API_URL` / `AI_MODEL` if you want AI Assist working in production)
4. Click Deploy — you'll get a live URL in about a minute

Every push to `main` auto-redeploys.

## Extending it

This is a real, working scaffold covering the core flow end to end — not every feature from earlier prototypes is ported yet. Natural next additions, all straightforward given the structure already in place:
- More layouts (Quote, Stat) — copy the pattern in `CardCanvas.js`
- Batch export all platform sizes as a `.zip` (JSZip is already a dependency)
- Pan/zoom and filter controls on the background image
- Undo/redo history
- A second stock provider (Pexels has a similarly free API) as a fallback in `pages/api/stock.js`

## On the "competitor and social user scraping" idea

Deliberately not built. Automatically scraping competitors' content and republishing it as your own is copyright infringement and plagiarism; scraping other people's social accounts for data violates every major platform's Terms of Service and is a real privacy problem. If you want legitimate competitive/trend awareness, the sound approach is an RSS aggregator — pull public headlines and links from feeds you choose, display them for inspiration, always link back and credit the source. Ask if you want that wired in as a page.

## Notes on the "auto-fetch a person's photo" idea

Deliberately not built. Automatically pulling photos of named individuals from the internet is a copyright and privacy problem — most photos aren't licensed for reuse, and there's no way to distinguish "public figure" from "private person" from a name alone. The Unsplash integration gives you the same fast, no-upload workflow using genuinely licensed stock photography instead.
