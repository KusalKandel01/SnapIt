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
  watermark: 'yoursource',
  kicker: 'BREAKING',
  headline: 'HEADLINE GOES HERE',
  bannerLines: 'Short supporting line one\nShort supporting line two',
  caption: 'Add a short descriptive caption here explaining the context.',
  cornerTag: 'IN-DEPTH STORY',
  sizeId: 'ig-square'
};

export default function Editor() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [stockQuery, setStockQuery] = useState('');
  const [stockResults, setStockResults] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const { toast, ToastEl } = useToast();

  // load a preset passed from the Templates page via sessionStorage
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

  // ---- stock photo search (server-side Unsplash proxy) ----
  async function searchStock(e) {
    e.preventDefault();
    if (!stockQuery.trim()) return;
    setStockLoading(true);
    try {
      const res = await fetch(`/api/stock?q=${encodeURIComponent(stockQuery)}`);
      const json = await res.json();
      if (json.error) {
        toast(json.error);
        setStockResults([]);
      } else {
        setStockResults(json.results || []);
      }
    } catch (err) {
      toast('Search failed — check your connection');
    }
    setStockLoading(false);
  }

  // ---- upload a photo ----
  function onUploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('bg', ev.target.result);
    reader.readAsDataURL(file);
  }

  // ---- capture a frame from an uploaded video ----
  function onUploadVideo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(1, video.duration / 2);
    });
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      set('bg', canvas.toDataURL('image/png'));
      toast('Frame captured from video');
      URL.revokeObjectURL(url);
    });
  }

  // ---- export ----
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
    if (!navigator.clipboard || !window.ClipboardItem) {
      toast("Your browser can't copy images — use Download instead");
      return;
    }
    const html2canvas = (await import('html2canvas')).default;
    const node = cardRef.current;
    const scale = size.w / node.getBoundingClientRect().width;
    const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: data.layout === 'light' ? '#f4f2ee' : '#0b0c0e' });
    canvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        toast('Copied — paste it anywhere');
      } catch (e) {
        toast('Copy blocked by browser — try Download instead');
      }
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
        setData(d => ({ ...d, ...loaded }));
        toast('Project loaded');
      } catch (err) {
        toast('Could not read that file');
      }
    };
    reader.readAsText(file);
  }

  return (
    <Layout>
      <h1 className="page-title">Editor</h1>
      <p className="page-sub">Build one card, pick a platform size, export or copy it straight to your clipboard.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>
        <div className="card-panel" style={{ maxHeight: '82vh', overflowY: 'auto' }}>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn ${data.layout === 'dark' ? '' : 'secondary'}`} onClick={() => set('layout', 'dark')}>Dark Alert</button>
              <button className={`btn ${data.layout === 'light' ? '' : 'secondary'}`} onClick={() => set('layout', 'light')}>Light Card</button>
            </div>
          </div>

          <div className="field">
            <label>Text alignment</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn ${data.align === 'left' ? '' : 'secondary'}`} onClick={() => set('align', 'left')}>Left</button>
              <button className={`btn ${data.align === 'center' ? '' : 'secondary'}`} onClick={() => set('align', 'center')}>Centered</button>
            </div>
          </div>

          <div className="field">
            <label>Accent color</label>
            <input type="color" value={data.color} onChange={e => set('color', e.target.value)} style={{ width: 50, height: 30, border: 'none', background: 'none' }} />
          </div>

          <div className="field">
            <label>Background photo</label>
            <input type="file" accept="image/*" onChange={onUploadPhoto} />
          </div>
          <div className="field">
            <label>Or grab a frame from a video you own</label>
            <input type="file" accept="video/*" onChange={onUploadVideo} />
          </div>

          <div className="field">
            <label>Search free HQ stock photos (Unsplash)</label>
            <form onSubmit={searchStock} style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={stockQuery} onChange={e => setStockQuery(e.target.value)} placeholder="e.g. city skyline" />
              <button className="btn secondary" type="submit">{stockLoading ? '...' : 'Search'}</button>
            </form>
            {stockResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                {stockResults.map(r => (
                  <img key={r.id} src={r.thumb} alt={r.alt} title={`Photo by ${r.credit} on Unsplash`}
                    onClick={() => { set('bg', r.full); toast('Photo applied'); }}
                    style={{ width: '100%', height: 54, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--line)' }} />
                ))}
              </div>
            )}
          </div>

          <div className="field"><label>Watermark</label><input type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
          <div className="field"><label>Kicker</label><input type="text" value={data.kicker} onChange={e => set('kicker', e.target.value)} /></div>
          <div className="field"><label>Headline</label><textarea rows={2} value={data.headline} onChange={e => set('headline', e.target.value)} /></div>
          <div className="field"><label>Banner sub-lines (one per line)</label><textarea rows={2} value={data.bannerLines} onChange={e => set('bannerLines', e.target.value)} /></div>
          <div className="field"><label>Caption</label><textarea rows={3} value={data.caption} onChange={e => set('caption', e.target.value)} /></div>
          <div className="field"><label>Corner tag</label><input type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>

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
