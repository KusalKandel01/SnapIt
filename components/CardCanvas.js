import { forwardRef } from 'react';

const CardCanvas = forwardRef(function CardCanvas({ data }, ref) {
  const {
    layout, align, color, font, headSize, bodySize,
    bg, watermark, kicker, headline, bannerLines, caption, cornerTag,
    ratioW, ratioH
  } = data;

  const dispW = 420;
  const dispH = Math.round(dispW * (ratioH / ratioW));

  const wrapStyle = {
    position: 'relative',
    width: dispW,
    height: dispH,
    overflow: 'hidden',
    fontFamily: 'var(--font-body)',
    color: '#fff',
    background: layout === 'light' ? 'var(--paper)' : '#111'
  };

  const lines = (bannerLines || '').split('\n').filter(l => l.trim().length);

  if (layout === 'dark') {
    return (
      <div ref={ref} style={wrapStyle}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${bg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.05) 38%, rgba(0,0,0,.78) 72%, rgba(0,0,0,.95) 100%)' }} />
        <div style={{ position: 'absolute', top: 13, right: 15, fontSize: 10.5, fontStyle: 'italic', color: 'rgba(255,255,255,.85)', textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{watermark}</div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 20px 20px 20px', textAlign: align === 'center' ? 'center' : 'left' }}>
          <span style={{ display: 'inline-block', background: color, color: '#fff', fontFamily: font, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', padding: '5px 10px', marginBottom: 7, transform: 'skew(-6deg)' }}>
            <span style={{ display: 'inline-block', transform: 'skew(6deg)' }}>{kicker}</span>
          </span>
          <h1 style={{ fontFamily: font, fontSize: headSize, lineHeight: 1.03, textTransform: 'uppercase', margin: '0 0 9px 0', textShadow: '0 2px 10px rgba(0,0,0,.5)' }}>{headline}</h1>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'inline-block', background: color, color: '#fff', fontFamily: font, fontSize: 14, lineHeight: 1.35, textTransform: 'uppercase', padding: '3px 8px', marginBottom: 3 }}>{l}</div>
          ))}
          <div style={{ fontSize: bodySize, fontStyle: 'italic', lineHeight: 1.5, color: 'rgba(255,255,255,.88)', maxWidth: '96%', marginTop: 7, textShadow: '0 1px 4px rgba(0,0,0,.6)', marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0 }}>{caption}</div>
        </div>
        {cornerTag && <div style={{ position: 'absolute', left: 20, bottom: 20, fontFamily: font, fontSize: 10.5, letterSpacing: '.1em', color: 'var(--gold)', textTransform: 'uppercase' }}>{cornerTag}</div>}
      </div>
    );
  }

  // light layout
  return (
    <div ref={ref} style={{ ...wrapStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 26px 18px 26px' }}>
      <div style={{ width: '100%', height: 160, borderRadius: 10, overflow: 'hidden', backgroundImage: `url('${bg}')`, backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: 20 }} />
      <div style={{ width: '100%', alignSelf: 'flex-end', fontSize: 10.5, color: 'rgba(0,0,0,.5)', marginBottom: 4, textAlign: 'right' }}>{watermark}</div>
      <div style={{ width: '100%', textAlign: align === 'center' ? 'center' : 'left' }}>
        <span style={{ display: 'inline-block', background: 'var(--ink)', color: '#fff', fontFamily: font, fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', padding: '5px 11px', marginBottom: 12 }}>{kicker}</span>
        <div style={{ fontFamily: font, textTransform: 'uppercase', fontSize: 19, color: 'var(--ink)', lineHeight: 1.25, margin: '0 0 11px 0' }}>{headline}</div>
        {lines.map((l, i) => (
          <div key={i} style={{ background: color, color: '#fff', fontFamily: font, textTransform: 'uppercase', fontSize: 18, lineHeight: 1.28, padding: '9px 14px', marginBottom: 12 }}>{l}</div>
        ))}
        <div style={{ width: 44, height: 4, background: color, margin: '12px auto', borderRadius: 2 }} />
        <div style={{ fontSize: bodySize, lineHeight: 1.6, color: '#3a3b3e', maxWidth: '92%', margin: '0 auto' }}>{caption}</div>
      </div>
      {cornerTag && <div style={{ marginTop: 14, fontFamily: font, fontSize: 10.5, letterSpacing: '.1em', color: color, textTransform: 'uppercase' }}>{cornerTag}</div>}
    </div>
  );
});

export default CardCanvas;
