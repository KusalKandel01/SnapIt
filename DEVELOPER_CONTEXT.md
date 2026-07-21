# Snap Studio — Developer Context

This document exists so anyone (human or AI) picking up this project doesn't have to reconstruct decisions from scratch. Read this before changing anything.

## What this actually is

A Next.js web app for building social media graphic cards (news alerts, quotes, stats, announcements) for Nepal-specific occasions and worldwide use cases, sized correctly for every major platform, with a logo/brand kit, exported as images.

**Primary users:** social media managers, small businesses, community organizers — likely including Nepali diaspora / Nepal-based creators, given the explicit Nepal-focused template set requested.

**Core promise the product makes:** build one card, get it sized correctly for wherever you're posting it, without needing separate design tools per platform.

## Stack

- Next.js 14.2.35 (Pages Router, not App Router — kept simple deliberately, no App Router complexity was needed for this scope)
- React 18
- No CSS framework — hand-written CSS custom properties in `styles/globals.css`, no Tailwind
- `html2canvas` for DOM → image export
- `jszip` for batch multi-file export
- Two external APIs, both proxied server-side so keys never reach the browser: Unsplash (stock photos) and LanguageTool (grammar check)

## File map (as of last edit)

```
pages/
  index.js        dashboard
  editor.js        the main card builder — biggest file, most logic lives here
  templates.js     35 preset starting points, split into Nepal / Worldwide groups
  brand.js         logo + brand name, saved to localStorage
  _app.js          imports global CSS, nothing else
  api/
    stock.js       proxies Unsplash search — requires UNSPLASH_ACCESS_KEY env var
    grammar.js     proxies LanguageTool's public check endpoint, no key needed
components/
  CardCanvas.js    the actual renderer — 4 layouts (dark/light/quote/stat), takes a `data` object, forwardRef so html2canvas can capture it
  Layout.js        sidebar nav + brand logo display, wraps every page
  useToast.js      tiny toast notification hook
  useAutosave.js   autosave + version history hook (see "Autosave model" below)
  Stepper.js       +/- numeric input component — NEW, replaces range sliders (see "In progress" below)
  DropZone.js      drag-and-drop file upload component — NEW (see "In progress" below)
lib/
  platformSizes.js single source of truth for every platform's real pixel dimensions
  dims.js          shared clamped-display-size math (used by both CardCanvas and Templates thumbnails — this used to be duplicated and buggy, now it's one function both consume)
```

## The `data` object (card state shape)

This is the shape `editor.js` keeps in React state, passed into `CardCanvas`, and is what save/load JSON round-trips:

```js
{
  layout: 'dark' | 'light' | 'quote' | 'stat',
  align: 'left' | 'center',
  color: '#hex',          // accent color used across whichever layout
  font: "'Anton',sans-serif" | ... ,  // headline font for the CARD content (independent of the app's own UI font)
  headSize: number, bodySize: number,
  mediaType: 'image' | 'video',
  bg: 'url or data-uri',   // background image
  videoUrl: 'url or blob',  // only used when mediaType === 'video'
  panX: 0-100, panY: 0-100, zoom: 100-250,  // background image framing
  watermark, kicker, headline, bannerLines, caption, cornerTag,  // dark/light layout fields
  quoteText, quoteAuthor,   // quote layout fields
  statNumber, statLabel, statDesc,  // stat layout fields
  sizeId: 'ig-square' | ... // key into lib/platformSizes.js
}
```

Note: all four layouts' fields coexist in one flat object at all times — switching layout doesn't clear the others, so users don't lose typed content by clicking around.

## Design system — read this before touching any CSS

The first two design passes used a near-black background with a red/vermilion accent and the Anton font everywhere. **That is a known generic "AI-generated UI" default** — flagged explicitly by the frontend-design skill this project uses, and the user correctly called it out as looking like "AI slop." It was replaced. **Do not reintroduce a near-black + vermilion/red-accent + Anton-everywhere combination for the app's own chrome.**

Current direction — a print/proof-house concept, because the product's actual job (producing correctly-sized crops/proofs for many outputs) is genuinely print/photo-production territory:

- **Palette:** ink `#1B2430` (slate, not black), paper `#EDE7DA`, brass `#B98B3E` (primary accent), pine `#3E6259` (secondary), rule `#8B93A1`-family grays for hairlines, proof-red `#9C3B3B` reserved only for rare "live" indicators — not used as the primary accent
- **Type:** Fraunces (italic serif, display/titles) + IBM Plex Sans (UI body) + IBM Plex Mono (every dimension and timestamp — "1080×1080", version-history dates — reads like real spec data)
- **Signature element:** crop-mark brackets around the canvas preview with a rotated proof-stamp label, like a printer's proof sheet
- **Important distinction:** the app's own chrome fonts/colors (`--font-display`, `--font-body`, `--ink`, `--brass`, etc.) are separate CSS variables from the fonts a person picks *for their card content* (Anton, Oswald, Playfair, Poppins — set via the Font dropdown in the Editor, stored as `data.font`). Don't conflate these two systems.

## Autosave model

Two separate mechanisms, don't merge them:
1. **Continuous draft** (`localStorage['snapstudio:draft']`) — saved ~800ms after any edit, every time, no exceptions. This is what guarantees closing the tab or refreshing never loses work. Restored automatically on Editor mount if no template preset was loaded.
2. **Version history** (`localStorage['snapstudio:history']`) — a capped array (50 max) of named, timestamped snapshots, but only one gets appended per 10-minute window (`SNAPSHOT_INTERVAL_MS` in `useAutosave.js`), not on every keystroke — this was a deliberate fix after the first version spammed a new entry per edit and made the history list useless. `deleteVersion(ts)` removes one entry; there's also `saveVersionNow()` for a manual/forced snapshot.

## Declined features — do not build these, and why

These were explicitly requested during development and explicitly refused. If asked again, the reasoning still applies:

1. **Auto-fetch a photo of any named person from the internet.** Copyright (most photos aren't licensed for reuse) and privacy/right-of-publicity risk (no way to distinguish public figure from private individual from a name alone). Unsplash stock search is the sanctioned alternative for "fast HQ photo, no upload."
2. **Scrape competitors' content and social media users' data, presented as original ("live updates," "like we are the one doing all it").** Republishing competitors' work as your own is copyright infringement/plagiarism. Scraping other people's social accounts violates essentially every platform's Terms of Service and is a real privacy problem. **The sanctioned alternative is now built**: `pages/news.js` — an RSS-based News Digest that shows real headlines with visible attribution and a link back to the source, feeding into a pre-filled Editor post rather than a rewritten disguise.
3. **Generic "download video/image from any platform" ingestion.** Breaks most platforms' ToS and is copyright-risky at the mechanism level, regardless of the user's actual intent. What *is* built: upload your own video file or paste a direct (CORS-open) video URL and grab a still frame from it — legitimate because it's the user's own media.
4. **Auto-scrape a specific news site's rendered pages (not RSS) and rewrite the content in different words to publish as if it's the user's own fast original reporting, with explicit disinterest in attribution.** This came up directly, targeting `nepalipaisa.com/news` plus "10-20 sources," framed as a daily-automated pipeline. Refused for the same core reason as #2, reinforced: paraphrasing copyrighted journalism to obscure its source is still plagiarism regardless of wording, "hot news" and ToS violations apply, and "I don't care where it comes from" is precisely the disqualifying element, not an incidental detail. Verified in the process that `nepalipaisa.com` is a registered commercial media company (Nepali Paisa Media Pvt. Ltd.) with an explicit copyright notice and no RSS feed — its `/news` page is dynamically loaded, not even scrapeable as static HTML without additional tooling. Built the RSS-based News Digest (see #2) as the legitimate version of what was actually wanted: fast access to many sources' headlines, organized daily, feeding into posts.

## Real bug found and fixed via actual exported output (not assumption)

The user exported real cards at multiple platform sizes and sent back the actual PNGs, which is how this was caught — a visual defect that a clean build can never reveal:

- **Background photo letterboxing on tall ratios.** `bgStyle` set `backgroundSize: '${zoom}%'` — a single CSS `background-size` value only sets width; height defaults to `auto`. On Square (1:1) this was invisible. On Story/TikTok (1080×1920), a normally-proportioned photo's auto-height fell well short of the frame, leaving a visible solid-color gap (mostly hidden at the bottom by the dark fade gradient already being opaque there, but plainly visible at the top where the fade is still near-transparent). **Fixed** by switching the base fit to `background-size: cover` (always fills the box regardless of aspect ratio) and moving "zoom" to a separate `transform: scale()` applied on top — so 100% zoom now means "fully covered, no gap" instead of "actual pixel size." Lesson for future work: a clean `npm run build` and even a correct-looking Square preview do not guarantee correctness at other aspect ratios — when in doubt, check the actual exported file at the extreme ratios (very tall, very wide), not just the default square.

## Emoji support

Added `components/EmojiPicker.js` — a small curated grid (no external dependency, no API call), wired into Kicker, Headline, Caption, Quote text, Stat description, and every text layer. Appends to the end of the field's current value on click. Plain text inputs already supported emoji via normal typing/OS emoji keyboards regardless — this adds a discoverable in-app picker for people who don't know their OS shortcut (Win+. / Cmd+Ctrl+Space).

## Grammar check — removed

Per explicit request. `pages/api/grammar.js` deleted, the "Polish" section and all related state (`grammarIssues`, `grammarChecking`, `checkGrammar()`) removed from `editor.js`, README updated. If this is ever wanted back, it's a clean re-add: proxy pattern to LanguageTool (or any grammar API) exactly like `pages/api/stock.js` proxies Unsplash — same shape, different upstream.

## Earlier bugs found and fixed (chronological)

- Template thumbnail sizing used different math than the actual card renderer → thumbnails overflowed/clipped. Fixed by extracting `lib/dims.js` as the single shared source both `CardCanvas.js` and `templates.js` call.
- `CardCanvas`'s display size had no max-height clamp → extreme ratios (Pinterest 2:3, X headers 3:1) rendered broken/squashed previews. Fixed in the same `dims.js` extraction.
- Dark layout's `cornerTag` was absolutely positioned independent of the caption text above it → long captions visually overlapped it. Fixed by moving `cornerTag` into normal document flow after the caption.
- Almost every "Worldwide" template reused one identical stock photo → looked like copy-paste spam. Fixed by adding a solid-color-panel fallback to the Light layout (when `bg` is empty) and diversifying which templates use a photo at all.
- "Holi Celebration" template put the word "HOLI" into the Stat layout's 96px number slot (built for short numbers) → overflowed. Moved to Dark Alert layout with a normal headline.
- `pages/api/stock.js` hardcoded `orientation=squarish` regardless of selected platform size → Story/portrait searches still returned square crops. Now takes `orientation` as a query param, computed from the aspect ratio in `editor.js`.
- Unsplash attribution was only in an `alt`/`title` hover tooltip, which doesn't satisfy Unsplash's terms (visible credit required). Fixed to a visible link under each thumbnail plus a general credit line.
- Naive batch "export all platforms" would have used `html2canvas`'s uniform `scale` option to blow up whatever's currently on screen — which only magnifies, it can't reshape a square into a 16:9 without distorting it. Fixed by actually switching `sizeId` sequentially, waiting a real animation frame for re-render, then capturing each — slower but produces genuinely correct dimensions per platform.
- Next.js was pinned to 14.2.5, which has a disclosed RCE (referenced as CVE-2025-66478 in conversation, patched Dec 2025) — bumped to 14.2.35 before this ever went near Vercel.
- Found via user screenshots, not assumption: a full design-token rename pass had stale `var(--gold)`, `var(--accent)`, `var(--panel)` etc. references left in `templates.js`, `editor.js`, `index.js` after the palette rename — these don't throw build errors (undefined CSS custom properties just fail silently) so `npm run build` succeeding is **not sufficient proof the UI looks right**. Always grep for stale token names after any design-system rename.

## Phase 1 — complete

Everything below shipped and is verified against a clean `npm run build`:
- Every range slider replaced with `components/Stepper.js` (+/- numeric input) — headline size, body size, pan X/Y, zoom
- Every media file input replaced with `components/DropZone.js` (drag-and-drop, used in Editor for photo/video and in Brand Kit for logo)
- `useAutosave.js` finished: continuous draft (never lose progress) separate from named version history (one snapshot per 10 minutes, not per keystroke), plus `deleteVersion(ts)` and `saveVersionNow()`, both wired into the Editor's version history panel with a working delete button per entry
- `projectName` added to the data shape, editable inline (click the page title), and now drives the filename for PNG/JPEG/zip/JSON exports (via `slugify()`) instead of a hardcoded name
- Templates page has a working search box filtering by template name or group label, with a match count
- Editor sidebar reorganized into six numbered, titled sections (Canvas / Typography & Color / Media / Content / Polish / Export & Project) instead of one long undifferentiated scroll
- Keyboard accessibility pass: every button/input has proper labels or `aria-label`s, toggle button groups use `role="group"` + `aria-pressed`, a visible focus ring (`:focus-visible`) was added app-wide, error messages use `role="alert"`
- Bonus fix while touching Brand Kit: the logo you import **now actually appears on the exported card** (a "Show logo on card" toggle appears in the Canvas section once a logo exists in Brand Kit) — this was flagged as the single worst gap in the original 100-issue review and had never been fixed until now

## Phase 2a — complete

Multi-layer text system, additive on top of any of the 4 base layouts, verified against a clean build:
- `data.layers`: array of `{ id, text, x, y, fontSize, color, rotation, opacity, bold, visible, locked }`, positions stored as **percent of card width/height** so a layer placed on a square card lands in the same relative spot if you switch to a Story or Pinterest ratio
- **Backwards compatible on purpose**: `layers` defaults to `[]` in `DEFAULT_DATA`, `CardCanvas` destructures it with a `= []` fallback, and `loadProject()` force-fills it on any older saved JSON that predates this feature — old projects load exactly as before, nothing breaks
- Add/duplicate/delete/hide/lock per layer, each with its own icon-button row in the Layers panel (section 03 in the Editor)
- Click a layer to select it (shown with a dashed outline on canvas), edit its text/font size/rotation/color/bold inline
- **Drag directly on the canvas** to reposition a layer, with center-snapping (within 3% of dead-center on either axis snaps to exactly 50%) — same interaction pattern as the existing background-image drag, extracted to work per-layer
- **Keyboard**: arrow keys nudge the selected layer 1% (5% with Shift), Delete/Backspace removes it — explicitly skipped while focus is in any input/textarea so it never hijacks normal typing
- Clicking empty canvas space deselects the current layer

**Known scope boundary, stated honestly:** this is unlimited *text* layers, not yet image/shape/logo layers, resizing via drag handles, grouping, or blend modes — those are still Phase 2b+ per the roadmap below. Rotation, opacity, and lock/hide all work now; resize is font-size-driven rather than a drag handle (a real resize handle is a reasonable next increment if this interaction model proves out).

## Phase 2b — complete

Image layers, extending the same `data.layers` array from Phase 2a — same backward-compatibility guarantee (a layer with no `type` field is treated as `'text'`, so every project saved during Phase 2a still loads identically):

- `+ Image layer` button in the Layers panel — upload any photo/graphic, it drops onto the canvas at 25%×25% by default
- **Independent width and height per image** — resize each one separately via steppers (not locked to one aspect ratio), so you can genuinely have "small images, multiple images, different shapes and sizes" on one card
- **Three shape options**: Square, Rounded, Circle — applied as a clip on the image itself, not a separate mask layer (simpler, and sufficient for the actual use case: profile photos, logos, product shots, badges)
- Border width + color, rotation, opacity — same controls as text layers, shared interaction model (drag to move, arrow keys to nudge, click to select, hide/lock/duplicate/delete)
- Layer list shows a small thumbnail preview for image layers instead of a text snippet, so a project with many layers stays scannable

**Scope boundary, stated honestly:** width/height are set via steppers, not a drag-corner resize handle yet — that's the natural next increment (Phase 2c) once this proves out. No layer reordering (z-index) UI yet either — new layers stack in creation order; a "bring to front / send to back" control is a small, obvious follow-up.

## Phase 2c — complete

Shipped in two parts:

**Fade/color controls** (the real gap the user caught: the dark gradient overlay on photos was hardcoded to black with no control at all):
- **`data.pageColor`**: the base canvas color behind everything — visible wherever there's no photo (Dark Alert's black, Light Card's cream). Now a color picker in Typography & Color. Falls back to the original hardcoded defaults if unset, so every prior project renders identically.
- **`data.fadeColor` + `data.fadeStrength`**: the gradient overlay on background photos is now driven by these two fields instead of a fixed `rgba(0,0,0,...)` — "Dark fade" / "Light fade" quick buttons plus a full custom color picker, and a strength stepper (0-100%). Implemented via a `hexToRgb()` helper in `CardCanvas.js` that builds the gradient's rgba stops from whatever color is chosen. Defaults to black at 78% if unset — pixel-identical to the pre-this-feature look for old projects.
- Light Card's top photo also got a matching (lighter-touch) fade into the page color at its bottom edge, previously nonexistent.
- **Text layers now have a `width` field** (Stepper, 10-100%), replacing a hardcoded `maxWidth: 85%` — the actual "resize the content box" control, independent of font size.

**Resize + ordering** (the two items explicitly left open after that):
- **Drag-corner resize handle**: every selected layer (text or image) now shows a small brass dot at its bottom-right corner. Drag it to resize — images resize width and height independently (matches their existing independent steppers), text layers resize box width only (height still follows content naturally). Implemented as a genuine child element positioned relative to the layer's own transformed box, so it correctly follows rotation without extra math.
- **Layer ordering**: ▲/▼ buttons per layer row move it forward/backward in the stacking order (array order = z-order, later in the array renders on top — this was already true, just needed controls). `moveLayer(id, 'up' | 'down' | 'front' | 'back')` exists in `editor.js`; only up/down are exposed in the UI for now, but `'front'`/`'back'` are implemented if a dedicated button is ever wanted.

**Known limitation, stated plainly:** resize dragging doesn't compensate for rotation — if a layer is rotated and you drag its corner, the resize direction follows the screen's x/y axes, not the layer's own rotated axes. Fine for the common case (rotate a finished layer occasionally), would feel wrong if someone rotates first and resizes constantly. Flagging it rather than pretending it isn't there.

## Phase 3 (partial) — complete: typography controls on text layers

Added to the same per-layer model from Phase 2, backward compatible (all new fields have defaults matching the prior hardcoded look, so every layer saved before this exists renders identically):

- **Letter spacing** (`data.layers[].letterSpacing`, -5 to 20px, default 0 — matches the old unspaced look)
- **Line height** (`lineHeight`, 0.8-2.5×, default 1.2 — matches the prior browser-default rendering closely enough that nothing shifts noticeably on old layers)
- **Shadow strength** (`shadowStrength`, 0-100%, default 50 — the old hardcoded `rgba(0,0,0,.5)` text-shadow is exactly 50%, so this is genuinely pixel-identical for existing layers, not just "close")
- **Text outline/stroke** (`strokeWidth` + `strokeColor`, via `-webkit-text-stroke` — default 0, invisible until turned on)

**Also fixed while building this:** `Stepper.js` had a latent float-precision bug — repeatedly clicking +/- on a decimal step (like the new 0.1 line-height control) would drift to values like `1.0999999999999999` because JS floating point subtraction isn't exact. Added a rounding pass keyed to the step's own decimal precision. This was always a risk for any stepper with a non-integer step, just hadn't been exercised until line-height needed one.

**Still open from Phase 3:** curved text and vertical text — flagged from the start as genuinely hard (SVG `textPath` territory, a different rendering approach entirely from the current absolutely-positioned-div layer model) and deliberately not attempted alongside the straightforward controls above. Preset text styles and automatic text-fitting/overflow warnings are also still open — smaller lifts, reasonable next additions within Phase 3 rather than a new phase.

## Phase 3 — fully complete (preset styles + overflow warning)

- **Preset text styles**: `TEXT_PRESETS` in `editor.js` — 6 curated combos (Bold Headline, Subtitle, Fine Caption, Badge/Label, Outlined Pop, Soft Quote), one click applies font size/spacing/weight/shadow/stroke to the selected layer without touching its text, position, or rotation.
- **Overflow warning**: `layerOutOfBounds()` in `editor.js` shows a ⚠️ next to any layer in the list whose position+size would place it outside the card's 0-100% bounds. **Stated honestly, not oversold**: this is a real but partial check — precise on the horizontal axis for both layer types (width is always a known field), and precise on both axes for images (height is known too), but text layers have dynamic height from wrapping that isn't measured, so vertical overflow isn't checked for text. A true fix would need DOM measurement via refs per layer; this is the pragmatic version that's still genuinely useful.
- **Still not attempted**: curved text, vertical text — this remains a real, separate rendering problem (SVG `textPath`, a different approach from the current div-based layer model), not scoped into this round either.

## Phase 4 — complete (AI Assist, provider-agnostic)

- `pages/api/ai.js` — proxies any OpenAI-compatible chat-completions endpoint (works with OpenAI directly, or other providers implementing the same shape). Same privacy pattern as `pages/api/stock.js`: key lives server-side only.
- Four tasks: **Suggest headlines** (5 options), **Rewrite headline**, **Write caption**, **Suggest hashtags** — a new "AI Assist" section in the Editor (section 05) with a topic input and one button per task. Results render as clickable suggestion chips; clicking applies to the relevant field. Nothing is auto-applied without a click.
- **Requires `AI_API_KEY`** (+ optional `AI_API_URL` / `AI_MODEL`, defaulting to OpenAI's endpoint and `gpt-4o-mini`) — without it, the buttons return a clear "not configured" toast, same graceful-degrade pattern as Unsplash search without a key.
- **Not done**: background removal, image expansion, AI-generated artwork, readability/accessibility checks, layout/color/typography recommendations. These need different APIs with different cost models (image-editing vs. image-generation vs. text) — deliberately not bundled into one generic proxy, since conflating them would make the env var setup confusing about what each key actually unlocks.

## Phase 5 — complete (more templates)

53 templates now (was 35), still zero duplicates, still split Nepal / Worldwide. Added: Nepal — School Admission, Constitution Day, Earthquake Safety Alert, Monsoon/Flood Alert, Nepal Tourism Promo, Local Business Spotlight, Nepal Budget Update, Teacher's Day, Nepal Job Vacancy. Worldwide — Weekly Roundup, Poll/Ask the Audience, Milestone Celebration, Behind the Scenes, Customer Testimonial, Deadline Reminder, FAQ/Did You Know, Press Release, Award/Recognition, Volunteer Call-Out.

## Phase 6 — complete (multiple brand kits)

- `lib/brandKits.js` — new data layer: array of `{ id, name, logo }` kits under `localStorage['snapstudio:brandkits']`, plus an `activeKit` pointer. **Migrates automatically** from the old single-kit format (`snapstudio:brand`) the first time it runs, so nobody who set up a logo before this change loses it.
- `pages/brand.js` rewritten: add/rename/delete kits, each with its own logo, one marked "active." The active kit is what shows in the sidebar (`Layout.js`) and, if enabled, on exported cards (`editor.js`'s "Show logo on card" toggle) — both updated to read from `getActiveKit()` instead of the old single key.

## Phase 7 — complete (media library, IndexedDB)

- `lib/mediaLibrary.js` — real IndexedDB wrapper (`addMedia`, `listMedia`, `deleteMedia`). Chosen over `localStorage` deliberately: localStorage has a practical ~5-10MB ceiling across the *entire origin*, which a handful of real photos blows through; IndexedDB has dramatically more headroom and is still 100% client-side, no backend needed.
- `pages/media.js` — a dedicated library page: upload, browse as a grid, delete, or copy a data URL to paste elsewhere.
- **Wired into the Editor**: every background photo upload now also silently saves to the library (best-effort — never blocks or breaks the actual upload if the library save fails), and a "Recent uploads" strip (last 8) appears right under the upload dropzone for one-click reuse across projects.
- Graceful degrade: `isIndexedDBAvailable()` check — on the rare browser without IndexedDB support, `/media` shows an explanation instead of a broken page, and the rest of the app (direct upload in the Editor) is unaffected.

## Phase 8 (partial) — complete: charts as a new layer type

Charts, extending the same `data.layers` array from Phase 2 (backward compatible — a layer with no `type` or a `type` other than `'chart'`/`'image'` is unaffected):

- **New `type: 'chart'` layer** with `chartType: 'bar' | 'pie' | 'line'`, `dataText` (simple `"label, value"` per line — no separate data-editor UI needed, just a textarea), and `color`
- **Hand-rolled SVG rendering** in `CardCanvas.js` (`renderChartSVG()`) — deliberately not a charting library dependency. Bar and line charts use the layer's chosen color; pie charts use a fixed 6-color palette (`CHART_PALETTE`) since a single color can't distinguish slices
- Charts get their own white card background (`rgba(255,255,255,.92)`) so they stay legible against any card layout/photo — a bar chart in the layer's chosen color directly on a photo would often be unreadable otherwise
- Resize and layer-list integration reuse the exact same code path as image layers (both have independent width/height, both get the drag-corner resize handle, both get full horizontal+vertical overflow-bounds checking) — `isImage` in the resize handler was broadened to include chart layers rather than writing parallel logic
- Layer list shows a 📊 icon and the chart type instead of a text/image preview

**Not done, stated plainly — this is genuinely half of Phase 8:** Nepal province maps and world maps. These need real GeoJSON geographic data, which is a different kind of asset entirely (not user-entered data like chart values — actual shape/boundary data that has to be sourced, and adds real payload weight to the app). Charts were the tractable half of this phase; maps remain a distinct, separately-scoped piece of work.

## Phase 9+ roadmap

**Phase 9 (Publishing) — split:** PDF/animated export are buildable now, similar shape to the existing PNG/JPEG export. Scheduled publishing and platform connections still need you to register developer apps with Meta/TikTok/X and get them approved — that's a real-world process outside what code can shortcut.

**Phase 10 (Collaboration):** needs a real backend (database + auth). Biggest architecture change on the list — should be its own initiative, not squeezed into this client-only app.

**Phase 11 (Productivity):** command palette, quick search, recent projects, folders/tags are all buildable now with the existing localStorage model. True offline/PWA support is a scoped addition (service worker + manifest).

**Phase 12 (Accessibility tooling):** contrast checker and colorblind preview are buildable now as Editor tools. Automatic alt-text generation can reuse the Phase 4 AI provider once one's configured.

**Phase 13 (Performance):** ongoing discipline (code-splitting, lazy loading), not a single deliverable — apply as the app keeps growing rather than as a one-time pass.

**Phase 14 (Plugin marketplace):** its own product, out of scope here.

**Recommendation:** Phases 1 through 7 are fully complete, Phase 8's tractable half (charts) is done too — maps are real, separate scope needing GeoJSON data sourcing. Everything remaining either needs a decision from you (backend for collaboration, developer-app approvals for scheduled publishing) or is smaller-scope polish (Phase 9's PDF/animated export, Phase 11 productivity tools, Phase 12's remaining accessibility items) that can proceed anytime without new infrastructure.

## API keys / external services

- **Unsplash**: free tier, `UNSPLASH_ACCESS_KEY` env var, get one at unsplash.com/developers. Without it, `/api/stock` returns a clear error but everything else still works.
- **AI provider** (Phase 4): `AI_API_KEY` + optional `AI_API_URL` / `AI_MODEL`, defaults target OpenAI's `gpt-4o-mini` but any OpenAI-compatible provider works by changing `AI_API_URL`/`AI_MODEL`. Without a key, `/api/ai` returns a clear "not configured" error but everything else still works.

## Deployment

Standard Next.js on Vercel. Full step-by-step is in `README.md`. Key point: `UNSPLASH_ACCESS_KEY` must be added as a Vercel environment variable (not just `.env.local`) or stock search will fail in production.

## A meta-note on verification

Several rounds of this project shipped changes that *compiled successfully* but didn't actually look/work right, because a clean `npm run build` only proves the code is syntactically valid — it does not prove CSS variables resolve, thumbnails render at the right size, or text doesn't overlap. The pattern that actually caught real bugs was: build → grep for specific expected strings/classes in the rendered HTML output → when possible, look at real screenshots. Prefer that over declaring something fixed on build-success alone.
