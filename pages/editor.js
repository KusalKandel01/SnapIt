import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import CardCanvas from '../components/CardCanvas';
import Stepper from '../components/Stepper';
import DropZone from '../components/DropZone';
import useToast from '../components/useToast';
import { useAutosave, readDraft } from '../components/useAutosave';
import { PLATFORM_GROUPS, findSize } from '../lib/platformSizes';

const DEFAULT_DATA = {
  projectName: 'Untitled project',
  layout: 'dark',
  align: 'center',
  color: '#cf1b2b',
  font: "'Anton',sans-serif",
  headSize: 34,
  bodySize: 12,
  mediaType: 'image',
  bg: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=60',
  videoUrl: '',
  panX: 50, panY: 50, zoom: 100,
  watermark: 'yoursource',
  kicker: 'BREAKING',
  headline: 'HEADLINE GOES HERE',
  bannerLines: 'Short supporting line one\nShort supporting line two',
  caption: 'Add a short descriptive caption here explaining the context.',
  cornerTag: '',
  quoteText: 'This is the quote text that carries the message.',
  quoteAuthor: 'Person Name, Title',
  statNumber: '72%',
  statLabel: 'LABEL HERE',
  statDesc: 'One or two lines of context for the statistic shown above.',
  sizeId: 'ig-square'
};

const FONTS = [
  { label: 'Anton (default)', value: "'Anton',sans-serif" },
  { label: 'Oswald', value: "'Oswald',sans-serif" },
  { label: 'Playfair Display', value: "'Playfair Display',serif" },
  { label: 'Poppins', value: "'Poppins',sans-serif" }
];

function SectionHeader({ n, title }) {
  return (
    <div className="section-header">
      <span className="num">{n}</span>
      <span className="title">{title}</span>
      <span className="rule" />
    </div>
  );
}

export default function Editor() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loadedPreset, setLoadedPreset] = useState(false);
  const [brandLogo, setBrandLogo] = useState('');
  const [showLogo, setShowLogo] = useState(false);
  const [stockQuery, setStockQuery] = useState('');
  const [stockResults, setStockResults] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaUrlError, setMediaUrlError] = useState('');
  const [grammarIssues, setGrammarIssues] = useState(null);
  const [grammarChecking, setGrammarChecking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const dragState = useRef(null);
  const cardRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const nameInputRef = useRef(null);
  const { toast, ToastEl } = useToast();
  const { history, deleteVersion, saveVersionNow, formatTs } = useAutosave(data, !loadedPreset);

  // Load a template preset if one was set, otherwise restore the continuous
  // draft — this is the "never lose progress" guarantee, separate from the
  // once-per-10-minutes named version history below.
  useEffect(() => {
    try {
      const preset = sessionStorage.getItem('snapstudio:preset');
      if (preset) {
        setData(d => ({ ...d, ...JSON.parse(preset) }));
        sessionStorage.removeItem('snapstudio:preset');
      } else {
        const draft = readDraft();
        if (draft) setData(d => ({ ...d, ...draft }));
      }
    } catch (e) {}
    setLoadedPreset(true);
    try {
      const brand = JSON.parse(localStorage.getItem('snapstudio:brand') || '{}');
      if (brand.logo) setBrandLogo(brand.logo);
    } catch (e) {}
  }, []);

  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));
  const size = findSize(data.sizeId);

  function restoreVersion(ts) {
    const found = history.find(h => h.ts === ts);
    if (found) { setData(d => ({ ...d, ...found.data })); toast(`Restored "${found.data.projectName || 'version'}" from ${formatTs(ts)}`); setShowHistory(false); }
  }

  async function searchStock(e) {
    e.preventDefault();
    if (!stockQuery.trim()) return;
    setStockLoading(true);
    try {
      const isTall = size.h > size.w;
      const res = await fetch(`/api/stock?q=${encodeURIComponent(stockQuery)}&orientation=${isTall ? 'portrait' : 'landscape'}`);
      const json = await res.json();
      if (json.error) { toast(json.error); setStockResults([]); }
      else setStockResults(json.results || []);
    } catch (err) { toast('Search failed — check your connection'); }
    setStockLoading(false);
  }

  function resetFraming() { setData(d => ({ ...d, panX: 50, panY: 50, zoom: 100 })); }

  function startDrag(e) {
    if (!(data.mediaType === 'image') || !(data.layout === 'dark' || data.layout === 'light')) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    dragState.current = { startX: e.clientX, startY: e.clientY, startPanX: data.panX, startPanY: data.panY, rectW: rect.width, rectH: rect.height };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
  }
  function onDragMove(e) {
    if (!dragState.current) return;
    const { startX, startY, startPanX, startPanY, rectW, rectH } = dragState.current;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    const nextX = Math.min(100, Math.max(0, startPanX - (dx / rectW) * 100));
    const nextY = Math.min(100, Math.max(0, startPanY - (dy / rectH) * 100));
    setData(d => ({ ...d, panX: Math.round(nextX), panY: Math.round(nextY) }));
  }
  function onDragEnd() {
    dragState.current = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
  }

  function waitForFrame() { return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }

  async function exportAllPlatforms() {
    setBatchExporting(true);
    const html2canvas = (await import('html2canvas')).default;
    const JSZip = (await import('jszip')).default;
    const targets = [
      { label: 'instagram-square', sizeId: 'ig-square' },
      { label: 'instagram-story', sizeId: 'ig-story' },
      { label: 'facebook-post', sizeId: 'fb-link' },
      { label: 'x-post', sizeId: 'x-post' },
      { label: 'tiktok-fullscreen', sizeId: 'tt-full' }
    ];
    const originalSizeId = data.sizeId;
    const zip = new JSZip();
    try {
      for (const t of targets) {
        setData(d => ({ ...d, sizeId: t.sizeId }));
        await waitForFrame();
        const target = findSize(t.sizeId);
        const node = cardRef.current;
        const scale = target.w / node.getBoundingClientRect().width;
        const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: data.layout === 'light' ? '#f4f2ee' : '#0b0c0e' });
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
        zip.file(`${t.label}-${target.w}x${target.h}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `${slugify(data.projectName)}-all-platforms.zip`;
      link.href = URL.createObjectURL(zipBlob);
      link.click();
      toast('All platform sizes exported');
    } catch (err) {
      toast('Batch export failed — cross-origin images can block this, try uploading the file instead');
    }
    setData(d => ({ ...d, sizeId: originalSizeId }));
    setBatchExporting(false);
  }

  function slugify(name) {
    return (name || 'snap-project').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'snap-project';
  }

  function onUploadPhoto(file) {
    const reader = new FileReader();
    reader.onload = ev => { set('mediaType', 'image'); set('bg', ev.target.result); resetFraming(); };
    reader.readAsDataURL(file);
  }

  function useMediaUrlAsImage() {
    if (!mediaUrlInput.trim()) return;
    setMediaUrlError('');
    set('mediaType', 'image');
    set('bg', mediaUrlInput.trim());
    resetFraming();
    toast('Image URL applied — if it looks blank, the source may block outside embedding');
  }

  function useMediaUrlAsVideo() {
    if (!mediaUrlInput.trim()) return;
    setMediaUrlError('');
    set('mediaType', 'video');
    set('videoUrl', mediaUrlInput.trim());
    toast('Video loaded for in-app preview — captures a still frame on export');
  }

  function onUploadVideo(file) {
    const url = URL.createObjectURL(file);
    set('mediaType', 'video');
    set('videoUrl', url);
    toast('Video loaded — play it below, then "Use current frame" to set the export image');
  }

  function captureVideoFrame() {
    const video = videoPreviewRef.current;
    if (!video) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      set('mediaType', 'image');
      set('bg', canvas.toDataURL('image/png'));
      resetFraming();
      toast('Frame captured — now the card background');
    } catch (err) {
      setMediaUrlError('This video source blocks frame capture (cross-origin protection most platforms enforce). Try uploading the video file instead.');
    }
  }

  async function checkGrammar() {
    const combined = [data.headline, data.bannerLines, data.caption, data.quoteText, data.statDesc].filter(Boolean).join('\n');
    if (!combined.trim()) { toast('Nothing to check yet'); return; }
    setGrammarChecking(true);
    try {
      const res = await fetch('/api/grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: combined }) });
      const json = await res.json();
      if (json.error) toast(json.error);
      else { setGrammarIssues(json.issues); toast(json.issues.length ? `${json.issues.length} suggestion(s) found` : 'No issues found — looks good'); }
    } catch (err) { toast('Grammar check failed — check your connection'); }
    setGrammarChecking(false);
  }

  async function exportImage(format) {
    const html2canvas = (await import('html2canvas')).default;
    const node = cardRef.current;
    const scale = size.w / node.getBoundingClientRect().width;
    const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: data.layout === 'light' ? '#f4f2ee' : '#0b0c0e' });
    const link = document.createElement('a');
    link.download = `${slugify(data.projectName)}.${format}`;
    link.href = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png', 0.95);
    link.click();
    toast('Image downloaded');
  }

  async function copyImage() {
    if (!navigator.clipboard || !window.ClipboardItem) { toast("Your browser can't copy images — use Download instead"); return; }
    const html2canvas = (await import('html2canvas')).default;
    const node = cardRef.current;
    const scale = size.w / node.getBoundingClientRect().width;
    const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: data.layout === 'light' ? '#f4f2ee' : '#0b0c0e' });
    canvas.toBlob(async blob => {
      try { await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); toast('Copied — paste it anywhere'); }
      catch (e) { toast('Copy blocked by browser — try Download instead'); }
    });
  }

  function saveProject() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${slugify(data.projectName)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    toast('Project saved as a file');
  }

  function loadProject(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const loaded = JSON.parse(ev.target.result);
        // Backwards compatible: older saved projects won't have projectName —
        // give them one instead of leaving the field blank/undefined.
        if (typeof loaded !== 'object' || !loaded.layout) { toast("That file doesn't look like a Snap Studio project"); return; }
        if (!loaded.projectName) loaded.projectName = 'Imported project';
        setData(d => ({ ...d, ...loaded }));
        toast('Project loaded');
      } catch (err) { toast('Could not read that file'); }
    };
    reader.readAsText(file);
  }

  const showQuoteFields = data.layout === 'quote';
  const showStatFields = data.layout === 'stat';
  const showNewsFields = data.layout === 'dark' || data.layout === 'light';
  const showBgFields = data.layout === 'dark' || data.layout === 'light';

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={data.projectName}
              onChange={e => set('projectName', e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }}
              aria-label="Project name"
              style={{
                fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 600, fontSize: 28,
                background: 'transparent', border: 'none', borderBottom: '1px solid var(--brass)', color: 'var(--white)',
                outline: 'none', padding: 0, marginBottom: 6, width: '100%', maxWidth: 420
              }}
            />
          ) : (
            <h1 className="page-title" onClick={() => setEditingName(true)} style={{ cursor: 'text' }} title="Click to rename">
              {data.projectName} <span style={{ fontSize: 13, color: 'var(--rule-light)', fontFamily: 'var(--font-mono)', fontStyle: 'normal' }}>✎ rename</span>
            </h1>
          )}
          <p className="page-sub">Build one card, pick a platform size, export or copy it straight to your clipboard. Every change autosaves — closing the tab never loses your work.</p>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={() => { saveVersionNow(data); toast('Version saved now'); }}>Save version now</button>
          <button className="btn secondary" onClick={() => setShowHistory(s => !s)} aria-expanded={showHistory} aria-haspopup="true">
            Version history ({history.length})
          </button>
          {showHistory && (
            <div className="history-panel" role="menu">
              {history.length === 0 && <div className="history-empty">No saved versions yet — one saves automatically every 10 minutes, or use &ldquo;Save version now.&rdquo;</div>}
              {history.map(h => (
                <div key={h.ts} className="history-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span onClick={() => restoreVersion(h.ts)} style={{ cursor: 'pointer', flex: 1 }}>
                    {h.data.projectName || 'Untitled'} — {formatTs(h.ts)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteVersion(h.ts); toast('Version deleted'); }}
                    aria-label={`Delete version from ${formatTs(h.ts)}`}
                    style={{ background: 'none', border: 'none', color: 'var(--proof-red)', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
        <div className="card-panel" style={{ maxHeight: '84vh', overflowY: 'auto' }}>

          <SectionHeader n="01" title="Canvas" />
          <div className="field">
            <label htmlFor="platform-size">Platform size</label>
            <select id="platform-size" value={data.sizeId} onChange={e => set('sizeId', e.target.value)}>
              {PLATFORM_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.sizes.map(s => <option key={s.id} value={s.id}>{s.name} ({s.w}×{s.h})</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="field">
            <label id="layout-label">Layout</label>
            <div role="group" aria-labelledby="layout-label" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className={`btn ${data.layout === 'dark' ? '' : 'secondary'}`} aria-pressed={data.layout === 'dark'} onClick={() => set('layout', 'dark')}>Dark Alert</button>
              <button className={`btn ${data.layout === 'light' ? '' : 'secondary'}`} aria-pressed={data.layout === 'light'} onClick={() => set('layout', 'light')}>Light Card</button>
              <button className={`btn ${data.layout === 'quote' ? '' : 'secondary'}`} aria-pressed={data.layout === 'quote'} onClick={() => set('layout', 'quote')}>Quote</button>
              <button className={`btn ${data.layout === 'stat' ? '' : 'secondary'}`} aria-pressed={data.layout === 'stat'} onClick={() => set('layout', 'stat')}>Stat</button>
            </div>
          </div>
          {(data.layout === 'dark' || data.layout === 'light') && (
            <div className="field">
              <label id="align-label">Text alignment</label>
              <div role="group" aria-labelledby="align-label" style={{ display: 'flex', gap: 8 }}>
                <button className={`btn ${data.align === 'center' ? '' : 'secondary'}`} aria-pressed={data.align === 'center'} onClick={() => set('align', 'center')}>Centered</button>
                <button className={`btn ${data.align === 'left' ? '' : 'secondary'}`} aria-pressed={data.align === 'left'} onClick={() => set('align', 'left')}>Left</button>
              </div>
            </div>
          )}
          {brandLogo && (
            <label className="checkline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--rule-light)', marginBottom: 14 }}>
              <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} /> Show logo on card
            </label>
          )}
          {!brandLogo && (
            <p style={{ fontSize: 11, color: 'var(--rule-light)', marginBottom: 14 }}>No logo set yet — add one in <a href="/brand" style={{ color: 'var(--brass)' }}>Brand Kit</a> to show it on your cards.</p>
          )}

          <SectionHeader n="02" title="Typography & Color" />
          <div className="field">
            <label htmlFor="font-select">Font</label>
            <select id="font-select" value={data.font} onChange={e => set('font', e.target.value)}>
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <Stepper label="Headline size" value={data.headSize} onChange={v => set('headSize', v)} min={16} max={60} step={2} unit="px" />
          <Stepper label="Body text size" value={data.bodySize} onChange={v => set('bodySize', v)} min={9} max={20} step={1} unit="px" />
          <div className="field">
            <label htmlFor="accent-color">Accent color</label>
            <input id="accent-color" type="color" value={data.color} onChange={e => set('color', e.target.value)} style={{ width: 50, height: 30, border: 'none', background: 'none' }} />
          </div>

          {showBgFields && (
            <>
              <SectionHeader n="03" title="Media" />
              <DropZone label="Background photo" accept="image/*" onFile={onUploadPhoto} hint="Drag & drop a photo, or click to choose" />
              <DropZone label="Your own video — play, scrub, then grab a frame" accept="video/*" onFile={onUploadVideo} hint="Drag & drop a video, or click to choose" />
              <div className="field">
                <label htmlFor="media-url">Or paste an image / direct video URL</label>
                <input id="media-url" type="text" value={mediaUrlInput} onChange={e => setMediaUrlInput(e.target.value)} placeholder="https://..." />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  <button className="btn secondary" onClick={useMediaUrlAsImage}>Use as image</button>
                  <button className="btn secondary" onClick={useMediaUrlAsVideo}>Load as video</button>
                </div>
                {mediaUrlError && <p role="alert" style={{ color: '#ff9c9c', fontSize: 11, marginTop: 6 }}>{mediaUrlError}</p>}
              </div>

              {data.mediaType === 'video' && data.videoUrl && (
                <div className="field">
                  <label>Video preview</label>
                  <video ref={videoPreviewRef} src={data.videoUrl} controls style={{ width: '100%', borderRadius: 8, background: '#000' }} />
                  <button className="btn secondary" style={{ marginTop: 6, width: '100%' }} onClick={captureVideoFrame}>Use current frame as card background</button>
                  <p style={{ fontSize: 10.5, color: 'var(--rule-light)', marginTop: 6 }}>PNG/JPEG exports are still images — pause on the frame you want, then capture it. The original video stays yours to post separately wherever the platform supports video.</p>
                </div>
              )}

              {data.mediaType === 'image' && (
                <div className="field">
                  <label>Position &amp; zoom (fixes cropping when you switch platform size)</label>
                  <p style={{ fontSize: 10.5, color: 'var(--rule-light)', margin: '0 0 8px 0' }}>Tip: you can also click and drag the photo directly in the preview.</p>
                  <Stepper label="Horizontal" value={data.panX} onChange={v => set('panX', v)} min={0} max={100} step={5} unit="%" />
                  <Stepper label="Vertical" value={data.panY} onChange={v => set('panY', v)} min={0} max={100} step={5} unit="%" />
                  <Stepper label="Zoom" value={data.zoom} onChange={v => set('zoom', v)} min={100} max={250} step={10} unit="%" />
                  <button className="btn secondary" style={{ marginTop: 6 }} onClick={resetFraming}>Reset position &amp; zoom</button>
                </div>
              )}

              <div className="field">
                <label htmlFor="stock-search">Search free HQ stock photos (Unsplash)</label>
                <form onSubmit={searchStock} style={{ display: 'flex', gap: 6 }}>
                  <input id="stock-search" type="text" value={stockQuery} onChange={e => setStockQuery(e.target.value)} placeholder="e.g. city skyline" />
                  <button className="btn secondary" type="submit">{stockLoading ? '...' : 'Search'}</button>
                </form>
                {stockResults.length > 0 && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                      {stockResults.map(r => (
                        <div key={r.id}>
                          <button
                            onClick={() => { set('mediaType', 'image'); set('bg', r.full); resetFraming(); toast(`Photo by ${r.credit} applied`); }}
                            aria-label={`Use photo: ${r.alt}`}
                            style={{ width: '100%', height: 54, padding: 0, border: '1px solid var(--rule)', borderRadius: 4, cursor: 'pointer', background: `url('${r.thumb}') center/cover` }}
                          />
                          <a href={`${r.creditUrl}?utm_source=snap_studio&utm_medium=referral`} target="_blank" rel="noreferrer"
                            style={{ fontSize: 9, color: 'var(--rule-light)', display: 'block', marginTop: 2, textAlign: 'center', textDecoration: 'none' }}>{r.credit}</a>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--rule-light)', marginTop: 6 }}>
                      Photos via <a href="https://unsplash.com/?utm_source=snap_studio&utm_medium=referral" target="_blank" rel="noreferrer" style={{ color: 'var(--brass)' }}>Unsplash</a> — keep photographer credit visible if you republish.
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          <SectionHeader n="04" title="Content" />
          {showNewsFields && (
            <>
              <div className="field"><label htmlFor="f-watermark">Watermark</label><input id="f-watermark" type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-kicker">Kicker</label><input id="f-kicker" type="text" value={data.kicker} onChange={e => set('kicker', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-headline">Headline</label><textarea id="f-headline" rows={2} value={data.headline} onChange={e => set('headline', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-banner">Banner sub-lines (one per line)</label><textarea id="f-banner" rows={2} value={data.bannerLines} onChange={e => set('bannerLines', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-caption">Caption</label><textarea id="f-caption" rows={3} value={data.caption} onChange={e => set('caption', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-corner">Corner tag</label><input id="f-corner" type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>
            </>
          )}
          {showQuoteFields && (
            <>
              <div className="field"><label htmlFor="f-watermark2">Watermark</label><input id="f-watermark2" type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-quote">Quote text</label><textarea id="f-quote" rows={3} value={data.quoteText} onChange={e => set('quoteText', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-author">Author / attribution</label><input id="f-author" type="text" value={data.quoteAuthor} onChange={e => set('quoteAuthor', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-corner2">Corner tag</label><input id="f-corner2" type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>
            </>
          )}
          {showStatFields && (
            <>
              <div className="field"><label htmlFor="f-watermark3">Watermark</label><input id="f-watermark3" type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-statnum">Stat number</label><input id="f-statnum" type="text" value={data.statNumber} onChange={e => set('statNumber', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-statlabel">Stat label</label><input id="f-statlabel" type="text" value={data.statLabel} onChange={e => set('statLabel', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-statdesc">Description</label><textarea id="f-statdesc" rows={2} value={data.statDesc} onChange={e => set('statDesc', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-corner3">Corner tag</label><input id="f-corner3" type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>
            </>
          )}

          <SectionHeader n="05" title="Polish" />
          <button className="btn secondary" style={{ width: '100%', marginBottom: 8 }} onClick={checkGrammar}>{grammarChecking ? 'Checking...' : 'Check grammar & spelling'}</button>
          {grammarIssues && (
            <div style={{ marginBottom: 12, fontSize: 11.5 }} role="status">
              {grammarIssues.length === 0 && <p style={{ color: 'var(--rule-light)' }}>No issues found.</p>}
              {grammarIssues.map((iss, i) => (
                <div key={i} style={{ padding: '6px 8px', background: 'var(--ink)', borderRadius: 6, marginBottom: 5 }}>
                  <strong style={{ color: '#ff9c9c' }}>&ldquo;{iss.snippet}&rdquo;</strong> — {iss.message}
                  {iss.suggestions.length > 0 && <div style={{ color: 'var(--brass)', marginTop: 2 }}>Try: {iss.suggestions.join(', ')}</div>}
                </div>
              ))}
            </div>
          )}

          <SectionHeader n="06" title="Export & Project" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={() => exportImage('png')}>Download PNG</button>
            <button className="btn secondary" onClick={() => exportImage('jpeg')}>Download JPEG</button>
          </div>
          <button className="btn secondary" style={{ width: '100%', marginTop: 8 }} onClick={copyImage}>Copy image</button>
          <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={exportAllPlatforms} disabled={batchExporting}>
            {batchExporting ? 'Rendering all sizes…' : 'Export for Instagram, X, Facebook, TikTok — all at once'}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button className="btn secondary" onClick={saveProject}>Save as file</button>
            <label className="btn secondary" style={{ textAlign: 'center', cursor: 'pointer' }}>
              Load a file
              <input type="file" accept="application/json" onChange={loadProject} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20 }}>
          <div className="proof-frame" style={{ background: 'var(--ink-2)', border: '1px solid var(--rule)' }}>
            <div className="cm-tr" />
            <div className="cm-bl" />
            <div className="proof-stamp">{size.w}×{size.h} · {size.name}</div>
            <div onMouseDown={startDrag} style={{ cursor: showBgFields && data.mediaType === 'image' ? 'grab' : 'default' }}>
              <CardCanvas ref={cardRef} data={{ ...data, ratioW: size.w, ratioH: size.h, brandLogo, showLogo }} />
            </div>
          </div>
          {showBgFields && data.mediaType === 'image' && (
            <p style={{ fontSize: 11, color: 'var(--rule-light)', marginTop: 10 }}>Click and drag the photo above to reposition it — same as the steppers, just faster.</p>
          )}
        </div>
      </div>
      {ToastEl}
    </Layout>
  );
}
