import { forwardRef } from 'react';
import { getDisplayDims } from '../lib/dims';

const CardCanvas = forwardRef(function CardCanvas({ data }, ref) {
  const {
    layout, align, color, font, headSize, bodySize,
    bg, panX = 50, panY = 50, zoom = 100,
    watermark, kicker, headline, bannerLines, caption, cornerTag,
    quoteText, quoteAuthor, statNumber, statLabel, statDesc,
    ratioW, ratioH
  } = data;

  const { w: dispW, h: dispH } = getDisplayDims(ratioW, ratioH);

  const wrapStyle = {
    position: 'relative',
    width: dispW,
    height: dispH,
    overflow: 'hidden',
    fontFamily: 'var(--font-body)',
    color: '#fff',
    background: layout === 'light' ? 'var(--paper)' : '#111'
  };

  const bgStyle = {
    backgroundImage: `url('${bg}')`,
    backgroundSize: `${zoom}%`,
    backgroundPosition: `${panX}% ${panY}%`,
    backgroundRepeat: 'no-repeat'
  };

  const lines = (bannerLines || '').split('\n').filter(l => l.trim().length);

  if (layout === 'dark') {
    return (
      <div ref={ref} style={wrapStyle}>
        <div style={{ position: 'absolute', inset: 0, ...bgStyle }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.05) 38%, rgba(0,0,0,.78) 72%, rgba(0,0,0,.95) 100%)' }} />
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
      </div>
    );
  }

  if (layout === 'light') {
    const topVisualStyle = bg
      ? { ...bgStyle }
      : { background: `linear-gradient(135deg, ${color}, var(--ink))` };
    return (
      <div ref={ref} style={{ ...wrapStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 26px 18px 26px' }}>
        <div style={{ width: '100%', height: 160, borderRadius: 10, overflow: 'hidden', ...topVisualStyle, marginBottom: 20 }} />
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
    </div>
  );
});

export default CardCanvas;
