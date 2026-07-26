import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Eyebrow from '../components/Eyebrow';
import CardCanvas from '../components/CardCanvas';
import Stepper from '../components/Stepper';
import EmojiPicker from '../components/EmojiPicker';
import Icon from '../components/Icon';
import DropZone from '../components/DropZone';
import useToast from '../components/useToast';
import { useAutosave, readDraft } from '../components/useAutosave';
import { PLATFORM_GROUPS, findSize } from '../lib/platformSizes';
import { getActiveKit } from '../lib/brandKits';
import { saveProject as saveToProjectsLib } from '../lib/projects';
import { contrastRatio, contrastVerdict } from '../lib/contrast';
import { NEPAL_PROVINCE_NAMES } from '../lib/nepalMap';

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
  sizeId: 'ig-square',
  layers: []
};

const FONTS = [
  { label: 'Anton (default)', value: "'Anton',sans-serif" },
  { label: 'Oswald', value: "'Oswald',sans-serif" },
  { label: 'Playfair Display', value: "'Playfair Display',serif" },
  { label: 'Poppins', value: "'Poppins',sans-serif" }
];

// Preset combos for text layers — one click applies a curated look instead
// of tuning five sliders by hand. Each only sets the fields it cares about,
// so applying a preset never touches text/position/rotation.
const TEXT_PRESETS = [
  { name: 'Bold Headline', style: { fontSize: 44, bold: true, letterSpacing: 0, lineHeight: 1.05, shadowStrength: 60, strokeWidth: 0 } },
  { name: 'Subtitle', style: { fontSize: 22, bold: false, letterSpacing: 1, lineHeight: 1.3, shadowStrength: 40, strokeWidth: 0 } },
  { name: 'Fine Caption', style: { fontSize: 14, bold: false, letterSpacing: 0, lineHeight: 1.5, shadowStrength: 30, strokeWidth: 0 } },
  { name: 'Badge / Label', style: { fontSize: 16, bold: true, letterSpacing: 2, lineHeight: 1, shadowStrength: 0, strokeWidth: 0 } },
  { name: 'Outlined Pop', style: { fontSize: 36, bold: true, letterSpacing: 0, lineHeight: 1.1, shadowStrength: 0, strokeWidth: 2, strokeColor: '#000000' } },
  { name: 'Soft Quote', style: { fontSize: 26, bold: false, letterSpacing: 0.5, lineHeight: 1.4, shadowStrength: 50, strokeWidth: 0 } }
];

// Rough, honest bounds check — not a pixel-perfect overflow detector. Text
// layer heights are dynamic (depend on wrapping), so this only checks
// horizontal bounds for text (which IS precise, width is a known field) and
// full horizontal+vertical bounds for images (both dimensions are known).
function layerOutOfBounds(l) {
  const halfW = (l.width || (l.type === 'image' || l.type === 'chart' || l.type === 'map' ? 25 : 85)) / 2;
  const xOut = (l.x - halfW < -0.5) || (l.x + halfW > 100.5);
  if (l.type === 'image' || l.type === 'chart' || l.type === 'map') {
    const halfH = (l.height || 25) / 2;
    const yOut = (l.y - halfH < -0.5) || (l.y + halfH > 100.5);
    return xOut || yOut;
  }
  return xOut;
}

function SectionHeader({ n, title }) {
  return (
    <div className="section-header">
      <span className="num">{n}</span>
      <span className="title">{title}</span>
      <span className="rule" />
    </div>
  );
}

function ContrastBadge({ fg, bg, label }) {
  const ratio = contrastRatio(fg, bg);
  const verdict = contrastVerdict(ratio);
  const color = verdict.pass ? 'var(--pine)' : 'var(--proof-red)';
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color, marginLeft: 8 }} title={`${ratio.toFixed(1)}:1 contrast ratio, ${label}`}>
      {ratio.toFixed(1)}:1 — {verdict.level}
    </span>
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
  const [recentMedia, setRecentMedia] = useState([]);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState('');
  const [aiResults, setAiResults] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newsSourceLink, setNewsSourceLink] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [cbMode, setCbMode] = useState('none');
  const [altTextLoading, setAltTextLoading] = useState(null);
  const [carouselSlides, setCarouselSlides] = useState(null); // null = carousel mode off
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const layerDragState = useRef(null);
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
        const link = sessionStorage.getItem('snapstudio:newsSourceLink');
        if (link) { setNewsSourceLink(link); sessionStorage.removeItem('snapstudio:newsSourceLink'); }
        const openId = sessionStorage.getItem('snapstudio:openProjectId');
        if (openId) { setCurrentProjectId(openId); sessionStorage.removeItem('snapstudio:openProjectId'); }
      } else {
        const draft = readDraft();
        if (draft) setData(d => ({ ...d, ...draft }));
      }
    } catch (e) {}
    setLoadedPreset(true);
    try {
      const active = getActiveKit();
      if (active && active.logo) setBrandLogo(active.logo);
    } catch (e) {}
    refreshRecentMedia();
  }, []);

  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));
  const appendEmoji = (key, emoji) => setData(d => ({ ...d, [key]: (d[key] || '') + emoji }));
  const appendEmojiToLayer = (layerId, emoji) => setData(d => ({
    ...d, layers: d.layers.map(l => l.id === layerId ? { ...l, text: (l.text || '') + emoji } : l)
  }));
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

  // ---- Text layers: unlimited freeform text boxes on top of any layout ----
  function addTextLayer() {
    const id = `layer-${Date.now()}`;
    const newLayer = { id, type: 'text', text: 'New text', x: 50, y: 50, width: 85, fontSize: 24, color: '#ffffff', rotation: 0, opacity: 1, bold: false, visible: true, locked: false };
    setData(d => ({ ...d, layers: [...(d.layers || []), newLayer] }));
    setSelectedLayerId(id);
  }

  // ---- Image layers: multiple images, independent size/shape/rotation ----
  function addImageLayer(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      const id = `layer-${Date.now()}`;
      const newLayer = {
        id, type: 'image', src: ev.target.result,
        x: 50, y: 50, width: 25, height: 25, shape: 'rect',
        rotation: 0, opacity: 1, borderWidth: 0, borderColor: '#ffffff',
        visible: true, locked: false
      };
      setData(d => ({ ...d, layers: [...(d.layers || []), newLayer] }));
      setSelectedLayerId(id);
    };
    reader.readAsDataURL(file);
  }

  // ---- Chart layers: bar/pie/line, on the same layers array ----
  function addChartLayer() {
    const id = `layer-${Date.now()}`;
    const newLayer = {
      id, type: 'chart', chartType: 'bar',
      dataText: 'Mon, 12\nTue, 19\nWed, 8\nThu, 25\nFri, 16',
      color: '#b98b3e',
      x: 50, y: 50, width: 45, height: 30,
      rotation: 0, opacity: 1, visible: true, locked: false
    };
    setData(d => ({ ...d, layers: [...(d.layers || []), newLayer] }));
    setSelectedLayerId(id);
  }

  function addMapLayer() {
    const id = `layer-${Date.now()}`;
    const newLayer = {
      id, type: 'map', highlightedProvinces: ['Bagmati'], color: '#b98b3e',
      x: 50, y: 50, width: 45, height: 25,
      rotation: 0, opacity: 1, visible: true, locked: false
    };
    setData(d => ({ ...d, layers: [...(d.layers || []), newLayer] }));
    setSelectedLayerId(id);
  }
  function updateLayer(id, patch) {
    setData(d => ({ ...d, layers: d.layers.map(l => l.id === id ? { ...l, ...patch } : l) }));
  }
  function deleteLayer(id) {
    setData(d => ({ ...d, layers: d.layers.filter(l => l.id !== id) }));
    if (selectedLayerId === id) setSelectedLayerId(null);
  }
  function duplicateLayer(id) {
    setData(d => {
      const src = d.layers.find(l => l.id === id);
      if (!src) return d;
      const copy = { ...src, id: `layer-${Date.now()}`, x: Math.min(95, src.x + 4), y: Math.min(95, src.y + 4) };
      return { ...d, layers: [...d.layers, copy] };
    });
  }

  const SNAP_THRESHOLD = 3; // percent — how close to center before it snaps
  function onLayerMouseDown(e, id) {
    const layer = data.layers.find(l => l.id === id);
    if (!layer || layer.locked) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedLayerId(id);
    const canvasEl = e.currentTarget.parentElement;
    const rect = canvasEl.getBoundingClientRect();
    layerDragState.current = { id, startX: e.clientX, startY: e.clientY, startLX: layer.x, startLY: layer.y, rectW: rect.width, rectH: rect.height };
    window.addEventListener('mousemove', onLayerDragMove);
    window.addEventListener('mouseup', onLayerDragEnd);
  }
  function onLayerDragMove(e) {
    const s = layerDragState.current;
    if (!s) return;
    const dx = e.clientX - s.startX, dy = e.clientY - s.startY;
    let nx = s.startLX + (dx / s.rectW) * 100;
    let ny = s.startLY + (dy / s.rectH) * 100;
    if (Math.abs(nx - 50) < SNAP_THRESHOLD) nx = 50;
    if (Math.abs(ny - 50) < SNAP_THRESHOLD) ny = 50;
    nx = Math.min(100, Math.max(0, nx));
    ny = Math.min(100, Math.max(0, ny));
    updateLayer(s.id, { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 });
  }
  function onLayerDragEnd() {
    layerDragState.current = null;
    window.removeEventListener('mousemove', onLayerDragMove);
    window.removeEventListener('mouseup', onLayerDragEnd);
  }

  // ---- Drag-corner resize — the actual "resize by dragging" requested ----
  const resizeDragState = useRef(null);
  function onLayerResizeMouseDown(e, id) {
    const layer = data.layers.find(l => l.id === id);
    if (!layer || layer.locked) return;
    e.preventDefault();
    e.stopPropagation();
    const isImage = layer.type === 'image' || layer.type === 'chart' || layer.type === 'map';
    resizeDragState.current = {
      id, isImage,
      startX: e.clientX, startY: e.clientY,
      startWidth: layer.width || (isImage ? 25 : 85),
      startHeight: isImage ? (layer.height || 25) : null,
      rotationRad: ((layer.rotation || 0) * Math.PI) / 180,
      cardWidthPx: cardRef.current.getBoundingClientRect().width
    };
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
  }
  function onResizeMove(e) {
    const s = resizeDragState.current;
    if (!s) return;
    const dx = e.clientX - s.startX, dy = e.clientY - s.startY;
    // FIXED: previously used raw screen-space dx/dy directly, so dragging a
    // rotated layer's corner resized in the wrong direction (screen axes,
    // not the layer's own rotated axes). Rotating the mouse delta by the
    // layer's own angle (inverse rotation) converts it into the layer's
    // local coordinate frame before applying it to width/height.
    const { rotationRad: r } = s;
    const localDx = dx * Math.cos(r) + dy * Math.sin(r);
    const localDy = -dx * Math.sin(r) + dy * Math.cos(r);
    const deltaWPercent = (localDx / s.cardWidthPx) * 100;
    if (s.isImage) {
      const deltaHPercent = (localDy / s.cardWidthPx) * 100;
      updateLayer(s.id, {
        width: Math.min(100, Math.max(5, Math.round(s.startWidth + deltaWPercent))),
        height: Math.min(100, Math.max(5, Math.round(s.startHeight + deltaHPercent)))
      });
    } else {
      // Text layers resize by box width only — height follows content naturally.
      updateLayer(s.id, { width: Math.min(100, Math.max(10, Math.round(s.startWidth + deltaWPercent))) });
    }
  }
  function onResizeEnd() {
    resizeDragState.current = null;
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
  }

  // ---- Layer ordering — array order is stacking order (later = on top) ----
  function moveLayer(id, direction) {
    setData(d => {
      const idx = d.layers.findIndex(l => l.id === id);
      if (idx === -1) return d;
      const next = [...d.layers];
      let target;
      if (direction === 'up') target = Math.min(next.length - 1, idx + 1);
      else if (direction === 'down') target = Math.max(0, idx - 1);
      else if (direction === 'front') target = next.length - 1;
      else target = 0; // 'back'
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return { ...d, layers: next };
    });
  }

  // Keyboard nudge + delete for the selected layer — skipped entirely while
  // typing in any input/textarea so it never hijacks normal text editing.
  useEffect(() => {
    function onKeyDown(e) {
      if (!selectedLayerId) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const layer = data.layers.find(l => l.id === selectedLayerId);
      if (!layer || layer.locked) return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowUp') { e.preventDefault(); updateLayer(selectedLayerId, { y: Math.max(0, layer.y - step) }); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); updateLayer(selectedLayerId, { y: Math.min(100, layer.y + step) }); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); updateLayer(selectedLayerId, { x: Math.max(0, layer.x - step) }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); updateLayer(selectedLayerId, { x: Math.min(100, layer.x + step) }); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteLayer(selectedLayerId); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedLayerId, data.layers]);

  function waitForFrame() { return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }

  // ---- Carousel mode: a sequence of independent slides sharing the
  // Editor's tools. Each slide is a full data snapshot (its own layout,
  // layers, everything) so a carousel can genuinely mix a Dark Alert cover
  // slide with Quote/Stat slides after it, not just repeat one template.
  function toggleCarouselMode() {
    if (carouselSlides) {
      // Turning off: keep editing the currently active slide as the single card.
      setCarouselSlides(null);
      setActiveSlideIndex(0);
    } else {
      setCarouselSlides([structuredClone(data)]);
      setActiveSlideIndex(0);
    }
  }

  function switchToSlide(index) {
    if (!carouselSlides) return;
    const updated = [...carouselSlides];
    updated[activeSlideIndex] = structuredClone(data); // save current edits first
    setCarouselSlides(updated);
    setActiveSlideIndex(index);
    setData(updated[index]);
    setSelectedLayerId(null);
  }

  function addSlide() {
    const updated = [...carouselSlides];
    updated[activeSlideIndex] = structuredClone(data);
    const newSlide = structuredClone(data); // duplicate current slide as the starting point for the new one
    updated.splice(activeSlideIndex + 1, 0, newSlide);
    setCarouselSlides(updated);
    setActiveSlideIndex(activeSlideIndex + 1);
    setData(newSlide);
    toast(`Slide ${activeSlideIndex + 2} added`);
  }

  function deleteSlide(index) {
    if (carouselSlides.length <= 1) { toast('A carousel needs at least one slide'); return; }
    const updated = carouselSlides.filter((_, i) => i !== index);
    const newActive = Math.min(index, updated.length - 1);
    setCarouselSlides(updated);
    setActiveSlideIndex(newActive);
    setData(updated[newActive]);
    toast('Slide removed');
  }

  function moveSlide(index, direction) {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= carouselSlides.length) return;
    const updated = [...carouselSlides];
    updated[activeSlideIndex] = structuredClone(data);
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setCarouselSlides(updated);
    setActiveSlideIndex(target === activeSlideIndex ? index : (index === activeSlideIndex ? target : activeSlideIndex));
  }

  async function exportCarousel() {
    setBatchExporting(true);
    toast('Rendering carousel…');
    const updated = [...carouselSlides];
    updated[activeSlideIndex] = structuredClone(data);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const node = cardRef.current;
      for (let i = 0; i < updated.length; i++) {
        setData(updated[i]);
        await waitForFrame();
        const scale = size.w / node.getBoundingClientRect().width;
        const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: updated[i].layout === 'light' ? '#f4f2ee' : '#0b0c0e' });
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
        zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `${slugify(data.projectName)}-carousel.zip`;
      link.href = URL.createObjectURL(zipBlob);
      link.click();
      toast(`Carousel exported — ${updated.length} slides, in order`);
    } catch (err) {
      toast('Carousel export failed — try again');
    }
    setCarouselSlides(updated);
    setData(updated[activeSlideIndex]);
    setBatchExporting(false);
  }

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
    reader.onload = ev => {
      set('mediaType', 'image'); set('bg', ev.target.result); resetFraming();
      // Best-effort save to the media library so it's reusable next time —
      // never blocks or errors the actual upload if it fails.
      import('../lib/mediaLibrary').then(({ addMedia }) => {
        addMedia({ name: file.name, dataUrl: ev.target.result }).then(refreshRecentMedia).catch(() => {});
      }).catch(() => {});
    };
    reader.readAsDataURL(file);
  }

  function refreshRecentMedia() {
    import('../lib/mediaLibrary').then(({ listMedia }) => {
      listMedia().then(items => setRecentMedia(items.slice(0, 8))).catch(() => {});
    }).catch(() => {});
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

  async function callAI(task) {
    const topic = aiTopic.trim() || data.headline.trim();
    if (!topic) { toast('Type what the card is about first'); return; }
    setAiLoading(task);
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, input: topic }) });
      const json = await res.json();
      if (json.error) { toast(json.error); setAiResults(null); }
      else {
        const lines = task === 'headlines' ? json.text.split('\n').filter(l => l.trim()) : [json.text];
        setAiResults({ task, lines });
      }
    } catch (err) { toast('AI request failed — check your connection'); }
    setAiLoading('');
  }

  async function generateAltText(layerId, imageSrc) {
    if (!imageSrc || !imageSrc.startsWith('data:')) {
      toast('Alt-text generation needs an uploaded image (not an external URL)');
      return;
    }
    setAltTextLoading(layerId);
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'imageAlt', imageDataUrl: imageSrc }) });
      const json = await res.json();
      if (json.error) toast(json.error);
      else { updateLayer(layerId, { alt: json.text }); toast('Alt text generated'); }
    } catch (err) { toast('Alt-text request failed — check your connection'); }
    setAltTextLoading(null);
  }

  async function exportImage(format) {
    const html2canvas = (await import('html2canvas')).default;
    const node = cardRef.current;
    const scale = size.w / node.getBoundingClientRect().width;
    const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: data.layout === 'light' ? '#f4f2ee' : '#0b0c0e' });

    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      // Orient and size the PDF page to match the card's own aspect ratio
      // (in points, 1px = 0.75pt) instead of forcing it onto a fixed
      // Letter/A4 page — a Story-ratio card on an A4 page would either
      // shrink tiny or spill off the edge.
      const wPt = size.w * 0.75, hPt = size.h * 0.75;
      const pdf = new jsPDF({ orientation: wPt > hPt ? 'landscape' : 'portrait', unit: 'pt', format: [wPt, hPt] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, wPt, hPt);
      pdf.save(`${slugify(data.projectName)}.pdf`);
      toast('PDF downloaded');
      return;
    }

    const link = document.createElement('a');
    link.download = `${slugify(data.projectName)}.${format}`;
    link.href = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png', 0.95);
    link.click();
    toast('Image downloaded');
  }

  // ---- Animated GIF export: a fade-in reveal, genuinely encoded frame by
  // frame (not a fake single-frame "animation"). Captures the finished card
  // once via html2canvas, then composites N frames with a black overlay
  // fading from opaque to transparent, encoded with gifenc (pure JS, no
  // web worker asset needed — simpler to ship than gif.js). ----
  async function exportAnimatedGif() {
    setBatchExporting(true);
    toast('Rendering animation…');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
      const node = cardRef.current;
      const scale = size.w / node.getBoundingClientRect().width;
      const sourceCanvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: data.layout === 'light' ? '#f4f2ee' : '#0b0c0e' });

      const FRAMES = 10, HOLD_FRAMES = 4;
      const gif = GIFEncoder();
      const work = document.createElement('canvas');
      work.width = sourceCanvas.width;
      work.height = sourceCanvas.height;
      const ctx = work.getContext('2d');
      const fadeBase = data.layout === 'light' ? [244, 242, 238] : [11, 12, 14];

      for (let i = 0; i <= FRAMES; i++) {
        ctx.drawImage(sourceCanvas, 0, 0);
        const alpha = 1 - i / FRAMES;
        if (alpha > 0.01) {
          ctx.fillStyle = `rgba(${fadeBase[0]},${fadeBase[1]},${fadeBase[2]},${alpha})`;
          ctx.fillRect(0, 0, work.width, work.height);
        }
        const { data: pixels } = ctx.getImageData(0, 0, work.width, work.height);
        const palette = quantize(pixels, 256);
        const index = applyPalette(pixels, palette);
        gif.writeFrame(index, work.width, work.height, { palette, delay: i === FRAMES ? 0 : 60 });
      }
      // Hold on the fully-revealed frame so it doesn't look like it just ends abruptly
      ctx.drawImage(sourceCanvas, 0, 0);
      const { data: holdPixels } = ctx.getImageData(0, 0, work.width, work.height);
      const holdPalette = quantize(holdPixels, 256);
      const holdIndex = applyPalette(holdPixels, holdPalette);
      for (let h = 0; h < HOLD_FRAMES; h++) {
        gif.writeFrame(holdIndex, work.width, work.height, { palette: holdPalette, delay: 90 });
      }
      gif.finish();

      const blob = new Blob([gif.bytes()], { type: 'image/gif' });
      const link = document.createElement('a');
      link.download = `${slugify(data.projectName)}.gif`;
      link.href = URL.createObjectURL(blob);
      link.click();
      toast('Animated GIF downloaded');
    } catch (err) {
      toast('GIF export failed — try again, or use a static export instead');
    }
    setBatchExporting(false);
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

  function saveToProjects() {
    const saved = saveToProjectsLib({ id: currentProjectId, name: data.projectName || 'Untitled project', data });
    setCurrentProjectId(saved.id);
    toast(`Saved to Projects as "${saved.name}"`);
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
        if (!Array.isArray(loaded.layers)) loaded.layers = [];
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
          <Eyebrow>Proof Sheet · {data.layout} layout</Eyebrow>
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
              {data.projectName} <span style={{ fontSize: 12, color: 'var(--rule-light)', fontFamily: 'var(--font-mono)', fontStyle: 'normal', letterSpacing: '.06em', textTransform: 'uppercase' }}>rename</span>
            </h1>
          )}
          <p className="page-sub">Build one card, pick a platform size, export or copy it straight to your clipboard. Every change autosaves — closing the tab never loses your work.</p>
          {newsSourceLink && (
            <p style={{ fontSize: 11.5, color: 'var(--brass)', background: 'rgba(185,139,62,.08)', border: '1px solid var(--brass)', borderRadius: 6, padding: '6px 10px', display: 'inline-block' }}>
              Started from a News Digest item — include <a href={newsSourceLink} target="_blank" rel="noreferrer" style={{ color: 'var(--brass)' }}>this source link</a> in your actual post caption when you publish.
            </p>
          )}
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

      <div className="editor-grid">
        <div className="card-panel editor-sidebar" style={{ maxHeight: '84vh', overflowY: 'auto' }}>

          <SectionHeader n="01" title="Canvas" />
          <div className="field">
            <label>Carousel mode</label>
            <button className={`btn ${carouselSlides ? '' : 'secondary'}`} style={{ width: '100%' }} onClick={toggleCarouselMode}>
              {carouselSlides ? `On — ${carouselSlides.length} slide${carouselSlides.length > 1 ? 's' : ''}` : 'Off — single card'}
            </button>
            <p style={{ fontSize: 10.5, color: 'var(--rule-light)', marginTop: 4 }}>Build a multi-slide Instagram/LinkedIn carousel — each slide keeps its own layout and layers, exported as one ordered zip.</p>
          </div>
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

          <div className="field">
            <label id="cb-label">Colorblind preview</label>
            <div role="group" aria-labelledby="cb-label" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button className={`btn ${cbMode === 'none' ? '' : 'secondary'}`} onClick={() => setCbMode('none')} style={{ fontSize: 10.5 }}>Normal</button>
              <button className={`btn ${cbMode === 'protanopia' ? '' : 'secondary'}`} onClick={() => setCbMode('protanopia')} style={{ fontSize: 10.5 }}>Protanopia</button>
              <button className={`btn ${cbMode === 'deuteranopia' ? '' : 'secondary'}`} onClick={() => setCbMode('deuteranopia')} style={{ fontSize: 10.5 }}>Deuteranopia</button>
              <button className={`btn ${cbMode === 'tritanopia' ? '' : 'secondary'}`} onClick={() => setCbMode('tritanopia')} style={{ fontSize: 10.5 }}>Tritanopia</button>
            </div>
            <p style={{ fontSize: 10, color: 'var(--rule-light)', marginTop: 4 }}>Simulates how this card looks with each color vision type — preview only, doesn't affect the export.</p>
          </div>

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
            <ContrastBadge fg="#ffffff" bg={data.color} label="white text on this" />
          </div>
          <div className="field">
            <label htmlFor="page-color">Page / canvas color</label>
            <input id="page-color" type="color" value={data.pageColor || (data.layout === 'light' ? '#f4f2ee' : '#0b0c0e')} onChange={e => set('pageColor', e.target.value)} style={{ width: 50, height: 30, border: 'none', background: 'none' }} />
            <p style={{ fontSize: 10.5, color: 'var(--rule-light)', marginTop: 4 }}>The base background behind everything — visible wherever there's no photo.</p>
          </div>
          {showBgFields && (
            <div className="field">
              <label id="fade-label">Photo fade overlay</label>
              <div role="group" aria-labelledby="fade-label" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className={`btn ${data.fadeColor === '#000000' || !data.fadeColor ? '' : 'secondary'}`} onClick={() => set('fadeColor', '#000000')}>Dark fade</button>
                <button className={`btn ${data.fadeColor === '#ffffff' ? '' : 'secondary'}`} onClick={() => set('fadeColor', '#ffffff')}>Light fade</button>
                <input type="color" aria-label="Custom fade color" value={data.fadeColor || '#000000'} onChange={e => set('fadeColor', e.target.value)} style={{ width: 40, height: 36, border: 'none', background: 'none' }} />
              </div>
              <Stepper label="Fade strength" value={data.fadeStrength ?? 78} onChange={v => set('fadeStrength', v)} min={0} max={100} step={5} unit="%" />
              <p style={{ fontSize: 10.5, color: 'var(--rule-light)', marginTop: 4 }}>How the photo darkens or lightens toward the bottom so your text stays readable — pick any color, not just black.</p>
            </div>
          )}

          <SectionHeader n="03" title="Layers" />
          <p style={{ fontSize: 11, color: 'var(--rule-light)', marginTop: -6, marginBottom: 10 }}>
            Add unlimited text boxes and images on top of your card — different sizes, shapes, and positions. Drag directly on the canvas to move, drag the small brass dot on a selected layer's corner to resize, arrow keys to nudge, Delete to remove.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <button className="btn secondary" onClick={addTextLayer}>+ Text layer</button>
            <label className="btn secondary" style={{ textAlign: 'center', cursor: 'pointer' }}>
              + Image layer
              <input type="file" accept="image/*" onChange={e => { if (e.target.files[0]) addImageLayer(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
            </label>
          </div>
          <button className="btn secondary" style={{ width: '100%', marginBottom: 10 }} onClick={addChartLayer}>+ Chart layer</button>
          <button className="btn secondary" style={{ width: '100%', marginBottom: 10 }} onClick={addMapLayer}>+ Nepal map layer</button>
          {data.layers.length === 0 && <p style={{ fontSize: 11, color: 'var(--rule-light)', marginBottom: 14 }}>No extra layers yet.</p>}
          {data.layers.map(l => (
            <div key={l.id} className="card-panel" style={{ padding: 10, marginBottom: 8, border: selectedLayerId === l.id ? '1px solid var(--brass)' : '1px solid var(--rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: l.id === selectedLayerId ? 8 : 0, flexWrap: 'wrap' }}>
                {l.type === 'image' && (
                  <img src={l.src} alt="" style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: l.shape === 'circle' ? '50%' : 3, flexShrink: 0 }} />
                )}
                {l.type === 'chart' && <Icon name="chart" size={14} color="var(--brass)" />}
                {l.type === 'map' && <Icon name="map" size={14} color="var(--brass)" />}
                <span
                  onClick={() => setSelectedLayerId(l.id)}
                  style={{ flex: 1, fontSize: 12, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selectedLayerId === l.id ? 'var(--brass)' : 'var(--white)' }}
                >
                  {l.type === 'image' ? 'Image layer' : l.type === 'chart' ? `${l.chartType || 'bar'} chart` : l.type === 'map' ? 'Nepal map' : (l.text || '(empty text)')}
                  {layerOutOfBounds(l) && <span title="This layer extends past the card edge" style={{ marginLeft: 4 }}>⚠️</span>}
                </span>
                <button className="btn secondary" aria-label={l.visible === false ? 'Show layer' : 'Hide layer'} onClick={() => updateLayer(l.id, { visible: l.visible === false ? true : false })} style={{ padding: '5px 7px' }}><Icon name={l.visible === false ? 'eyeOff' : 'eye'} /></button>
                <button className="btn secondary" aria-label={l.locked ? 'Unlock layer' : 'Lock layer'} onClick={() => updateLayer(l.id, { locked: !l.locked })} style={{ padding: '5px 7px' }}><Icon name={l.locked ? 'lock' : 'unlock'} /></button>
                <button className="btn secondary" aria-label="Move layer forward" title="Move forward (toward top)" onClick={() => moveLayer(l.id, 'up')} style={{ padding: '5px 6px' }}><Icon name="up" size={12} /></button>
                <button className="btn secondary" aria-label="Move layer backward" title="Move backward (toward bottom)" onClick={() => moveLayer(l.id, 'down')} style={{ padding: '5px 6px' }}><Icon name="down" size={12} /></button>
                <button className="btn secondary" aria-label="Duplicate layer" onClick={() => duplicateLayer(l.id)} style={{ padding: '5px 7px' }}><Icon name="duplicate" size={13} /></button>
                <button onClick={() => deleteLayer(l.id)} aria-label="Delete layer" style={{ background: 'none', border: 'none', color: 'var(--proof-red)', cursor: 'pointer', fontSize: 15, padding: '4px 6px' }}>×</button>
              </div>
              {selectedLayerId === l.id && l.type === 'map' && (
                <div>
                  <div className="field">
                    <label id={`prov-${l.id}`}>Highlighted province(s)</label>
                    <div role="group" aria-labelledby={`prov-${l.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      {NEPAL_PROVINCE_NAMES.map(name => {
                        const active = (l.highlightedProvinces || []).includes(name);
                        return (
                          <button
                            key={name}
                            className={`btn ${active ? '' : 'secondary'}`}
                            style={{ fontSize: 10 }}
                            onClick={() => {
                              const current = l.highlightedProvinces || [];
                              const next = active ? current.filter(n => n !== name) : [...current, name];
                              updateLayer(l.id, { highlightedProvinces: next });
                            }}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="field">
                    <label>Highlight color</label>
                    <input type="color" value={l.color} onChange={e => updateLayer(l.id, { color: e.target.value })} style={{ width: 50, height: 30, border: 'none', background: 'none' }} />
                  </div>
                  <Stepper label="Width" value={l.width} onChange={v => updateLayer(l.id, { width: v })} min={15} max={100} step={2} unit="%" />
                  <Stepper label="Height" value={l.height} onChange={v => updateLayer(l.id, { height: v })} min={10} max={100} step={2} unit="%" />
                  <Stepper label="Rotation" value={l.rotation || 0} onChange={v => updateLayer(l.id, { rotation: v })} min={-180} max={180} step={5} unit="°" />
                  <p style={{ fontSize: 10, color: 'var(--rule-light)' }}>Simplified boundaries derived from real Nepal administrative GeoJSON data — decorative accuracy, not survey-grade.</p>
                </div>
              )}
              {selectedLayerId === l.id && l.type === 'chart' && (
                <div>
                  <div className="field">
                    <label id={`charttype-${l.id}`}>Chart type</label>
                    <div role="group" aria-labelledby={`charttype-${l.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      <button className={`btn ${l.chartType === 'bar' ? '' : 'secondary'}`} onClick={() => updateLayer(l.id, { chartType: 'bar' })} style={{ fontSize: 10.5 }}>Bar</button>
                      <button className={`btn ${l.chartType === 'pie' ? '' : 'secondary'}`} onClick={() => updateLayer(l.id, { chartType: 'pie' })} style={{ fontSize: 10.5 }}>Pie</button>
                      <button className={`btn ${l.chartType === 'line' ? '' : 'secondary'}`} onClick={() => updateLayer(l.id, { chartType: 'line' })} style={{ fontSize: 10.5 }}>Line</button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Data — one "label, value" per line</label>
                    <textarea rows={5} value={l.dataText} onChange={e => updateLayer(l.id, { dataText: e.target.value })} style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }} />
                  </div>
                  <Stepper label="Width" value={l.width} onChange={v => updateLayer(l.id, { width: v })} min={15} max={100} step={2} unit="%" />
                  <Stepper label="Height" value={l.height} onChange={v => updateLayer(l.id, { height: v })} min={10} max={100} step={2} unit="%" />
                  <Stepper label="Rotation" value={l.rotation || 0} onChange={v => updateLayer(l.id, { rotation: v })} min={-180} max={180} step={5} unit="°" />
                  {l.chartType !== 'pie' && (
                    <div className="field">
                      <label>Color</label>
                      <input type="color" value={l.color} onChange={e => updateLayer(l.id, { color: e.target.value })} style={{ width: 50, height: 30, border: 'none', background: 'none' }} />
                    </div>
                  )}
                  {l.chartType === 'pie' && <p style={{ fontSize: 10.5, color: 'var(--rule-light)' }}>Pie slices use a fixed color palette for contrast between segments.</p>}
                </div>
              )}
              {selectedLayerId === l.id && l.type === 'image' && (
                <div>
                  <div className="field">
                    <label id={`shape-${l.id}`}>Shape</label>
                    <div role="group" aria-labelledby={`shape-${l.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      <button className={`btn ${l.shape === 'rect' ? '' : 'secondary'}`} onClick={() => updateLayer(l.id, { shape: 'rect' })} style={{ fontSize: 10.5 }}>Square</button>
                      <button className={`btn ${l.shape === 'rounded' ? '' : 'secondary'}`} onClick={() => updateLayer(l.id, { shape: 'rounded' })} style={{ fontSize: 10.5 }}>Rounded</button>
                      <button className={`btn ${l.shape === 'circle' ? '' : 'secondary'}`} onClick={() => updateLayer(l.id, { shape: 'circle' })} style={{ fontSize: 10.5 }}>Circle</button>
                    </div>
                  </div>
                  <Stepper label="Width" value={l.width} onChange={v => updateLayer(l.id, { width: v })} min={5} max={100} step={2} unit="%" />
                  <Stepper label="Height" value={l.height} onChange={v => updateLayer(l.id, { height: v })} min={5} max={100} step={2} unit="%" />
                  <Stepper label="Rotation" value={l.rotation || 0} onChange={v => updateLayer(l.id, { rotation: v })} min={-180} max={180} step={5} unit="°" />
                  <Stepper label="Border width" value={l.borderWidth || 0} onChange={v => updateLayer(l.id, { borderWidth: v })} min={0} max={12} step={1} unit="px" />
                  {l.borderWidth > 0 && (
                    <div className="field">
                      <label>Border color</label>
                      <input type="color" value={l.borderColor} onChange={e => updateLayer(l.id, { borderColor: e.target.value })} style={{ width: 50, height: 30, border: 'none', background: 'none' }} />
                    </div>
                  )}
                  <div className="field">
                    <label>Alt text (screen readers)</label>
                    <textarea rows={2} value={l.alt || ''} onChange={e => updateLayer(l.id, { alt: e.target.value })} placeholder="Describe what's in this image" />
                    <button className="btn secondary" style={{ width: '100%', marginTop: 6, fontSize: 11 }} onClick={() => generateAltText(l.id, l.src)} disabled={altTextLoading === l.id}>
                      {altTextLoading === l.id ? 'Looking at image…' : <><Icon name="sparkle" size={12} color="var(--brass)" /> Generate with AI</>}
                    </button>
                  </div>
                </div>
              )}
              {selectedLayerId === l.id && l.type !== 'image' && l.type !== 'chart' && l.type !== 'map' && (
                <div>
                  <div className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ marginBottom: 0 }}>Text</label>
                      <EmojiPicker onSelect={e => appendEmojiToLayer(l.id, e)} />
                    </div>
                    <textarea rows={2} value={l.text} onChange={e => updateLayer(l.id, { text: e.target.value })} />
                  </div>
                  <Stepper label="Font size" value={l.fontSize} onChange={v => updateLayer(l.id, { fontSize: v })} min={10} max={90} step={2} unit="px" />
                  <Stepper label="Box width" value={l.width || 85} onChange={v => updateLayer(l.id, { width: v })} min={10} max={100} step={5} unit="%" />
                  <Stepper label="Rotation" value={l.rotation || 0} onChange={v => updateLayer(l.id, { rotation: v })} min={-180} max={180} step={5} unit="°" />
                  <div className="field">
                    <label>Color</label>
                    <input type="color" value={l.color} onChange={e => updateLayer(l.id, { color: e.target.value })} style={{ width: 50, height: 30, border: 'none', background: 'none' }} />
                    <ContrastBadge fg={l.color} bg={data.pageColor || (data.layout === 'light' ? '#f4f2ee' : '#0b0c0e')} label="vs. page color (photos may differ)" />
                  </div>
                  <label className="checkline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--rule-light)', marginBottom: 10 }}>
                    <input type="checkbox" checked={!!l.bold} onChange={e => updateLayer(l.id, { bold: e.target.checked })} /> Bold
                  </label>

                  <div className="section-header" style={{ margin: '4px 0 10px 0' }}>
                    <span className="title" style={{ fontSize: 13 }}>Preset styles</span>
                    <span className="rule" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                    {TEXT_PRESETS.map(p => (
                      <button key={p.name} className="btn secondary" style={{ fontSize: 10.5, padding: '6px 4px' }} onClick={() => updateLayer(l.id, p.style)}>{p.name}</button>
                    ))}
                  </div>

                  <div className="section-header" style={{ margin: '4px 0 10px 0' }}>
                    <span className="title" style={{ fontSize: 13 }}>Typography</span>
                    <span className="rule" />
                  </div>
                  <Stepper label="Letter spacing" value={l.letterSpacing || 0} onChange={v => updateLayer(l.id, { letterSpacing: v })} min={-5} max={20} step={1} unit="px" />
                  <Stepper label="Line height" value={l.lineHeight || 1.2} onChange={v => updateLayer(l.id, { lineHeight: v })} min={0.8} max={2.5} step={0.1} unit="×" />
                  <Stepper label="Shadow strength" value={l.shadowStrength ?? 50} onChange={v => updateLayer(l.id, { shadowStrength: v })} min={0} max={100} step={10} unit="%" />
                  <Stepper label="Outline / stroke width" value={l.strokeWidth || 0} onChange={v => updateLayer(l.id, { strokeWidth: v })} min={0} max={6} step={0.5} unit="px" />
                  {l.strokeWidth > 0 && (
                    <div className="field">
                      <label>Outline color</label>
                      <input type="color" value={l.strokeColor || '#000000'} onChange={e => updateLayer(l.id, { strokeColor: e.target.value })} style={{ width: 50, height: 30, border: 'none', background: 'none' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {showBgFields && (
            <>
              <SectionHeader n="04" title="Media" />
              <DropZone label="Background photo" accept="image/*" onFile={onUploadPhoto} hint="Drag & drop a photo, or click to choose" />
              {recentMedia.length > 0 && (
                <div className="field">
                  <label>Recent uploads</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
                    {recentMedia.map(item => (
                      <img
                        key={item.id} src={item.dataUrl} alt={item.name}
                        onClick={() => { set('mediaType', 'image'); set('bg', item.dataUrl); resetFraming(); }}
                        title={item.name}
                        style={{ width: '100%', height: 32, objectFit: 'cover', borderRadius: 3, cursor: 'pointer', border: '1px solid var(--rule)' }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--rule-light)', marginTop: 4 }}>From your <a href="/media" style={{ color: 'var(--brass)' }}>Media Library</a> — click to reuse.</p>
                </div>
              )}
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

          <SectionHeader n="05" title="AI Assist" />
          <p style={{ fontSize: 11, color: 'var(--rule-light)', marginTop: -6, marginBottom: 10 }}>
            Needs an AI provider key configured on your deployment (see README) — degrades gracefully with a clear message if none is set.
          </p>
          <div className="field">
            <label htmlFor="ai-topic">What's this card about?</label>
            <input id="ai-topic" type="text" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Leave blank to use your current headline" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            <button className="btn secondary" onClick={() => callAI('headlines')} disabled={!!aiLoading} style={{ fontSize: 11 }}>{aiLoading === 'headlines' ? '...' : 'Suggest headlines'}</button>
            <button className="btn secondary" onClick={() => callAI('rewrite')} disabled={!!aiLoading} style={{ fontSize: 11 }}>{aiLoading === 'rewrite' ? '...' : 'Rewrite headline'}</button>
            <button className="btn secondary" onClick={() => callAI('caption')} disabled={!!aiLoading} style={{ fontSize: 11 }}>{aiLoading === 'caption' ? '...' : 'Write caption'}</button>
            <button className="btn secondary" onClick={() => callAI('hashtags')} disabled={!!aiLoading} style={{ fontSize: 11 }}>{aiLoading === 'hashtags' ? '...' : 'Suggest hashtags'}</button>
          </div>
          {aiResults && (
            <div style={{ marginBottom: 14 }}>
              {aiResults.lines.map((line, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (aiResults.task === 'headlines' || aiResults.task === 'rewrite') set('headline', line);
                    else if (aiResults.task === 'caption') set('caption', line);
                    else set('caption', (data.caption ? data.caption + ' ' : '') + line);
                    toast('Applied');
                  }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 9px', marginBottom: 5, background: 'var(--ink)', border: '1px solid var(--rule)', borderRadius: 6, color: 'var(--ink-text)', fontSize: 11.5, cursor: 'pointer' }}
                >
                  {line}
                </button>
              ))}
              <p style={{ fontSize: 10, color: 'var(--rule-light)' }}>Click a suggestion to apply it.</p>
            </div>
          )}

          <SectionHeader n="06" title="Content" />
          {showNewsFields && (
            <>
              <div className="field"><label htmlFor="f-watermark">Watermark</label><input id="f-watermark" type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="f-kicker" style={{ marginBottom: 0 }}>Kicker</label>
                  <EmojiPicker onSelect={e => appendEmoji('kicker', e)} />
                </div>
                <input id="f-kicker" type="text" value={data.kicker} onChange={e => set('kicker', e.target.value)} />
              </div>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="f-headline" style={{ marginBottom: 0 }}>Headline</label>
                  <EmojiPicker onSelect={e => appendEmoji('headline', e)} />
                </div>
                <textarea id="f-headline" rows={2} value={data.headline} onChange={e => set('headline', e.target.value)} />
              </div>
              <div className="field"><label htmlFor="f-banner">Banner sub-lines (one per line)</label><textarea id="f-banner" rows={2} value={data.bannerLines} onChange={e => set('bannerLines', e.target.value)} /></div>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="f-caption" style={{ marginBottom: 0 }}>Caption</label>
                  <EmojiPicker onSelect={e => appendEmoji('caption', e)} />
                </div>
                <textarea id="f-caption" rows={3} value={data.caption} onChange={e => set('caption', e.target.value)} />
              </div>
              <div className="field"><label htmlFor="f-corner">Corner tag</label><input id="f-corner" type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>
            </>
          )}
          {showQuoteFields && (
            <>
              <div className="field"><label htmlFor="f-watermark2">Watermark</label><input id="f-watermark2" type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="f-quote" style={{ marginBottom: 0 }}>Quote text</label>
                  <EmojiPicker onSelect={e => appendEmoji('quoteText', e)} />
                </div>
                <textarea id="f-quote" rows={3} value={data.quoteText} onChange={e => set('quoteText', e.target.value)} />
              </div>
              <div className="field"><label htmlFor="f-author">Author / attribution</label><input id="f-author" type="text" value={data.quoteAuthor} onChange={e => set('quoteAuthor', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-corner2">Corner tag</label><input id="f-corner2" type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>
            </>
          )}
          {showStatFields && (
            <>
              <div className="field"><label htmlFor="f-watermark3">Watermark</label><input id="f-watermark3" type="text" value={data.watermark} onChange={e => set('watermark', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-statnum">Stat number</label><input id="f-statnum" type="text" value={data.statNumber} onChange={e => set('statNumber', e.target.value)} /></div>
              <div className="field"><label htmlFor="f-statlabel">Stat label</label><input id="f-statlabel" type="text" value={data.statLabel} onChange={e => set('statLabel', e.target.value)} /></div>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="f-statdesc" style={{ marginBottom: 0 }}>Description</label>
                  <EmojiPicker onSelect={e => appendEmoji('statDesc', e)} />
                </div>
                <textarea id="f-statdesc" rows={2} value={data.statDesc} onChange={e => set('statDesc', e.target.value)} />
              </div>
              <div className="field"><label htmlFor="f-corner3">Corner tag</label><input id="f-corner3" type="text" value={data.cornerTag} onChange={e => set('cornerTag', e.target.value)} /></div>
            </>
          )}

          <SectionHeader n="07" title="Export & Project" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={() => exportImage('png')}>Download PNG</button>
            <button className="btn secondary" onClick={() => exportImage('jpeg')}>Download JPEG</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button className="btn secondary" onClick={() => exportImage('pdf')}>Download PDF</button>
            <button className="btn secondary" onClick={exportAnimatedGif} disabled={batchExporting}>{batchExporting ? '...' : 'Animated GIF'}</button>
          </div>
          <button className="btn secondary" style={{ width: '100%', marginTop: 8 }} onClick={copyImage}>Copy image</button>
          <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={exportAllPlatforms} disabled={batchExporting}>
            {batchExporting ? 'Rendering all sizes…' : 'Export for Instagram, X, Facebook, TikTok — all at once'}
          </button>
          <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={saveToProjects}>Save to Projects</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button className="btn secondary" onClick={saveProject}>Save as file</button>
            <label className="btn secondary" style={{ textAlign: 'center', cursor: 'pointer' }}>
              Load a file
              <input type="file" accept="application/json" onChange={loadProject} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, maxWidth: '100%', overflowX: 'auto' }}>
          <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              {/* Standard color-vision-deficiency simulation matrices (Brettel/Vienot-derived,
                  the same values used throughout accessibility tooling) */}
              <filter id="cb-protanopia"><feColorMatrix type="matrix" values="0.567,0.433,0,0,0  0.558,0.442,0,0,0  0,0.242,0.758,0,0  0,0,0,1,0" /></filter>
              <filter id="cb-deuteranopia"><feColorMatrix type="matrix" values="0.625,0.375,0,0,0  0.7,0.3,0,0,0  0,0.3,0.7,0,0  0,0,0,1,0" /></filter>
              <filter id="cb-tritanopia"><feColorMatrix type="matrix" values="0.95,0.05,0,0,0  0,0.433,0.567,0,0  0,0.475,0.525,0,0  0,0,0,1,0" /></filter>
            </defs>
          </svg>
          <div className="proof-frame" style={{ background: 'var(--ink-2)', border: '1px solid var(--rule)' }}>
            <div className="cm-tr" />
            <div className="cm-bl" />
            <div className="proof-stamp">{size.w}×{size.h} · {size.name}</div>
            <div
              onMouseDown={(e) => { startDrag(e); setSelectedLayerId(null); }}
              style={{ cursor: showBgFields && data.mediaType === 'image' ? 'grab' : 'default', filter: cbMode !== 'none' ? `url(#cb-${cbMode})` : 'none' }}
            >
              <CardCanvas
                ref={cardRef}
                data={{ ...data, ratioW: size.w, ratioH: size.h, brandLogo, showLogo }}
                selectedLayerId={selectedLayerId}
                onLayerMouseDown={onLayerMouseDown}
                onLayerResizeMouseDown={onLayerResizeMouseDown}
              />
            </div>
          </div>
          {data.layers.length > 0 && (
            <p style={{ fontSize: 11, color: 'var(--rule-light)', marginTop: 10 }}>Click a text layer to select it, drag to move, arrow keys to nudge, Delete to remove.</p>
          )}
          {showBgFields && data.mediaType === 'image' && (
            <p style={{ fontSize: 11, color: 'var(--rule-light)', marginTop: 10 }}>Click and drag the photo above to reposition it — same as the steppers, just faster.</p>
          )}
        </div>
      </div>
      {ToastEl}
    </Layout>
  );
}
