import { forwardRef } from 'react';
import { getDisplayDims } from '../lib/dims';

const CardCanvas = forwardRef(function CardCanvas({ data, selectedLayerId, onLayerMouseDown }, ref) {
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

  const bgStyle = {
    backgroundImage: `url('${bg}')`,
    backgroundSize: `${zoom}%`,
    backgroundPosition: `${panX}% ${panY}%`,
    backgroundRepeat: 'no-repeat'
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

  const layersOverlay = layers.filter(l => l.visible !== false).map(l => {
    const isImage = l.type === 'image';
    const commonProps = {
      key: l.id,
      onMouseDown: onLayerMouseDown ? (e) => onLayerMouseDown(e, l.id) : undefined,
      style: {
        position: 'absolute',
        left: `${l.x}%`, top: `${l.y}%`,
        transform: `translate(-50%, -50%) rotate(${l.rotation || 0}deg)`,
        opacity: l.opacity != null ? l.opacity : 1,
        cursor: onLayerMouseDown ? (l.locked ? 'not-allowed' : 'grab') : 'default',
        outline: selectedLayerId === l.id ? '1.5px dashed var(--brass)' : 'none',
        outlineOffset: 4,
        userSelect: 'none', zIndex: 6
      }
    };

    if (isImage) {
      const wPx = ((l.width || 25) / 100) * dispW;
      const hPx = ((l.height || 25) / 100) * dispW;
      return (
        <img
          {...commonProps}
          src={l.src}
          alt=""
          style={{
            ...commonProps.style,
            width: wPx, height: hPx, objectFit: 'cover',
            borderRadius: shapeRadius(l.shape, wPx, hPx),
            border: l.borderWidth ? `${l.borderWidth}px solid ${l.borderColor || '#ffffff'}` : 'none',
            boxShadow: '0 2px 10px rgba(0,0,0,.35)'
          }}
        />
      );
    }

    return (
      <div {...commonProps} style={{
        ...commonProps.style,
        fontFamily: l.font || font, fontSize: l.fontSize || 24, color: l.color || '#ffffff',
        fontWeight: l.bold ? 700 : 400,
        textAlign: 'center', whiteSpace: 'pre-wrap', width: `${l.width || 85}%`,
        textShadow: '0 1px 4px rgba(0,0,0,.5)'
      }}>
        {l.text}
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
