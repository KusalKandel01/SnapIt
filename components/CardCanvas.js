import { forwardRef } from 'react';
import { getDisplayDims } from '../lib/dims';
import { NEPAL_MAP_VIEWBOX, NEPAL_PROVINCES } from '../lib/nepalMap';

const CardCanvas = forwardRef(function CardCanvas({ data, selectedLayerId, onLayerMouseDown, onLayerResizeMouseDown }, ref) {
  const {
    layout, align, color, font, headSize, bodySize,
    bg, panX = 50, panY = 50, zoom = 100,
    watermark, kicker, headline, bannerLines, caption, cornerTag,
    quoteText, quoteAuthor, statNumber, statLabel, statDesc,
    brandLogo, showLogo,
    layers = [],
    pageColor, fadeColor, fadeStrength = 78,
    ratioW, ratioH
  } = data;

  const { w: dispW, h: dispH } = getDisplayDims(ratioW, ratioH);

  // Base canvas color — customizable "page colour" instead of a hardcoded
  // #111/paper. Falls back to sensible defaults if not set, so old saved
  // projects (which won't have pageColor) still look exactly as before.
  const resolvedPageColor = pageColor || (layout === 'light' ? '#f4f2ee' : '#0b0c0e');

  const wrapStyle = {
    position: 'relative',
    width: dispW,
    height: dispH,
    overflow: 'hidden',
    fontFamily: 'var(--font-body)',
    color: '#fff',
    background: resolvedPageColor
  };

  // FIXED: previously `backgroundSize: zoom%` set only the image's WIDTH
  // (a single CSS background-size value never sets height), so on tall
  // ratios like Story/TikTok (1080x1920) a normally-proportioned photo left
  // a visible black gap where its un-stretched height fell short of the
  // frame. `cover` always fills the box regardless of aspect ratio; the
  // zoom control is now a separate transform:scale on top of that base fit,
  // so "100% zoom" means "fully covered, no gap" instead of "actual size."
  const bgStyle = {
    backgroundImage: `url('${bg}')`,
    backgroundSize: 'cover',
    backgroundPosition: `${panX}% ${panY}%`,
    backgroundRepeat: 'no-repeat',
    transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
    transformOrigin: 'center'
  };

  // Customizable fade — replaces the old hardcoded black gradient. Pick any
  // color (defaults to black, matching the original look exactly for older
  // saved projects with no fadeColor set) and how strong it is at the bottom.
  function hexToRgb(hex) {
    const h = (hex || '#000000').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  const resolvedFadeColor = fadeColor || '#000000';
  const { r: fr, g: fg, b: fb } = hexToRgb(resolvedFadeColor);
  const fadeAlpha = Math.min(100, Math.max(0, fadeStrength)) / 100;
  const fadeGradient = `linear-gradient(180deg,
    rgba(${fr},${fg},${fb},${fadeAlpha * 0.06}) 0%,
    rgba(${fr},${fg},${fb},${fadeAlpha * 0.06}) 38%,
    rgba(${fr},${fg},${fb},${fadeAlpha * 1.0}) 72%,
    rgba(${fr},${fg},${fb},${Math.min(1, fadeAlpha * 1.22)}) 100%)`;

  const lines = (bannerLines || '').split('\n').filter(l => l.trim().length);

  // Rendered once, reused across all four layouts, bottom-right corner.
  const logoBadge = showLogo && brandLogo ? (
    <img src={brandLogo} alt="" style={{
      position: 'absolute', bottom: 12, right: 12, width: Math.max(24, dispW * 0.09), height: Math.max(24, dispW * 0.09),
      borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.85)', boxShadow: '0 2px 8px rgba(0,0,0,.4)', zIndex: 5
    }} />
  ) : null;

  // Freeform layers — text AND image — additive on top of whichever base
  // layout is selected. Positions/sizes stored as % of card width/height so
  // they hold up across every platform aspect ratio, not just the one they
  // were placed on. `type` defaults to 'text' so every layer saved before
  // image layers existed still renders exactly as before.
  const shapeRadius = (shape, w, h) => {
    if (shape === 'circle') return '50%';
    if (shape === 'rounded') return `${Math.min(w, h) * 0.15}px`;
    return '0px';
  };

  const resizeHandle = (id) => onLayerResizeMouseDown ? (
    <div
      onMouseDown={(e) => onLayerResizeMouseDown(e, id)}
      style={{
        position: 'absolute', right: -7, bottom: -7, width: 14, height: 14,
        borderRadius: '50%', background: 'var(--brass)', border: '2px solid var(--ink)',
        cursor: 'nwse-resize', zIndex: 7
      }}
    />
  ) : null;

  // ---- Chart layers: bar/pie/line, hand-rolled SVG (no chart library —
  // keeps the app dependency-light and every chart is just plain markup
  // that html2canvas can capture like anything else). ----
  function parseChartData(dataText) {
    return (dataText || '').split('\n')
      .map(line => {
        const [label, value] = line.split(',').map(s => (s || '').trim());
        const num = parseFloat(value);
        return label && !isNaN(num) ? { label, value: num } : null;
      })
      .filter(Boolean);
  }

  const CHART_PALETTE = ['#b98b3e', '#3e6259', '#9c3b3b', '#8a6fb0', '#4a7fa8', '#c99c4c'];

  function renderNepalMap(l, wPx, hPx) {
    const highlighted = new Set(l.highlightedProvinces || []);
    const highlightColor = l.color || '#b98b3e';
    return (
      <svg viewBox={NEPAL_MAP_VIEWBOX} width={wPx} height={hPx}>
        {Object.entries(NEPAL_PROVINCES).map(([name, d]) => (
          <path
            key={name}
            d={d}
            fill={highlighted.has(name) ? highlightColor : '#3a4453'}
            stroke="#0b0c0e"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    );
  }

  function renderChartSVG(l, wPx, hPx) {
    const rows = parseChartData(l.dataText);
    const vbW = 200, vbH = 130;
    if (rows.length === 0) {
      return <svg viewBox={`0 0 ${vbW} ${vbH}`} width={wPx} height={hPx}><text x={vbW / 2} y={vbH / 2} fill="#888" fontSize="10" textAnchor="middle">Add data →</text></svg>;
    }
    const color = l.color || '#b98b3e';

    if (l.chartType === 'pie') {
      const total = rows.reduce((s, r) => s + Math.max(0, r.value), 0) || 1;
      let angle = -90;
      const cx = vbW / 2, cy = vbH / 2, r = Math.min(vbW, vbH) / 2 - 8;
      const slices = rows.map((row, i) => {
        const frac = Math.max(0, row.value) / total;
        const sweep = frac * 360;
        const x1 = cx + r * Math.cos((angle * Math.PI) / 180);
        const y1 = cy + r * Math.sin((angle * Math.PI) / 180);
        angle += sweep;
        const x2 = cx + r * Math.cos((angle * Math.PI) / 180);
        const y2 = cy + r * Math.sin((angle * Math.PI) / 180);
        const large = sweep > 180 ? 1 : 0;
        const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
        return <path key={i} d={path} fill={CHART_PALETTE[i % CHART_PALETTE.length]} stroke="#0b0c0e" strokeWidth="1" />;
      });
      return <svg viewBox={`0 0 ${vbW} ${vbH}`} width={wPx} height={hPx}>{slices}</svg>;
    }

    if (l.chartType === 'line') {
      const max = Math.max(...rows.map(r => r.value), 1);
      const padX = 12, padY = 12;
      const stepX = (vbW - padX * 2) / Math.max(1, rows.length - 1);
      const points = rows.map((row, i) => {
        const x = padX + i * stepX;
        const y = vbH - padY - (row.value / max) * (vbH - padY * 2);
        return `${x},${y}`;
      }).join(' ');
      return (
        <svg viewBox={`0 0 ${vbW} ${vbH}`} width={wPx} height={hPx}>
          <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {rows.map((row, i) => {
            const x = padX + i * stepX;
            const y = vbH - padY - (row.value / max) * (vbH - padY * 2);
            return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
          })}
        </svg>
      );
    }

    // bar (default)
    const max = Math.max(...rows.map(r => r.value), 1);
    const padX = 8, padY = 14, gap = 6;
    const barW = (vbW - padX * 2 - gap * (rows.length - 1)) / rows.length;
    return (
      <svg viewBox={`0 0 ${vbW} ${vbH}`} width={wPx} height={hPx}>
        {rows.map((row, i) => {
          const h = (row.value / max) * (vbH - padY * 2);
          const x = padX + i * (barW + gap);
          const y = vbH - padY - h;
          return <rect key={i} x={x} y={y} width={barW} height={h} fill={color} rx="2" />;
        })}
      </svg>
    );
  }

  const layersOverlay = layers.filter(l => l.visible !== false).map(l => {
    const isImage = l.type === 'image';
    const isChart = l.type === 'chart';
    const isMap = l.type === 'map';
    const isSelected = selectedLayerId === l.id;
    const commonProps = {
      key: l.id,
      onMouseDown: onLayerMouseDown ? (e) => onLayerMouseDown(e, l.id) : undefined,
      style: {
        position: 'absolute',
        left: `${l.x}%`, top: `${l.y}%`,
        transform: `translate(-50%, -50%) rotate(${l.rotation || 0}deg)`,
        opacity: l.opacity != null ? l.opacity : 1,
        cursor: onLayerMouseDown ? (l.locked ? 'not-allowed' : 'grab') : 'default',
        outline: isSelected ? '1.5px dashed var(--brass)' : 'none',
        outlineOffset: 4,
        userSelect: 'none', zIndex: 6
      }
    };

    if (isMap) {
      const wPx = ((l.width || 45) / 100) * dispW;
      const hPx = ((l.height || 25) / 100) * dispW;
      return (
        <div {...commonProps} style={{ ...commonProps.style, width: wPx, height: hPx, background: 'rgba(255,255,255,.92)', borderRadius: 6, padding: 4, boxShadow: '0 2px 10px rgba(0,0,0,.3)' }}>
          {renderNepalMap(l, wPx - 8, hPx - 8)}
          {isSelected && resizeHandle(l.id)}
        </div>
      );
    }

    if (isChart) {
      const wPx = ((l.width || 40) / 100) * dispW;
      const hPx = ((l.height || 28) / 100) * dispW;
      return (
        <div {...commonProps} style={{ ...commonProps.style, width: wPx, height: hPx, background: 'rgba(255,255,255,.92)', borderRadius: 6, padding: 4, boxShadow: '0 2px 10px rgba(0,0,0,.3)' }}>
          {renderChartSVG(l, wPx - 8, hPx - 8)}
          {isSelected && resizeHandle(l.id)}
        </div>
      );
    }

    if (isImage) {
      const wPx = ((l.width || 25) / 100) * dispW;
      const hPx = ((l.height || 25) / 100) * dispW;
      return (
        <div {...commonProps} style={{ ...commonProps.style, width: wPx, height: hPx }}>
          <img
            src={l.src}
            alt={l.alt || ''}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              borderRadius: shapeRadius(l.shape, wPx, hPx),
              border: l.borderWidth ? `${l.borderWidth}px solid ${l.borderColor || '#ffffff'}` : 'none',
              boxShadow: '0 2px 10px rgba(0,0,0,.35)', pointerEvents: 'none'
            }}
          />
          {isSelected && resizeHandle(l.id)}
        </div>
      );
    }

    return (
      <div {...commonProps} style={{
        ...commonProps.style,
        fontFamily: l.font || font, fontSize: l.fontSize || 24, color: l.color || '#ffffff',
        fontWeight: l.bold ? 700 : 400,
        textAlign: 'center', whiteSpace: 'pre-wrap', width: `${l.width || 85}%`,
        letterSpacing: `${l.letterSpacing || 0}px`,
        lineHeight: l.lineHeight || 1.2,
        WebkitTextStroke: l.strokeWidth ? `${l.strokeWidth}px ${l.strokeColor || '#000000'}` : undefined,
        textShadow: l.shadowStrength === 0 ? 'none' : `0 1px 4px rgba(0,0,0,${(l.shadowStrength ?? 50) / 100})`
      }}>
        {l.text}
        {isSelected && resizeHandle(l.id)}
      </div>
    );
  });

  if (layout === 'dark') {
    return (
      <div ref={ref} style={wrapStyle}>
        <div style={{ position: 'absolute', inset: 0, ...bgStyle }} />
        <div style={{ position: 'absolute', inset: 0, background: fadeGradient }} />
        <div style={{ position: 'absolute', top: 13, right: 15, fontSize: 10.5, fontStyle: 'italic', color: 'rgba(255,255,255,.85)', textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{watermark}</div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 20px 18px 20px', textAlign: align === 'center' ? 'center' : 'left' }}>
          <span style={{ display: 'inline-block', background: color, color: '#fff', fontFamily: font, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', padding: '5px 10px', marginBottom: 7, transform: 'skew(-6deg)' }}>
            <span style={{ display: 'inline-block', transform: 'skew(6deg)' }}>{kicker}</span>
          </span>
          <h1 style={{ fontFamily: font, fontSize: headSize, lineHeight: 1.03, textTransform: 'uppercase', margin: '0 0 9px 0', textShadow: '0 2px 10px rgba(0,0,0,.5)' }}>{headline}</h1>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'inline-block', background: color, color: '#fff', fontFamily: font, fontSize: 14, lineHeight: 1.35, textTransform: 'uppercase', padding: '3px 8px', marginBottom: 3 }}>{l}</div>
          ))}
          <div style={{ fontSize: bodySize, fontStyle: 'italic', lineHeight: 1.5, color: 'rgba(255,255,255,.88)', maxWidth: '96%', marginTop: 7, textShadow: '0 1px 4px rgba(0,0,0,.6)', marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0 }}>{caption}</div>
          {cornerTag && <div style={{ marginTop: 10, fontFamily: font, fontSize: 10.5, letterSpacing: '.1em', color: 'var(--brass)', textTransform: 'uppercase' }}>{cornerTag}</div>}
        </div>
        {logoBadge}
        {layersOverlay}
      </div>
    );
  }

  if (layout === 'light') {
    const topVisualStyle = bg
      ? { ...bgStyle }
      : { background: `linear-gradient(135deg, ${color}, var(--ink))` };
    const lightFade = `linear-gradient(180deg, rgba(${fr},${fg},${fb},0) 55%, rgba(${fr},${fg},${fb},${fadeAlpha * 0.5}) 100%)`;
    return (
      <div ref={ref} style={{ ...wrapStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 26px 18px 26px' }}>
        <div style={{ width: '100%', height: 160, borderRadius: 10, overflow: 'hidden', position: 'relative', ...topVisualStyle, marginBottom: 20 }}>
          {bg && <div style={{ position: 'absolute', inset: 0, background: lightFade }} />}
        </div>
        <div style={{ width: '100%', alignSelf: 'flex-end', fontSize: 10.5, color: 'rgba(0,0,0,.5)', marginBottom: 4, textAlign: 'right' }}>{watermark}</div>
        <div style={{ width: '100%', textAlign: align === 'center' ? 'center' : 'left' }}>
          <span style={{ display: 'inline-block', background: 'var(--ink)', color: '#fff', fontFamily: font, fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', padding: '5px 11px', marginBottom: 12 }}>{kicker}</span>
          <div style={{ fontFamily: font, textTransform: 'uppercase', fontSize: headSize * 0.55, color: 'var(--ink)', lineHeight: 1.25, margin: '0 0 11px 0' }}>{headline}</div>
          {lines.map((l, i) => (
            <div key={i} style={{ background: color, color: '#fff', fontFamily: font, textTransform: 'uppercase', fontSize: 18, lineHeight: 1.28, padding: '9px 14px', marginBottom: 12 }}>{l}</div>
          ))}
          <div style={{ width: 44, height: 4, background: color, margin: '12px auto', borderRadius: 2 }} />
          <div style={{ fontSize: bodySize, lineHeight: 1.6, color: '#3a3b3e', maxWidth: '92%', margin: '0 auto' }}>{caption}</div>
        </div>
        {cornerTag && <div style={{ marginTop: 14, fontFamily: font, fontSize: 10.5, letterSpacing: '.1em', color: color, textTransform: 'uppercase' }}>{cornerTag}</div>}
        {logoBadge}
        {layersOverlay}
      </div>
    );
  }

  if (layout === 'quote') {
    return (
      <div ref={ref} style={{ ...wrapStyle, background: 'linear-gradient(160deg, var(--ink) 0%, #1b1c1f 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 34px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 13, right: 15, fontSize: 10.5, fontStyle: 'italic', color: 'rgba(255,255,255,.6)' }}>{watermark}</div>
        <div style={{ fontFamily: font, fontSize: 90, lineHeight: 0.5, color, marginBottom: 6, opacity: 0.9 }}>&ldquo;</div>
        <div style={{ fontFamily: font, fontSize: headSize * 0.7, lineHeight: 1.3, margin: '0 0 18px 0' }}>{quoteText}</div>
        <div style={{ width: 44, height: 3, background: color, margin: '0 auto 16px' }} />
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--brass)' }}>&mdash; {quoteAuthor}</div>
        {cornerTag && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 16, fontFamily: font, fontSize: 10.5, letterSpacing: '.1em', color: 'var(--brass)', textTransform: 'uppercase' }}>{cornerTag}</div>}
        {logoBadge}
        {layersOverlay}
      </div>
    );
  }

  // stat layout
  return (
    <div ref={ref} style={{ ...wrapStyle, background: 'radial-gradient(circle at 30% 20%, #202124 0%, var(--ink) 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 30px', textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 13, right: 15, fontSize: 10.5, fontStyle: 'italic', color: 'rgba(255,255,255,.6)' }}>{watermark}</div>
      <div style={{ fontFamily: font, fontSize: 96, lineHeight: 1, color, textShadow: '0 4px 20px rgba(0,0,0,.4)' }}>{statNumber}</div>
      <div style={{ fontFamily: font, fontSize: 18, letterSpacing: '.06em', textTransform: 'uppercase', margin: '8px 0 16px 0' }}>{statLabel}</div>
      <div style={{ fontSize: bodySize, lineHeight: 1.6, color: 'rgba(255,255,255,.75)', maxWidth: '90%' }}>{statDesc}</div>
      {cornerTag && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 16, fontFamily: font, fontSize: 10.5, letterSpacing: '.1em', color: 'var(--brass)', textTransform: 'uppercase' }}>{cornerTag}</div>}
      {logoBadge}
        {layersOverlay}
    </div>
  );
});

export default CardCanvas;
