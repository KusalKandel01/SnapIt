import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import CardCanvas from '../components/CardCanvas';
import useToast from '../components/useToast';
import { PLATFORM_GROUPS, findSize } from '../lib/platformSizes';

const DEFAULT_DATA = {
  layout: 'dark',
  align: 'left',
  color: '#cf1b2b',
  font: "'Anton',sans-serif",
  headSize: 34,
  bodySize: 12,
  bg: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=60',
  panX: 50, panY: 50, zoom: 100,
  watermark: 'yoursource',
  kicker: 'BREAKING',
  headline: 'HEADLINE GOES HERE',
  bannerLines: 'Short supporting line one\nShort supporting line two',
  caption: 'Add a short descriptive caption here explaining the context.',
  cornerTag: 'IN-DEPTH STORY',
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

export default function Editor() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [stockQuery, setStockQuery] = useState('');
  const [stockResults, setStockResults] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaUrlError, setMediaUrlError] = useState('');
  const cardRef = useRef(null);
  const { toast, ToastEl } = useToast();

  useEffect(() => {
    try {
      const preset = sessionStorage.getItem('snapstudio:preset');
      if (preset) {
        setData(d => ({ ...d, ...JSON.parse(preset) }));
        sessionStorage.removeItem('snapstudio:preset');
      }
    } catch (e) {}
  }, []);

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));
  const size = findSize(data.sizeId);

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
    } catch (err) {
      toast('Search failed — check your connection');
    }
    setStockLoading(false);
  }

  function onUploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { set('bg', ev.target.result); resetFraming(); };
    reader.readAsDataURL(file);
  }

  function resetFraming() {
    setData(d => ({ ...d, panX: 50, panY: 50, zoom: 100 }));
  }

  // Direct image URL — for pasting a link from anywhere instead of uploading a file
  function useMediaUrlAsImage() {
    if (!mediaUrlInput.trim()) return;
    setMediaUrlError('');
    set('bg', mediaUrlInput.trim());
    resetFraming();
    toast('Image URL applied — if it looks blank, the source may block outside embedding');
  }

  // Video URL — attempts to grab a frame. Requires the host to allow
  // cross-origin canvas reads (CORS); most video hosting/social platforms
  // block this by design, so this works reliably only for direct, CORS-open
  // video file URLs (e.g. your own S3/Cloud storage), not arbitrary platform links.
  function useMediaUrlAsVideoFrame() {
    if (!mediaUrlInput.trim()) return;
    setMediaUrlError('');
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.src = mediaUrlInput.trim();
    video.addEventListener('loadeddata', () => { video.currentTime = Math.min(1, (video.duration || 2) / 2); });
    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        set('bg', canvas.toDataURL('image/png'));
        resetFraming();
        toast('Frame captured from video URL');
      } catch (err) {
        setMediaUrlError('This video source blocks cross-origin frame capture (most platforms do this deliberately). Try uploading the video file instead.');
      }
    });
    video.addEventListener('error', () => {
      setMediaUrlError('Could not load that video URL — check the link, or upload the file directly.');
    });
  }

  function onUploadVideo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.addEventListener('loadeddata', () => { video.currentTime = Math.min(1, video.duration / 2); });
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      set('bg', canvas.toDataURL('image/png'));
      resetFraming();
      toast('Frame captured from video');
      URL.revokeObjectURL(url);
    });
    video.addEventListener('error', () => toast('Could not read that video file — try a different format (MP4/WebM work best)'));
  }

  async function exportImage(format) {
    const html2canvas = (await import('html2canvas')).default;
    const node = cardRef.current;
    const scale = size.w / node.getBoundingClientRect().width;
    const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: data.layout === 'light' ? '#f4f2ee' : '#0b0c0e' });
    const link = document.createElement('a');
    link.download = `snap-card.${format}`;
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
    link.download = 'snap-project.json';
    link.href = URL.createObjectURL(blob);
    link.click();
    toast('Project saved');
  }

  function loadProject(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const loaded = JSON.parse(ev.target.result);
        if (typeof loaded !== 'object' || !loaded.layout) { toast("That file doesn't look like a Snap Studio project"); return; }
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
      <h1 className="page-title">Editor</h1>
      <p className="page-sub">Build one card, pick a platform size, export or copy it straight to your clipboard.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
        <div className="card-panel" style={{ maxHeight: '84vh', overflowY: 'auto' }}>
          <div className="field">
            <label>Platform size</label>
            <select value={data.sizeId} onChange={e => set('sizeId', e.target.value)}>
              {PLATFORM_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.sizes.map(s => <option key={s.id} value={s.id}>{s.name} ({s.w}×{s.h})</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Layout</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className={`btn ${data.layout === 'dark' ? '' : 'secondary'}`} onClick={() => set('layout', 'dark')}>Dark Alert</button>
              <button className={`btn ${data.layout === 'light' ? '' : 'secondary'}`} onClick={() => set('layout', 'light')}>Light Card</button>
              <button className={`btn ${data.layout === 'quote' ? '' : 'secondary'}`} onClick={() => set('layout', 'quote')}>Quote</button>
              <button className={`btn ${data.layout === 'stat' ? '' : 'secondary'}`} onClick={() => set('layout', 'stat')}>Stat</button>
            </div>
          </div>

          {(data.layout === 'dark' || data.layout === 'light') && (
            <div className="field">
              <label>Text alignment</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn ${data.align === 'left' ? '' : 'secondary'}`} onClick={() => set('align', 'left')}>Left</button>
                <button className={`btn ${data.align === 'center' ? '' : 'secondary'}`} onClick={() => set('align', 'center')}>Centered</button>
              </div>
            </div>
          )}

          <div className="field">
            <label>Font</label>
            <select value={data.font} onChange={e => set('font', e.target.value)}>
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Headline size — {data.headSize}px</label>
            <input type="range" min="16" max="60" value={data.headSize} onChange={e => set('headSize', +e.target.value)} style={{ width: '100%' }} />
          </div>
          <div className="field">
            <label>Body text size — {data.bodySize}px</label>
            <input type="range" min="9" max="20" value={data.bodySize} onChange={e => set('bodySize', +e.target.value)} style={{ width: '100%' }} />
          </div>

          <div className="field">
            <label>Accent color</label>
            <input type="color" value={data.color} onChange={e => set('color', e.target.value)} style={{ width: 50, height: 30, border: 'none', background: 'none' }} />
          </div>

          {showBgFields && (
            <>
              <div className="field">
                <label>Background photo — upload</label>
                <input type="file" accept="image/*" onChange={onUploadPhoto} />
              </div>
              <div className="field">
                <label>Or paste an image / video URL</label>
                <input type="text" value={mediaUrlInput} onChange={e => setMediaUrlInput(e.target.value)} placeholder="https://... image or direct video file link" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  <button className="btn secondary" onClick={useMediaUrlAsImage}>Use as image</button>
                  <button className="btn secondary" onClick={useMediaUrlAsVideoFrame}>Grab frame from video URL</button>
                </div>
                {mediaUrlError && <p style={{ color: '#ff9c9c', fontSize: 11, marginTop: 6 }}>{mediaUrlError}</p>}
              </div>
              <div className="field">
                <label>Or grab a frame from a video file you own</label>
                <input type="file" accept="video/*" onChange={onUploadVideo} />
              </div>

              <div className="field">
                <label>Position &amp; zoom (fixes cropping when you switch platform size)</label>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 4 }}>Horizontal — {data.panX}%</div>
                <input type="range" min="0" max="100" value={data.panX} onChange={e => set('panX', +e.target.value)} style={{ width: '100%' }} />
                <div style={{ fontSize: 10.5, color: 'var(--muted)', margin: '6px 0 4px' }}>Vertical — {data.panY}%</div>
                <input type="range" min="0" max="100" value={data.panY} onChange={e => set('panY', +e.target.value)} style={{ width: '100%' }} />
                <div style={{ fontSize: 10.5, color: 'var(--muted)', margin: '6px 0 4px' }}>Zoom — {data.zoom}%</div>
                <input type="range" min="100" max="250" value={data.zoom} onChange={e => set('zoom', +e.target.value)} style={{ width: '100%' }} />
                <button className="btn secondary" style={{ marginTop: 6 }} onClick={resetFraming}>Reset position &amp; zoom</button>
              </div>

              <div className="field">
                <label>Search free HQ stock photos (Unsplash)</label>
                <form onSubmit={searchStock} style={{ display: 'flex', gap: 6 }}>
                  <input type="text" value={stockQuery} onChange={e => setStockQuery(e.target.value)} placeholder="e.g. city skyline" />
                  <button className="btn secondary" type="submit">{stockLoading ? '...' : 'Search'}</button>
                </form>
                {stockResults.length > 0 && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                      {stockResults.map(r => (
                        <div key={r.id}>
                          <img src={r.thumb} alt={r.alt}
                            onClick={() => { set('bg', r.full); resetFraming(); toast(`Photo by ${r.credit} applied`); }}
                            style={{ width: '100%', height: 54, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--line)' }} />
                          <a href={`${r.creditUrl}?utm_source=snap_studio&utm_medium=referral`} target="_blank" rel="noreferrer"
                            style={{ fontSize: 9, color: 'var(--muted)', display: 'block', marginTop: 2, textAlign: 'center', textDecoration: 'none' }}>
                            {r.credit}
                          </a>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
                      Photos via <a href="https://unsplash.com/?utm_source=snap_studio&utm_medium=referral" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>Unsplash</a> — please keep photographer credit visible if you republish, per Unsplash's guidelines.
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          {showNewsFields && (
            <>
              <div className="field"><label>Watermark</label><input type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
              <div className="field"><label>Kicker</label><input type="text" value={data.kicker} onChange={e => set('kicker', e.target.value)} /></div>
              <div className="field"><label>Headline</label><textarea rows={2} value={data.headline} onChange={e => set('headline', e.target.value)} /></div>
              <div className="field"><label>Banner sub-lines (one per line)</label><textarea rows={2} value={data.bannerLines} onChange={e => set('bannerLines', e.target.value)} /></div>
              <div className="field"><label>Caption</label><textarea rows={3} value={data.caption} onChange={e => set('caption', e.target.value)} /></div>
              <div className="field"><label>Corner tag</label><input type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>
            </>
          )}

          {showQuoteFields && (
            <>
              <div className="field"><label>Watermark</label><input type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
              <div className="field"><label>Quote text</label><textarea rows={3} value={data.quoteText} onChange={e => set('quoteText', e.target.value)} /></div>
              <div className="field"><label>Author / attribution</label><input type="text" value={data.quoteAuthor} onChange={e => set('quoteAuthor', e.target.value)} /></div>
              <div className="field"><label>Corner tag</label><input type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>
            </>
          )}

          {showStatFields && (
            <>
              <div className="field"><label>Watermark</label><input type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
              <div className="field"><label>Stat number</label><input type="text" value={data.statNumber} onChange={e => set('statNumber', e.target.value)} /></div>
              <div className="field"><label>Stat label</label><input type="text" value={data.statLabel} onChange={e => set('statLabel', e.target.value)} /></div>
              <div className="field"><label>Description</label><textarea rows={2} value={data.statDesc} onChange={e => set('statDesc', e.target.value)} /></div>
              <div className="field"><label>Corner tag</label><input type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={() => exportImage('png')}>Download PNG</button>
            <button className="btn secondary" onClick={() => exportImage('jpeg')}>Download JPEG</button>
          </div>
          <button className="btn secondary" style={{ width: '100%', marginTop: 8 }} onClick={copyImage}>Copy image</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button className="btn secondary" onClick={saveProject}>Save project</button>
            <label className="btn secondary" style={{ textAlign: 'center', cursor: 'pointer' }}>
              Load project
              <input type="file" accept="application/json" onChange={loadProject} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 20 }}>
          <div style={{ background: 'repeating-conic-gradient(#141517 0% 25%, #191a1d 0% 50%) 50% / 22px 22px', padding: 24, borderRadius: 10 }}>
            <CardCanvas ref={cardRef} data={{ ...data, ratioW: size.w, ratioH: size.h }} />
          </div>
        </div>
      </div>
      {ToastEl}
    </Layout>
  );
}
