import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import CardCanvas from '../components/CardCanvas';

const PRESETS = [
  {
    name: 'Breaking News',
    data: { layout: 'dark', align: 'left', color: '#cf1b2b', font: "'Anton',sans-serif", headSize: 34, bodySize: 12,
      bg: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=60',
      watermark: 'yoursource', kicker: 'BREAKING', headline: 'HEADLINE GOES HERE',
      bannerLines: 'Short supporting line one\nShort supporting line two',
      caption: 'Add a short descriptive caption here explaining the context.', cornerTag: 'IN-DEPTH STORY', sizeId: 'ig-square' }
  },
  {
    name: 'Feature Story',
    data: { layout: 'light', align: 'left', color: '#1a63c9', font: "'Oswald',sans-serif", headSize: 19, bodySize: 12,
      bg: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=60',
      watermark: 'yoursource', kicker: 'FEATURE', headline: 'A LONGER FORM HEADLINE FOR CONTEXT',
      bannerLines: 'Optional highlight line', caption: 'A short body paragraph with more context for the reader.',
      cornerTag: 'READ MORE', sizeId: 'ig-portrait' }
  },
  {
    name: 'Announcement',
    data: { layout: 'dark', align: 'center', color: '#0f8a4b', font: "'Poppins',sans-serif", headSize: 30, bodySize: 12,
      bg: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=60',
      watermark: 'yourbrand', kicker: 'ANNOUNCEMENT', headline: 'WE HAVE NEWS TO SHARE',
      bannerLines: '', caption: 'A short line explaining what changed and why it matters.',
      cornerTag: '', sizeId: 'ig-story' }
  }
];

export default function Templates() {
  const router = useRouter();

  function usePreset(p) {
    sessionStorage.setItem('snapstudio:preset', JSON.stringify(p.data));
    router.push('/editor');
  }

  return (
    <Layout>
      <h1 className="page-title">Templates</h1>
      <p className="page-sub">Click a template to load it straight into the Editor, then customize freely.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {PRESETS.map(p => (
          <div key={p.name} className="card-panel" style={{ cursor: 'pointer' }} onClick={() => usePreset(p)}>
            <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', height: 210, overflow: 'hidden', marginBottom: -100 }}>
              <CardCanvas data={{ ...p.data, ratioW: 1080, ratioH: p.data.sizeId === 'ig-story' ? 1920 : p.data.sizeId === 'ig-portrait' ? 1350 : 1080 }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-head)', margin: '0 0 4px 0' }}>{p.name}</h3>
            <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>Click to use this template</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
