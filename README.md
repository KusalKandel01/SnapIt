# Snap Studio

A multi-page social graphics builder: pick a platform size (Instagram, Facebook, X, LinkedIn, YouTube, Pinterest, TikTok, Threads...), fill in your text, pull a free HQ photo from Unsplash or upload your own (or your own video — it'll grab a frame), then export as PNG/JPEG or copy straight to your clipboard. Your logo and brand name live in the sidebar everywhere via the Brand Kit page.

## What's included

- `pages/index.js` — dashboard
- `pages/editor.js` — the main card builder (layouts, platform sizes, stock photo search, video-frame capture, export, save/load)
- `pages/templates.js` — one-click starting points
- `pages/brand.js` — logo + brand name (saved in your browser)
- `pages/api/stock.js` — server-side proxy to Unsplash so your API key is never exposed to the browser
- `lib/platformSizes.js` — the full list of platform sizes; add more here any time
- `components/CardCanvas.js` — the actual card renderer, shared by Editor and Templates

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
3. Under **Environment Variables**, add `UNSPLASH_ACCESS_KEY` with your key
4. Click Deploy — you'll get a live URL in about a minute

Every push to `main` auto-redeploys.

## Extending it

This is a real, working scaffold covering the core flow end to end — not every feature from earlier prototypes is ported yet. Natural next additions, all straightforward given the structure already in place:
- More layouts (Quote, Stat) — copy the pattern in `CardCanvas.js`
- Batch export all platform sizes as a `.zip` (JSZip is already a dependency)
- Pan/zoom and filter controls on the background image
- Undo/redo history
- A second stock provider (Pexels has a similarly free API) as a fallback in `pages/api/stock.js`

## Notes on the "auto-fetch a person's photo" idea

Deliberately not built. Automatically pulling photos of named individuals from the internet is a copyright and privacy problem — most photos aren't licensed for reuse, and there's no way to distinguish "public figure" from "private person" from a name alone. The Unsplash integration gives you the same fast, no-upload workflow using genuinely licensed stock photography instead.
